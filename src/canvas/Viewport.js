class Viewport {
  constructor(canvasWidth, canvasHeight, virtualWidth, virtualHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.virtualWidth = virtualWidth;
    this.virtualHeight = virtualHeight;
    this.zoom = 1;
    this.position = {x: 0, y: 0};
  }

  setZoom(zoom) {
    this.zoom = Math.max(0.1, Math.min(20, zoom));
  }

  pan(dx, dy) {
    this.position.x += dx;
    this.position.y += dy;
  }

  screenToWorld(screenX, screenY) {
    return {
      x: Math.floor((screenX - this.position.x) / this.zoom),
      y: Math.floor((screenY - this.position.y) / this.zoom),
    };
  }

  worldToScreen(worldX, worldY) {
    return {
      x: worldX * this.zoom + this.position.x,
      y: worldY * this.zoom + this.position.y,
    };
  }

  getViewportTransform() {
    return {
      scale: this.zoom,
      translateX: this.position.x,
      translateY: this.position.y,
    };
  }

  reset() {
    this.zoom = 1;
    this.position.x = 0;
    this.position.y = 0;
  }

  zoomToPoint(newZoom, screenX, screenY) {
    const worldPos = this.screenToWorld(screenX, screenY);

    this.setZoom(newZoom);

    const newScreenPos = this.worldToScreen(worldPos.x, worldPos.y);

    this.position.x += screenX - newScreenPos.x;
    this.position.y += screenY - newScreenPos.y;

    // Constrain position to keep virtual canvas somewhat visible when zoomed out
    if (this.zoom < 1) {
      const margin = Math.min(this.canvasWidth, this.canvasHeight) * 0.1;
      const virtualScreenWidth = this.virtualWidth * this.zoom;
      const virtualScreenHeight = this.virtualHeight * this.zoom;

      this.position.x = Math.max(this.position.x, -virtualScreenWidth + margin);
      this.position.x = Math.min(this.position.x, this.canvasWidth - margin);

      this.position.y = Math.max(this.position.y, -virtualScreenHeight + margin);
      this.position.y = Math.min(this.position.y, this.canvasHeight - margin);
    }
  }

  isPixelGridVisible() {
    return this.zoom >= 8;
  }
}

export default Viewport;
