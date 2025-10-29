class ZoomTool {
  constructor(viewport, shapes = []) {
    this.viewport = viewport;
    this.shapes = shapes;
  }

  updateShapes(shapes) {
    this.shapes = shapes;
  }

  zoomIn() {
    const newZoom = this.viewport.zoom * 1.2;
    this.viewport.setZoom(newZoom);
  }

  zoomOut() {
    const currentZoom = this.viewport.zoom;
    let newZoom;

    if (currentZoom > 4) {
      newZoom = currentZoom * 0.7;
    } else if (currentZoom > 1) {
      newZoom = currentZoom * 0.8;
    } else {
      newZoom = Math.max(0.1, currentZoom * 0.85);
    }

    if (newZoom < 0.5 && this.shapes.length > 0) {
      const fitZoom = this.calculateFitToContentZoom();
      if (fitZoom > 0.1 && fitZoom < currentZoom) {
        newZoom = fitZoom;
      }
    }

    this.viewport.setZoom(newZoom);
  }

  resetZoom() {
    this.viewport.setZoom(1);
    this.viewport.position.x = 0;
    this.viewport.position.y = 0;
  }

  fitToContent() {
    if (this.shapes.length === 0) {
      this.resetZoom();
      return;
    }

    const zoom = this.calculateFitToContentZoom();
    if (zoom > 0) {
      this.viewport.setZoom(zoom);
      this.centerContent();
    }
  }

  calculateFitToContentZoom() {
    if (this.shapes.length === 0) return 1;

    // Calculate bounding box of all shapes
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    this.shapes.forEach((shape) => {
      const bounds = this.getShapeBounds(shape);
      minX = Math.min(minX, bounds.minX);
      minY = Math.min(minY, bounds.minY);
      maxX = Math.max(maxX, bounds.maxX);
      maxY = Math.max(maxY, bounds.maxY);
    });

    if (minX === Infinity) return 1;

    const padding = 50;
    const contentWidth = maxX - minX + padding * 2;
    const contentHeight = maxY - minY + padding * 2;

    const zoomX = this.viewport.canvasWidth / contentWidth;
    const zoomY = this.viewport.canvasHeight / contentHeight;

    return Math.max(0.1, Math.min(2, Math.min(zoomX, zoomY)));
  }

  centerContent() {
    if (this.shapes.length === 0) return;

    // Calculate content center
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    this.shapes.forEach((shape) => {
      const bounds = this.getShapeBounds(shape);
      minX = Math.min(minX, bounds.minX);
      minY = Math.min(minY, bounds.minY);
      maxX = Math.max(maxX, bounds.maxX);
      maxY = Math.max(maxY, bounds.maxY);
    });

    if (minX === Infinity) return;

    const contentCenterX = (minX + maxX) / 2;
    const contentCenterY = (minY + maxY) / 2;

    // Calculate viewport center
    const viewportCenterX = this.viewport.canvasWidth / 2;
    const viewportCenterY = this.viewport.canvasHeight / 2;

    this.viewport.position.x = viewportCenterX - contentCenterX * this.viewport.zoom;
    this.viewport.position.y = viewportCenterY - contentCenterY * this.viewport.zoom;
  }

  getShapeBounds(shape) {
    // Get bounding box for different shape types
    if (shape.type === "line") {
      return {
        minX: Math.min(shape.startX, shape.endX) - shape.lineWidth,
        minY: Math.min(shape.startY, shape.endY) - shape.lineWidth,
        maxX: Math.max(shape.startX, shape.endX) + shape.lineWidth,
        maxY: Math.max(shape.startY, shape.endY) + shape.lineWidth,
      };
    } else if (shape.type === "rectangle") {
      return {
        minX: shape.x - shape.lineWidth,
        minY: shape.y - shape.lineWidth,
        maxX: shape.x + shape.width + shape.lineWidth,
        maxY: shape.y + shape.height + shape.lineWidth,
      };
    } else if (shape.type === "circle") {
      const radius = shape.radius + shape.lineWidth;
      return {
        minX: shape.centerX - radius,
        minY: shape.centerY - radius,
        maxX: shape.centerX + radius,
        maxY: shape.centerY + radius,
      };
    }

    return {minX: shape.x || 0, minY: shape.y || 0, maxX: (shape.x || 0) + 10, maxY: (shape.y || 0) + 10};
  }

  isZoomedIn() {
    return this.viewport.zoom > 1;
  }
}

export default ZoomTool;
