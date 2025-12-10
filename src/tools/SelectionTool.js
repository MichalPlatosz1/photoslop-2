class SelectionTool {
  constructor(shapes, viewport, onShapeUpdate) {
    this.shapes = shapes;
    this.viewport = viewport;
    this.onShapeUpdate = onShapeUpdate;
    this.selectedShape = null;
    this.isDragging = false;
    this.isResizing = false;
    this.currentHandle = null;
    this.startPoint = {x: 0, y: 0};
    this.dragOffset = {x: 0, y: 0};
  }

  selectShape(worldX, worldY) {
    this.clearSelection();

    for (let i = this.shapes.length - 1; i >= 0; i--) {
      const shape = this.shapes[i];
      if (shape.containsPoint(worldX, worldY)) {
        this.selectedShape = shape;
        shape.setSelected(true);
        return shape;
      }
    }

    return null;
  }

  clearSelection() {
    if (this.selectedShape) {
      this.selectedShape.setSelected(false);
      this.selectedShape = null;
    }
    this.shapes.forEach((shape) => shape.setSelected(false));
  }

  onMouseDown(worldX, worldY) {
    if (this.selectedShape) {
      this.currentHandle = this.selectedShape.getResizeHandle(worldX, worldY);

      if (this.currentHandle) {
        this.isResizing = true;
        this.startPoint = {x: worldX, y: worldY};
        // store initial bbox and transform state for resize/rotate/scale
        this.resizeState = {
          bbox: this.selectedShape.getBoundingBox(),
          origRotation: this.selectedShape.rotation || 0,
          origScale: this.selectedShape.scale || 1,
          origPoints: this.selectedShape.points ? JSON.parse(JSON.stringify(this.selectedShape.points)) : null,
        };
        return true;
      }

      if (this.selectedShape.containsPoint(worldX, worldY)) {
        this.isDragging = true;
        this.startPoint = {x: worldX, y: worldY};

        this.dragOffset = {
          x: worldX - this.selectedShape.x,
          y: worldY - this.selectedShape.y,
        };
        return true;
      }
    }

    const selectedShape = this.selectShape(worldX, worldY);
    return !!selectedShape;
  }

  onMouseMove(worldX, worldY) {
    if (this.isResizing && this.selectedShape && this.currentHandle) {
      // Handle rotation and scaling interactions directly here
      if (this.currentHandle === "rotate") {
        const bbox = this.resizeState.bbox;
        const cx = bbox.left + bbox.width / 2;
        const cy = bbox.top + bbox.height / 2;
        const angle = (Math.atan2(worldY - cy, worldX - cx) * 180) / Math.PI;
        this.selectedShape.setRotation(angle);
        this.onShapeUpdate();
        return true;
      }

      if (this.currentHandle === "scale") {
        const bbox = this.resizeState.bbox;
        const cx = bbox.left + bbox.width / 2;
        const cy = bbox.top + bbox.height / 2;
        const start = this.startPoint;
        const origDist = Math.hypot(start.x - cx, start.y - cy) || 1;
        const newDist = Math.hypot(worldX - cx, worldY - cy);
        const factor = (newDist / origDist) * (this.resizeState.origScale || 1);
        this.selectedShape.setScale(factor);
        this.onShapeUpdate();
        return true;
      }

      if (this.selectedShape.resize) {
        this.selectedShape.resize(this.currentHandle, worldX, worldY);
        this.onShapeUpdate();
      }
      return true;
    }

    if (this.isDragging && this.selectedShape) {
      const newX = worldX - this.dragOffset.x;
      const newY = worldY - this.dragOffset.y;

      this.moveShape(this.selectedShape, newX, newY);
      this.onShapeUpdate();
      return true;
    }

    return false;
  }

  onMouseUp() {
    this.isDragging = false;
    this.isResizing = false;
    this.currentHandle = null;
  }

  moveShape(shape, newX, newY) {
    const deltaX = newX - shape.x;
    const deltaY = newY - shape.y;

    if (shape.type === "line") {
      shape.startX += deltaX;
      shape.startY += deltaY;
      shape.endX += deltaX;
      shape.endY += deltaY;
      shape.x = newX;
      shape.y = newY;
    } else if (shape.type === "bezierCurve") {
      // Use the built-in move method for BezierCurve
      shape.move(deltaX, deltaY);
    } else if (shape.type === "rectangle") {
      shape.x = newX;
      shape.y = newY;
    } else if (shape.type === "circle") {
      shape.centerX += deltaX;
      shape.centerY += deltaY;
      shape.x = newX;
      shape.y = newY;
    } else if (shape.type === "polygon") {
      // Translate all polygon points
      if (shape.points && Array.isArray(shape.points)) {
        for (let i = 0; i < shape.points.length; i++) {
          shape.points[i].x += deltaX;
          shape.points[i].y += deltaY;
        }
      }
      shape.x = newX;
      shape.y = newY;
    }
  }

  getCursor(worldX, worldY) {
    if (this.selectedShape) {
      const handle = this.selectedShape.getResizeHandle(worldX, worldY);
      if (handle) {
        // Vertex handles (e.g., "vertex-0") and line end/start should use grab
        if (typeof handle === "string" && handle.startsWith("vertex-")) return "grab";
        if (handle === "start-point" || handle === "end-point") return "grab";
        if (handle === "rotate") return "crosshair";
        if (handle === "scale") return "nw-resize";

        switch (handle) {
          case "top-left":
          case "bottom-right":
            return "nw-resize";
          case "top-right":
          case "bottom-left":
            return "ne-resize";
          case "top":
          case "bottom":
            return "n-resize";
          case "left":
          case "right":
            return "w-resize";
          default:
            return "pointer";
        }
      }

      if (this.selectedShape.containsPoint(worldX, worldY)) {
        return "move";
      }
    }

    for (let i = this.shapes.length - 1; i >= 0; i--) {
      if (this.shapes[i].containsPoint(worldX, worldY)) {
        return "pointer";
      }
    }

    return "default";
  }

  drawSelectionHandles(ctx, viewport) {
    if (!this.selectedShape) return;

    ctx.save();

    if (this.selectedShape.type === "bezierCurve") {
      // Draw control points for Bezier curves
      const controlPoints = this.selectedShape.getControlPoints();

      // Draw connecting lines between control points
      if (controlPoints.length > 1) {
        ctx.strokeStyle = "#0066CC";
        ctx.lineWidth = 1 / viewport.zoom;
        ctx.setLineDash([3 / viewport.zoom, 3 / viewport.zoom]);
        ctx.beginPath();
        ctx.moveTo(controlPoints[0].x, controlPoints[0].y);
        for (let i = 1; i < controlPoints.length; i++) {
          ctx.lineTo(controlPoints[i].x, controlPoints[i].y);
        }
        ctx.stroke();
      }

      // Draw control point handles
      ctx.setLineDash([]);
      ctx.fillStyle = "#FF6B35";
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 2 / viewport.zoom;

      const handleSize = 8 / viewport.zoom;
      controlPoints.forEach((point, index) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, handleSize / 2, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        // Label the control point
        ctx.fillStyle = "#000000";
        ctx.font = `${12 / viewport.zoom}px Arial`;
        ctx.textAlign = "center";
        ctx.fillText(`P${index}`, point.x, point.y - handleSize);
        ctx.fillStyle = "#FF6B35";
      });
    } else if (this.selectedShape.type === "line") {
      const startX = this.selectedShape.startX;
      const startY = this.selectedShape.startY;
      const endX = this.selectedShape.endX;
      const endY = this.selectedShape.endY;

      ctx.strokeStyle = "#0066CC";
      ctx.lineWidth = 2 / viewport.zoom;
      ctx.setLineDash([5 / viewport.zoom, 5 / viewport.zoom]);
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      ctx.fillStyle = "#0066CC";
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 1 / viewport.zoom;
      ctx.setLineDash([]);

      const handleSize = 8 / viewport.zoom;

      ctx.fillRect(startX - handleSize / 2, startY - handleSize / 2, handleSize, handleSize);
      ctx.strokeRect(startX - handleSize / 2, startY - handleSize / 2, handleSize, handleSize);

      ctx.fillRect(endX - handleSize / 2, endY - handleSize / 2, handleSize, handleSize);
      ctx.strokeRect(endX - handleSize / 2, endY - handleSize / 2, handleSize, handleSize);
    } else {
      if (this.selectedShape.type === "polygon") {
        const controlPoints = this.selectedShape.getControlPoints();
        ctx.setLineDash([]);
        ctx.fillStyle = "#FF6B35";
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 2 / viewport.zoom;
        const handleSize = 8 / viewport.zoom;
        controlPoints.forEach((point, index) => {
          ctx.beginPath();
          ctx.arc(point.x, point.y, handleSize / 2, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = "#000000";
          ctx.font = `${12 / viewport.zoom}px Arial`;
          ctx.textAlign = "center";
          ctx.fillText(`${index}`, point.x, point.y - handleSize);
          ctx.fillStyle = "#FF6B35";
        });

        // Draw polygon bounding box dashed
        const bbox = this.selectedShape.getBoundingBox();
        ctx.setLineDash([5 / viewport.zoom, 5 / viewport.zoom]);
        ctx.strokeStyle = "#0066CC";
        ctx.lineWidth = 1 / viewport.zoom;
        ctx.strokeRect(bbox.left, bbox.top, bbox.width, bbox.height);
        ctx.setLineDash([]);
        // Draw rotate and scale handles for polygon too
        const rotatePos = {x: bbox.left + bbox.width / 2, y: bbox.top - 18};
        const scalePos = {x: bbox.left + bbox.width / 2, y: bbox.bottom + 18};
        // Rotate handle (circle)
        ctx.beginPath();
        ctx.fillStyle = "#ffc107";
        ctx.arc(rotatePos.x, rotatePos.y, 8 / viewport.zoom / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1 / viewport.zoom;
        ctx.stroke();
        // Scale handle (square)
        ctx.fillStyle = "#17a2b8";
        const ss = 8 / viewport.zoom;
        ctx.fillRect(scalePos.x - ss / 2, scalePos.y - ss / 2, ss, ss);
        ctx.strokeStyle = "#ffffff";
        ctx.strokeRect(scalePos.x - ss / 2, scalePos.y - ss / 2, ss, ss);
        ctx.restore();
        return;
      }
      const bbox = this.selectedShape.getBoundingBox();
      const handles = [
        {x: bbox.left, y: bbox.top},
        {x: bbox.right, y: bbox.top},
        {x: bbox.left, y: bbox.bottom},
        {x: bbox.right, y: bbox.bottom},
        {x: bbox.left + bbox.width / 2, y: bbox.top},
        {x: bbox.left + bbox.width / 2, y: bbox.bottom},
        {x: bbox.left, y: bbox.top + bbox.height / 2},
        {x: bbox.right, y: bbox.top + bbox.height / 2},
      ];

      ctx.strokeStyle = "#0066CC";
      ctx.lineWidth = 1 / viewport.zoom;
      ctx.setLineDash([5 / viewport.zoom, 5 / viewport.zoom]);
      ctx.strokeRect(bbox.left, bbox.top, bbox.width, bbox.height);

      ctx.fillStyle = "#0066CC";
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 1 / viewport.zoom;
      ctx.setLineDash([]);

      const handleSize = 6 / viewport.zoom;
      handles.forEach((handle) => {
        ctx.fillRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize);
        ctx.strokeRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize);
      });

      // Draw rotate and scale handles
      const rotatePos = {x: bbox.left + bbox.width / 2, y: bbox.top - 18};
      const scalePos = {x: bbox.left + bbox.width / 2, y: bbox.bottom + 18};

      // Rotate handle (circle)
      ctx.beginPath();
      ctx.fillStyle = "#ffc107";
      ctx.arc(rotatePos.x, rotatePos.y, 8 / viewport.zoom / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1 / viewport.zoom;
      ctx.stroke();

      // Scale handle (square)
      ctx.fillStyle = "#17a2b8";
      const ss = 8 / viewport.zoom;
      ctx.fillRect(scalePos.x - ss / 2, scalePos.y - ss / 2, ss, ss);
      ctx.strokeStyle = "#ffffff";
      ctx.strokeRect(scalePos.x - ss / 2, scalePos.y - ss / 2, ss, ss);
    }

    ctx.restore();
  }
}

export default SelectionTool;
