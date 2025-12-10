import Shape from "./Shape.js";
import Bresenham from "../algorithms/Bresenham.js";

class Rectangle extends Shape {
  constructor(x, y, width, height) {
    super(x, y);
    // Store corners as points to support rotation
    this.corners = [
      {x: x, y: y},
      {x: x + width, y: y},
      {x: x + width, y: y + height},
      {x: x, y: y + height},
    ];
    this.type = "rectangle";
  }

  // Get width of the axis-aligned rectangle
  get width() {
    const minX = Math.min(this.corners[0].x, this.corners[1].x, this.corners[2].x, this.corners[3].x);
    const maxX = Math.max(this.corners[0].x, this.corners[1].x, this.corners[2].x, this.corners[3].x);
    return maxX - minX;
  }

  // Get height of the axis-aligned rectangle
  get height() {
    const minY = Math.min(this.corners[0].y, this.corners[1].y, this.corners[2].y, this.corners[3].y);
    const maxY = Math.max(this.corners[0].y, this.corners[1].y, this.corners[2].y, this.corners[3].y);
    return maxY - minY;
  }

  // Get x position (minimum x of corners)
  get x() {
    if (!this.corners) return 0;
    return Math.min(this.corners[0].x, this.corners[1].x, this.corners[2].x, this.corners[3].x);
  }

  // Set x position (shift all corners by delta)
  set x(newX) {
    if (!this.corners) return;
    const currentX = this.x;
    const delta = newX - currentX;
    this.corners.forEach((p) => {
      p.x += delta;
    });
  }

  // Get y position (minimum y of corners)
  get y() {
    if (!this.corners) return 0;
    return Math.min(this.corners[0].y, this.corners[1].y, this.corners[2].y, this.corners[3].y);
  }

  // Set y position (shift all corners by delta)
  set y(newY) {
    if (!this.corners) return;
    const currentY = this.y;
    const delta = newY - currentY;
    this.corners.forEach((p) => {
      p.y += delta;
    });
  }

  draw(pixelBuffer) {
    const {r, g, b, a} = this.getRGBA();
    // Get bounding box to find center
    let minX = this.corners[0].x;
    let maxX = minX;
    let minY = this.corners[0].y;
    let maxY = minY;

    this.corners.forEach((p) => {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    });

    const defaultCx = minX + (maxX - minX) / 2;
    const defaultCy = minY + (maxY - minY) / 2;
    // use custom pivot if set, otherwise use center
    const pivot = this.getEffectivePivot(defaultCx, defaultCy);
    const t = this.corners.map((p) => this.transformPoint(p.x, p.y, pivot.x, pivot.y));
    
    // Draw lines between corners
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
    this.corners = [
      {x: newX, y: newY},
      {x: newX + newWidth, y: newY},
      {x: newX + newWidth, y: newY + newHeight},
      {x: newX, y: newY + newHeight},
    ];
  }

