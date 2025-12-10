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
    const cx = this.getBoundingBox().left + this.getBoundingBox().width / 2;
    const cy = this.getBoundingBox().top + this.getBoundingBox().height / 2;
    const tpoints = this.points.map((p) => this.transformPoint(p.x, p.y, cx, cy));

    for (let i = 0; i < tpoints.length; i++) {
      const p1 = tpoints[i];
      const p2 = tpoints[(i + 1) % tpoints.length];
      Bresenham.drawLine(
        pixelBuffer,
        Math.round(p1.x),
        Math.round(p1.y),
        Math.round(p2.x),
        Math.round(p2.y),
        r,
        g,
        b,
        a,
        this.lineWidth
      );
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
      rotation: this.rotation,
      scale: this.scale,
      offsetX: this.offsetX,
      offsetY: this.offsetY,
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

    // Compute transformed points around bbox center
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

    const cx = minX + (maxX - minX) / 2;
    const cy = minY + (maxY - minY) / 2;
    const tpoints = this.points.map((p) => this.transformPoint(p.x, p.y, cx, cy));

    let tminX = tpoints[0].x;
    let tminY = tpoints[0].y;
    let tmaxX = tpoints[0].x;
    let tmaxY = tpoints[0].y;
    tpoints.forEach((p) => {
      if (p.x < tminX) tminX = p.x;
      if (p.y < tminY) tminY = p.y;
      if (p.x > tmaxX) tmaxX = p.x;
      if (p.y > tmaxY) tmaxY = p.y;
    });

    return {left: tminX, top: tminY, right: tmaxX, bottom: tmaxY, width: tmaxX - tminX, height: tmaxY - tminY};
  }

  getResizeHandle(x, y, tolerance = 10) {
    if (!this.points) return null;
    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i];
      const dist = Math.hypot(x - p.x, y - p.y);
      if (dist <= tolerance) return `vertex-${i}`;
    }
    // Fallback to bbox handles (rotate/scale) if available
    if (super.getResizeHandle) return super.getResizeHandle(x, y, tolerance);
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

  applyTransformations() {
    if (this.rotation !== 0 || this.scale !== 1 || this.offsetX !== 0 || this.offsetY !== 0) {
      // Get bounding box to find center
      let minX = this.points[0]?.x || 0;
      let maxX = minX;
      let minY = this.points[0]?.y || 0;
      let maxY = minY;
      
      this.points.forEach((p) => {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
      });
      
      const cx = minX + (maxX - minX) / 2;
      const cy = minY + (maxY - minY) / 2;
      
      // Transform all points around their center
      this.points = this.points.map((p) => this.transformPoint(p.x, p.y, cx, cy));
      
      // Update shape origin to match new bounding box
      const bbox = this.getBoundingBox();
      this.x = bbox.left;
      this.y = bbox.top;
    }
    super.applyTransformations();
  }
}

export default Polygon;
