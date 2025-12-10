import Shape from "./Shape.js";
import Bresenham from "../algorithms/Bresenham.js";

class Rectangle extends Shape {
  constructor(x, y, width, height) {
    super(x, y);
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.type = "rectangle";
  }

  draw(pixelBuffer) {
    const {r, g, b, a} = this.getRGBA();
    // compute rectangle corners
    const x1 = this.x;
    const y1 = this.y;
    const x2 = this.x + this.width;
    const y2 = this.y + this.height;
    const corners = [
      {x: x1, y: y1},
      {x: x2, y: y1},
      {x: x2, y: y2},
      {x: x1, y: y2},
    ];
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;
    const t = corners.map((p) => this.transformPoint(p.x, p.y, cx, cy));
    for (let i = 0; i < 4; i++) {
      const aP = t[i];
      const bP = t[(i + 1) % 4];
      Bresenham.drawLine(
        pixelBuffer,
        Math.round(aP.x),
        Math.round(aP.y),
        Math.round(bP.x),
        Math.round(bP.y),
        r,
        g,
        b,
        a,
        this.lineWidth
      );
    }
  }

  modify(newX, newY, newWidth, newHeight) {
    this.x = newX;
    this.y = newY;
    this.width = newWidth;
    this.height = newHeight;
  }

  getShapeData() {
    return {
      type: this.type,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      color: this.color,
      lineWidth: this.lineWidth,
      rotation: this.rotation,
      scale: this.scale,
      offsetX: this.offsetX,
      offsetY: this.offsetY,
    };
  }

  containsPoint(x, y, tolerance = 3) {
    const left = this.x;
    const right = this.x + this.width;
    const top = this.y;
    const bottom = this.y + this.height;

    const nearLeft = Math.abs(x - left) <= tolerance && y >= top - tolerance && y <= bottom + tolerance;
    const nearRight = Math.abs(x - right) <= tolerance && y >= top - tolerance && y <= bottom + tolerance;
    const nearTop = Math.abs(y - top) <= tolerance && x >= left - tolerance && x <= right + tolerance;
    const nearBottom = Math.abs(y - bottom) <= tolerance && x >= left - tolerance && x <= right + tolerance;

    return nearLeft || nearRight || nearTop || nearBottom;
  }

  getBoundingBox() {
    // Compute transformed corners and axis-aligned bounding box
    const x1 = this.x;
    const y1 = this.y;
    const x2 = this.x + this.width;
    const y2 = this.y + this.height;
    const corners = [
      {x: x1, y: y1},
      {x: x2, y: y1},
      {x: x2, y: y2},
      {x: x1, y: y2},
    ];
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;
    const t = corners.map((p) => this.transformPoint(p.x, p.y, cx, cy));

    let minX = t[0].x;
    let minY = t[0].y;
    let maxX = t[0].x;
    let maxY = t[0].y;
    t.forEach((p) => {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    });

    return {
      left: minX,
      top: minY,
      right: maxX,
      bottom: maxY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  resize(handle, newX, newY) {
    switch (handle) {
      case "top-left":
        this.width += this.x - newX;
        this.height += this.y - newY;
        this.x = newX;
        this.y = newY;
        break;
      case "top-right":
        this.width = newX - this.x;
        this.height += this.y - newY;
        this.y = newY;
        break;
      case "bottom-left":
        this.width += this.x - newX;
        this.height = newY - this.y;
        this.x = newX;
        break;
      case "bottom-right":
        this.width = newX - this.x;
        this.height = newY - this.y;
        break;
      case "top":
        this.height += this.y - newY;
        this.y = newY;
        break;
      case "bottom":
        this.height = newY - this.y;
        break;
      case "left":
        this.width += this.x - newX;
        this.x = newX;
        break;
      case "right":
        this.width = newX - this.x;
        break;
      default:
        break;
    }

    if (Math.abs(this.width) < 1) {
      this.width = this.width < 0 ? -1 : 1;
    }
    if (Math.abs(this.height) < 1) {
      this.height = this.height < 0 ? -1 : 1;
    }
  }

  applyTransformations() {
    if (this.rotation !== 0 || this.scale !== 1 || this.offsetX !== 0 || this.offsetY !== 0) {
      // Calculate the center BEFORE applying transformations
      const oldWidth = this.width;
      const oldHeight = this.height;
      const cx = this.x + oldWidth / 2;
      const cy = this.y + oldHeight / 2;

      // Apply scale to dimensions only (not to position)
      if (this.scale !== 1) {
        this.width *= this.scale;
        this.height *= this.scale;
      }

      // Apply offset to the center position (rotation does nothing for rectangles)
      // Scale doesn't affect a point that's at the scale origin
      const newCx = cx + (this.offsetX || 0);
      const newCy = cy + (this.offsetY || 0);

      // Position the rectangle so its center is at the new center
      this.x = newCx - this.width / 2;
      this.y = newCy - this.height / 2;
    }
    super.applyTransformations();
  }
}

export default Rectangle;