  getShapeData() {
    return {
      type: this.type,
      corners: this.corners.map((p) => ({x: p.x, y: p.y})),
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

  containsPoint(x, y, tolerance = 3) {
    // Get bounding box to find center for transformations
    let minX = this.corners[0].x;
    let maxX = minX;
    let minY = this.corners[0].y;
    let maxY = minY;

    this.corners.forEach((p) => {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    });

    const defaultCx = minX + (maxX - minX) / 2;
    const defaultCy = minY + (maxY - minY) / 2;
    const pivot = this.getEffectivePivot(defaultCx, defaultCy);
    
    // Transform corners to account for rotation, scale, and offset
    const transformedCorners = this.corners.map((p) => 
      this.transformPoint(p.x, p.y, pivot.x, pivot.y)
    );
    
    // Check distance to each transformed edge
    for (let i = 0; i < 4; i++) {
      const p1 = transformedCorners[i];
      const p2 = transformedCorners[(i + 1) % 4];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;

      if (dx === 0 && dy === 0) {
        const dist = Math.sqrt((x - p1.x) ** 2 + (y - p1.y) ** 2);
        if (dist <= tolerance) return true;
        continue;
      }

      const length2 = dx * dx + dy * dy;
      const t = Math.max(0, Math.min(1, ((x - p1.x) * dx + (y - p1.y) * dy) / length2));
      const projectionX = p1.x + t * dx;
      const projectionY = p1.y + t * dy;
      const distance = Math.sqrt((x - projectionX) ** 2 + (y - projectionY) ** 2);

      if (distance <= tolerance) return true;
    }
    return false;
  }

  getBoundingBox() {
    // Find min/max of all corners
    let minX = this.corners[0].x;
    let maxX = minX;
    let minY = this.corners[0].y;
    let maxY = minY;

    this.corners.forEach((p) => {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    });

    // If there are active transformations, transform the corners and get their bounding box
    if (this.rotation !== 0 || this.scale !== 1 || this.offsetX !== 0 || this.offsetY !== 0) {
      const cx = minX + (maxX - minX) / 2;
      const cy = minY + (maxY - minY) / 2;
      const pivot = this.getEffectivePivot(cx, cy);
      const t = this.corners.map((p) => this.transformPoint(p.x, p.y, pivot.x, pivot.y));

      let tminX = t[0].x;
      let tmaxX = tminX;
      let tminY = t[0].y;
      let tmaxY = tminY;

      t.forEach((p) => {
        tminX = Math.min(tminX, p.x);
        tmaxX = Math.max(tmaxX, p.x);
        tminY = Math.min(tminY, p.y);
        tmaxY = Math.max(tmaxY, p.y);
      });

      return {
        left: tminX,
        top: tminY,
        right: tmaxX,
        bottom: tmaxY,
        width: tmaxX - tminX,
        height: tmaxY - tminY,
      };
    }

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
    // Get current bounds
    let minX = this.corners[0].x;
    let maxX = minX;
    let minY = this.corners[0].y;
    let maxY = minY;

    this.corners.forEach((p) => {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    });

    // Update corners based on handle
    switch (handle) {
      case "top-left":
        this.corners[0] = {x: newX, y: newY};
        this.corners[3] = {x: newX, y: this.corners[3].y};
        this.corners[1] = {x: this.corners[1].x, y: newY};
        break;
      case "top-right":
        this.corners[1] = {x: newX, y: newY};
        this.corners[0] = {x: this.corners[0].x, y: newY};
        this.corners[2] = {x: newX, y: this.corners[2].y};
        break;
      case "bottom-left":
        this.corners[3] = {x: newX, y: newY};
        this.corners[0] = {x: newX, y: this.corners[0].y};
        this.corners[2] = {x: this.corners[2].x, y: newY};
        break;
      case "bottom-right":
        this.corners[2] = {x: newX, y: newY};
        this.corners[1] = {x: newX, y: this.corners[1].y};
        this.corners[3] = {x: this.corners[3].x, y: newY};
        break;
      case "top":
        this.corners[0] = {x: this.corners[0].x, y: newY};
        this.corners[1] = {x: this.corners[1].x, y: newY};
        break;
      case "bottom":
        this.corners[2] = {x: this.corners[2].x, y: newY};
        this.corners[3] = {x: this.corners[3].x, y: newY};
        break;
      case "left":
        this.corners[0] = {x: newX, y: this.corners[0].y};
        this.corners[3] = {x: newX, y: this.corners[3].y};
        break;
      case "right":
        this.corners[1] = {x: newX, y: this.corners[1].y};
        this.corners[2] = {x: newX, y: this.corners[2].y};
        break;
      default:
        break;
    }
  }

  applyTransformations() {
    if (this.rotation !== 0 || this.scale !== 1 || this.offsetX !== 0 || this.offsetY !== 0) {
      // Get bounding box to find center
      let minX = this.corners[0].x;
      let maxX = minX;
      let minY = this.corners[0].y;
      let maxY = minY;

      this.corners.forEach((p) => {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
      });

      const cx = minX + (maxX - minX) / 2;
      const cy = minY + (maxY - minY) / 2;

      // Use custom pivot if set, otherwise use center
      const pivot = this.getEffectivePivot(cx, cy);

      // Transform all corners around the pivot
      this.corners = this.corners.map((p) => this.transformPoint(p.x, p.y, pivot.x, pivot.y));
    }
    // Reset all transformations to defaults
    this.rotation = 0;
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
  }
}

export default Rectangle;
