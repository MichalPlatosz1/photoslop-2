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
    Bresenham.drawRectangle(pixelBuffer, this.x, this.y, this.width, this.height, r, g, b, a, this.lineWidth);
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
    return {
      left: this.x,
      top: this.y,
      right: this.x + this.width,
      bottom: this.y + this.height,
      width: Math.abs(this.width),
      height: Math.abs(this.height),
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
}

export default Rectangle;
