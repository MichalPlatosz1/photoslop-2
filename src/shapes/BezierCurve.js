import Shape from "./Shape.js";

class BezierCurve extends Shape {
  constructor(controlPoints = []) {
    // Calculate initial position from control points
    let x = 0,
      y = 0;
    if (controlPoints.length > 0) {
      x = controlPoints[0].x;
      y = controlPoints[0].y;
    }

    super(x, y);
    this.type = "bezierCurve";
    this.controlPoints = [...controlPoints];
    this.degree = this.controlPoints.length - 1;
  }

  // Calculate point on Bezier curve using De Casteljau's algorithm
  calculateBezierPoint(t, points) {
    if (points.length === 1) return points[0];

    const newPoints = [];
    for (let i = 0; i < points.length - 1; i++) {
      const x = (1 - t) * points[i].x + t * points[i + 1].x;
      const y = (1 - t) * points[i].y + t * points[i + 1].y;
      newPoints.push({x, y});
    }

    return this.calculateBezierPoint(t, newPoints);
  }

  // Add control point
  addControlPoint(x, y) {
    this.controlPoints.push({x, y});
    this.degree = this.controlPoints.length - 1;
  }

  // Set all control points at once
  setControlPoints(points) {
    this.controlPoints = [...points];
    this.degree = this.controlPoints.length - 1;
  }

  // Update specific control point
  updateControlPoint(index, x, y) {
    if (index >= 0 && index < this.controlPoints.length) {
      this.controlPoints[index] = {x, y};
      this.updatePosition();
    }
  }

  // Update shape position based on control points
  updatePosition() {
    if (this.controlPoints.length > 0) {
      this.x = this.controlPoints[0].x;
      this.y = this.controlPoints[0].y;
    }
  }

