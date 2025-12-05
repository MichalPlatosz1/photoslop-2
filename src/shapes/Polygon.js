import Shape from "./Shape.js";
import Bresenham from "../algorithms/Bresenham.js";

class Polygon extends Shape {
  constructor(points = []) {
    // points: [{x,y}, ...]
    const x = points.length ? points[0].x : 0;
    const y = points.length ? points[0].y : 0;
    super(x, y);
    this.points = points.slice();
    this.type = "polygon";
  }

  draw(pixelBuffer) {
    if (!this.points || this.points.length < 2) return;

    const {r, g, b, a} = this.getRGBA();

    for (let i = 0; i < this.points.length; i++) {
      const p1 = this.points[i];
      const p2 = this.points[(i + 1) % this.points.length];
      Bresenham.drawLine(pixelBuffer, p1.x, p1.y, p2.x, p2.y, r, g, b, a, this.lineWidth);
    }
  }

  addPoint(x, y) {
    this.points.push({x, y});
  }

  getShapeData() {
    return {
      type: this.type,
      points: this.points.map((p) => ({x: p.x, y: p.y})),
      color: this.color,
      lineWidth: this.lineWidth,
    };
  }

  containsPoint(x, y) {
    // Ray-casting algorithm for point-in-polygon
    if (!this.points || this.points.length < 3) return false;

    let inside = false;
    for (let i = 0, j = this.points.length - 1; i < this.points.length; j = i++) {
      const xi = this.points[i].x,
        yi = this.points[i].y;
      const xj = this.points[j].x,
        yj = this.points[j].y;

      const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }

    return inside;
  }

  getBoundingBox() {
    if (!this.points || this.points.length === 0) {
      return {left: this.x, top: this.y, right: this.x, bottom: this.y, width: 0, height: 0};
    }

    let minX = this.points[0].x;
    let minY = this.points[0].y;
    let maxX = this.points[0].x;
    let maxY = this.points[0].y;

    this.points.forEach((p) => {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    });

    return {left: minX, top: minY, right: maxX, bottom: maxY, width: maxX - minX, height: maxY - minY};
  }

  getResizeHandle(x, y, tolerance = 10) {
    if (!this.points) return null;
    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i];
      const dist = Math.hypot(x - p.x, y - p.y);
      if (dist <= tolerance) return `vertex-${i}`;
    }
    return null;
  }

  resize(handle, newX, newY) {
    if (!handle) return;
    if (handle.startsWith("vertex-")) {
      const idx = parseInt(handle.split("-")[1], 10);
      if (!isNaN(idx) && idx >= 0 && idx < this.points.length) {
        this.points[idx] = {x: newX, y: newY};
      }
    }

    // Update shape origin
    const bbox = this.getBoundingBox();
    this.x = bbox.left;
    this.y = bbox.top;
  }

  getControlPoints() {
    return this.points.slice();
  }
}

export default Polygon;
