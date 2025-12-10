import Shape from "./Shape.js";
import Bresenham from "../algorithms/Bresenham.js";

class Line extends Shape {
  constructor(startX, startY, endX, endY) {
    super(startX, startY);
    this.startX = startX;
    this.startY = startY;
    this.endX = endX;
    this.endY = endY;
    this.type = "line";
  }

  draw(pixelBuffer) {
    const {r, g, b, a} = this.getRGBA();
    // compute center
    const cx = (this.startX + this.endX) / 2;
    const cy = (this.startY + this.endY) / 2;
    const p1 = this.transformPoint(this.startX, this.startY, cx, cy);
    const p2 = this.transformPoint(this.endX, this.endY, cx, cy);
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

  modify(newStartX, newStartY, newEndX, newEndY) {
    this.startX = newStartX;
    this.startY = newStartY;
    this.endX = newEndX;
    this.endY = newEndY;
  }

  getShapeData() {
    return {
      type: this.type,
      startX: this.startX,
      startY: this.startY,
      endX: this.endX,
      endY: this.endY,
      color: this.color,
      lineWidth: this.lineWidth,
    };
  }

  containsPoint(x, y, tolerance = 8) {
    const dx = this.endX - this.startX;
    const dy = this.endY - this.startY;

    if (dx === 0 && dy === 0) {
      const dist = Math.sqrt((x - this.startX) ** 2 + (y - this.startY) ** 2);
      return dist <= tolerance;
    }

    const length2 = dx * dx + dy * dy;
    const t = Math.max(0, Math.min(1, ((x - this.startX) * dx + (y - this.startY) * dy) / length2));
    const projectionX = this.startX + t * dx;
    const projectionY = this.startY + t * dy;
    const distance = Math.sqrt((x - projectionX) ** 2 + (y - projectionY) ** 2);

    const result = distance <= tolerance;

    return result;
  }

  getBoundingBox() {
    // Transform endpoints around center to account for rotation/scale
    const cx = (this.startX + this.endX) / 2;
    const cy = (this.startY + this.endY) / 2;
    const p1 = this.transformPoint(this.startX, this.startY, cx, cy);
    const p2 = this.transformPoint(this.endX, this.endY, cx, cy);

    const minX = Math.min(p1.x, p2.x);
    const minY = Math.min(p1.y, p2.y);
    const maxX = Math.max(p1.x, p2.x);
    const maxY = Math.max(p1.y, p2.y);

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
      case "start-point":
      case "top-left":
        this.startX = newX;
        this.startY = newY;
        break;
      case "end-point":
      case "bottom-right":
        this.endX = newX;
        this.endY = newY;
        break;
      case "top-right":
        if (
          (this.startX >= this.endX && this.startY <= this.endY) ||
          (this.startX <= this.endX && this.startY >= this.endY)
        ) {
          this.startX = newX;
          this.startY = newY;
        } else {
          this.endX = newX;
          this.endY = newY;
        }
        break;
      case "bottom-left":
        if (
          (this.startX <= this.endX && this.startY >= this.endY) ||
          (this.startX >= this.endX && this.startY <= this.endY)
        ) {
          this.startX = newX;
          this.startY = newY;
        } else {
          this.endX = newX;
          this.endY = newY;
        }
        break;
      default:
        break;
    }

    this.x = Math.min(this.startX, this.endX);
    this.y = Math.min(this.startY, this.endY);
  }

  getResizeHandle(x, y, tolerance = 15) {
    const distToStart = Math.sqrt((x - this.startX) ** 2 + (y - this.startY) ** 2);
    if (distToStart <= tolerance) {
      return "start-point";
    }
    const distToEnd = Math.sqrt((x - this.endX) ** 2 + (y - this.endY) ** 2);
    if (distToEnd <= tolerance) {
      return "end-point";
    }

    // Fallback to default bbox-based handles (including rotate/scale)
    if (super.getResizeHandle) return super.getResizeHandle(x, y, tolerance);
    return null;
  }
}

export default Line;
