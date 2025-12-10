import Shape from "./Shape.js";
import Bresenham from "../algorithms/Bresenham.js";

class Circle extends Shape {
  constructor(centerX, centerY, radius) {
    super(centerX, centerY);
    this.centerX = centerX;
    this.centerY = centerY;
    this.radius = radius;
    this.type = "circle";
  }

  draw(pixelBuffer) {
    const {r, g, b, a} = this.getRGBA();
    // Apply scale to radius; rotation has no visible effect on circle
    const s = this.scale || 1;
    const radius = Math.max(0, this.radius * s);
    
    // Use custom pivot if set for offset calculation
    const defaultCx = this.centerX;
    const defaultCy = this.centerY;
    const pivot = this.getEffectivePivot(defaultCx, defaultCy);
    
    // Transform center point (this applies offset)
    const transformedCenter = this.transformPoint(this.centerX, this.centerY, pivot.x, pivot.y);
    
    Bresenham.drawCircleOutline(
      pixelBuffer,
      Math.round(transformedCenter.x),
      Math.round(transformedCenter.y),
      Math.round(radius),
      r,
      g,
      b,
      a,
      this.lineWidth
    );
  }

  modify(newCenterX, newCenterY, newRadius) {
    this.centerX = newCenterX;
    this.centerY = newCenterY;
    this.radius = newRadius;
    this.x = newCenterX;
    this.y = newCenterY;
  }

  getShapeData() {
    return {
      type: this.type,
      centerX: this.centerX,
      centerY: this.centerY,
      radius: this.radius,
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

  // Helper method to check if a point is on the circle boundary (for selection)
  containsPoint(x, y, tolerance = 3) {
    const distance = Math.sqrt((x - this.centerX) ** 2 + (y - this.centerY) ** 2);
    return Math.abs(distance - this.radius) <= tolerance;
  }

  // Get bounding box for resize handles
  getBoundingBox() {
    return {
      left: this.centerX - this.radius,
      top: this.centerY - this.radius,
      right: this.centerX + this.radius,
      bottom: this.centerY + this.radius,
      width: this.radius * 2,
      height: this.radius * 2,
    };
  }

  // Resize the circle based on handle position
  resize(handle, newX, newY) {
    let newRadius;

    switch (handle) {
      case "top-left":
        newRadius = Math.sqrt((this.centerX - newX) ** 2 + (this.centerY - newY) ** 2);
        break;
      case "top-right":
        newRadius = Math.sqrt((newX - this.centerX) ** 2 + (this.centerY - newY) ** 2);
        break;
      case "bottom-left":
        newRadius = Math.sqrt((this.centerX - newX) ** 2 + (newY - this.centerY) ** 2);
        break;
      case "bottom-right":
        newRadius = Math.sqrt((newX - this.centerX) ** 2 + (newY - this.centerY) ** 2);
        break;
      case "top":
        newRadius = Math.abs(this.centerY - newY);
        break;
      case "bottom":
        newRadius = Math.abs(newY - this.centerY);
        break;
      case "left":
        newRadius = Math.abs(this.centerX - newX);
        break;
      case "right":
        newRadius = Math.abs(newX - this.centerX);
        break;
      default:
        newRadius = this.radius;
        break;
    }

    // Ensure minimum radius
    this.radius = Math.max(1, newRadius);
  }

  applyTransformations() {
    if (this.rotation !== 0 || this.scale !== 1 || this.offsetX !== 0 || this.offsetY !== 0) {
      // Use custom pivot if set, otherwise use center
      const pivot = this.getEffectivePivot(this.centerX, this.centerY);
      
      // Apply scale to radius
      if (this.scale !== 1) {
        this.radius *= this.scale;
      }

      // Transform the center point around the pivot
      const transformedCenter = this.transformPoint(this.centerX, this.centerY, pivot.x, pivot.y);
      
      // Update center position
      this.centerX = transformedCenter.x;
      this.centerY = transformedCenter.y;

      // Update base position
      this.x = this.centerX;
      this.y = this.centerY;
    }
    super.applyTransformations();
  }
}

export default Circle;