  draw(pixelBuffer) {
    if (this.controlPoints.length < 2) return;
    // Draw the Bezier curve using transformed control points
    const bbox = this.getBoundingBox();
    const defaultCx = bbox.left + bbox.width / 2;
    const defaultCy = bbox.top + bbox.height / 2;
    // use custom pivot if set, otherwise use center
    const pivot = this.getEffectivePivot(defaultCx, defaultCy);
    const tcontrol = this.controlPoints.map((p) => this.transformPoint(p.x, p.y, pivot.x, pivot.y));

    const steps = 200;
    let prevPoint = this.calculateBezierPoint(0, tcontrol);

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const currentPoint = this.calculateBezierPoint(t, tcontrol);

      // Draw line segment from previous point to current point
      this.drawLine(
        pixelBuffer,
        Math.round(prevPoint.x),
        Math.round(prevPoint.y),
        Math.round(currentPoint.x),
        Math.round(currentPoint.y)
      );

      prevPoint = currentPoint;
    }
  }

  // Helper method to draw line between two points
  drawLine(pixelBuffer, x1, y1, x2, y2) {
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const sx = x1 < x2 ? 1 : -1;
    const sy = y1 < y2 ? 1 : -1;
    let err = dx - dy;

    let x = x1;
    let y = y1;

    while (true) {
      if (x >= 0 && x < pixelBuffer.width && y >= 0 && y < pixelBuffer.height) {
        // Draw multiple pixels for line width
        const rgba = this.getRGBA();
        for (let i = -Math.floor(this.lineWidth / 2); i <= Math.floor(this.lineWidth / 2); i++) {
          for (let j = -Math.floor(this.lineWidth / 2); j <= Math.floor(this.lineWidth / 2); j++) {
            const px = x + i;
            const py = y + j;
            if (px >= 0 && px < pixelBuffer.width && py >= 0 && py < pixelBuffer.height) {
              pixelBuffer.setPixel(px, py, rgba.r, rgba.g, rgba.b);
            }
          }
        }
      }
      if (x === x2 && y === y2) break;

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
  }

  // Override isPointInside for selection
  isPointInside(x, y, threshold = 5) {
    if (this.controlPoints.length < 2) return false;

    // Check if point is close to any part of the curve
    const steps = 100;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const point = this.calculateBezierPoint(t, this.controlPoints);
      const distance = Math.sqrt((x - point.x) ** 2 + (y - point.y) ** 2);
      if (distance <= threshold + this.lineWidth / 2) {
        return true;
      }
    }
    return false;
  }

  // Override containsPoint for selection
  containsPoint(x, y, tolerance = 5) {
    return this.isPointInside(x, y, tolerance);
  }

  // Override getBoundingBox
  getBoundingBox() {
    if (this.controlPoints.length === 0) {
      return {left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0};
    }

    // Transform control points around bbox center
    let minX = this.controlPoints[0].x;
    let maxX = this.controlPoints[0].x;
    let minY = this.controlPoints[0].y;
    let maxY = this.controlPoints[0].y;

    this.controlPoints.forEach((point) => {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    });

    const cx = minX + (maxX - minX) / 2;
    const cy = minY + (maxY - minY) / 2;
    const tcontrol = this.controlPoints.map((p) => this.transformPoint(p.x, p.y, cx, cy));

    // Also check some points along the transformed curve for more accurate bounds
    let tminX = tcontrol[0].x;
    let tmaxX = tcontrol[0].x;
    let tminY = tcontrol[0].y;
    let tmaxY = tcontrol[0].y;

    const steps = 50;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const point = this.calculateBezierPoint(t, tcontrol);
      tminX = Math.min(tminX, point.x);
      tmaxX = Math.max(tmaxX, point.x);
      tminY = Math.min(tminY, point.y);
      tmaxY = Math.max(tmaxY, point.y);
    }

    const padding = this.lineWidth / 2;
    return {
      left: tminX - padding,
      top: tminY - padding,
      right: tmaxX + padding,
      bottom: tmaxY + padding,
      width: tmaxX - tminX + 2 * padding,
      height: tmaxY - tminY + 2 * padding,
    };
  }

  // Override getResizeHandle to disable standard resize handles for Bézier curves
  getResizeHandle(x, y, tolerance = 5) {
    // Expose control points as draggable handles: "control-<index>"
    for (let i = 0; i < this.controlPoints.length; i++) {
      const p = this.controlPoints[i];
      if (Math.abs(x - p.x) <= tolerance && Math.abs(y - p.y) <= tolerance) {
        return `control-${i}`;
      }
    }
    if (super.getResizeHandle) return super.getResizeHandle(x, y, tolerance);
    return null;
  }

  // Support moving a specific control point via the generic resize API
  resize(handle, newX, newY) {
    if (typeof handle === "string" && handle.startsWith("control-")) {
      const idx = parseInt(handle.split("-")[1], 10);
      if (!Number.isNaN(idx) && idx >= 0 && idx < this.controlPoints.length) {
        this.controlPoints[idx] = {x: newX, y: newY};
        this.updatePosition();
      }
      return;
    }
    // No-op for non-control handles (Bezier doesn't use bbox handles)
  }

  // Override move method
  move(dx, dy) {
    this.controlPoints.forEach((point) => {
      point.x += dx;
      point.y += dy;
    });
    // Update shape position
    this.x += dx;
    this.y += dy;
  }

  // Get control points for editing
  getControlPoints() {
    return [...this.controlPoints];
  }

  // Get degree of the curve
  getDegree() {
    return this.degree;
  }

  // Get shape data for saving
  getShapeData() {
    return {
      type: this.type,
      controlPoints: this.controlPoints.map((p) => ({x: p.x, y: p.y})),
      color: this.color,
      lineWidth: this.lineWidth,
      rotation: this.rotation,
      scale: this.scale,
      offsetX: this.offsetX,
      offsetY: this.offsetY,
      pivotX: this.pivotX,
      pivotY: this.pivotY,
    };
  }

  // Create a copy of this curve
  copy() {
    const newCurve = new BezierCurve(this.controlPoints);
    newCurve.setColor(this.color);
    newCurve.setLineWidth(this.lineWidth);
    return newCurve;
  }

  // Get curve info for display
  getInfo() {
    return `Krzywa Béziera (stopień ${this.degree}, ${this.controlPoints.length} punktów)`;
  }

  applyTransformations() {
    if (this.rotation !== 0 || this.scale !== 1 || this.offsetX !== 0 || this.offsetY !== 0) {
      // Get bounding box to find center
      let minX = this.controlPoints[0]?.x || 0;
      let maxX = minX;
      let minY = this.controlPoints[0]?.y || 0;
      let maxY = minY;

      this.controlPoints.forEach((p) => {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
      });

      const cx = minX + (maxX - minX) / 2;
      const cy = minY + (maxY - minY) / 2;

      // Use custom pivot if set, otherwise use center
      const pivot = this.getEffectivePivot(cx, cy);

      // Transform all control points around the pivot
      this.controlPoints = this.controlPoints.map((p) => this.transformPoint(p.x, p.y, pivot.x, pivot.y));
      this.updatePosition();
    }
    super.applyTransformations();
  }
}

export default BezierCurve;
