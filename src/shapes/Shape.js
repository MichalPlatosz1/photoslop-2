class Shape {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.color = "black";
    this.lineWidth = 1;
    this.selected = false;
  }

  setColor(color) {
    this.color = color;
  }

  setLineWidth(lineWidth) {
    this.lineWidth = lineWidth;
  }

  setSelected(selected) {
    this.selected = selected;
  }

  getRGBA() {
    const color = this.color;

    if (color.startsWith("#")) {
      const hex = color.slice(1);
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      return {r, g, b, a: 255};
    }

    const colorMap = {
      black: {r: 0, g: 0, b: 0, a: 255},
      white: {r: 255, g: 255, b: 255, a: 255},
      red: {r: 255, g: 0, b: 0, a: 255},
      green: {r: 0, g: 128, b: 0, a: 255},
      blue: {r: 0, g: 0, b: 255, a: 255},
      yellow: {r: 255, g: 255, b: 0, a: 255},
      cyan: {r: 0, g: 255, b: 255, a: 255},
      magenta: {r: 255, g: 0, b: 255, a: 255},
      orange: {r: 255, g: 165, b: 0, a: 255},
      purple: {r: 128, g: 0, b: 128, a: 255},
      gray: {r: 128, g: 128, b: 128, a: 255},
      brown: {r: 165, g: 42, b: 42, a: 255},
    };

    return colorMap[color.toLowerCase()] || {r: 0, g: 0, b: 0, a: 255};
  }

  getShapeInfo() {
    return {
      x: this.x,
      y: this.y,
      color: this.color,
      lineWidth: this.lineWidth,
      selected: this.selected,
    };
  }

  draw() {
    throw new Error("Draw method must be implemented in subclasses");
  }

  modify(properties) {
    Object.assign(this, properties);
  }

  containsPoint(x, y, tolerance = 3) {
    return false;
  }

  getBoundingBox() {
    return {
      left: this.x,
      top: this.y,
      right: this.x,
      bottom: this.y,
      width: 0,
      height: 0,
    };
  }

  getResizeHandle(x, y, tolerance = 5) {
    const bbox = this.getBoundingBox();
    const handles = {
      "top-left": {x: bbox.left, y: bbox.top},
      "top-right": {x: bbox.right, y: bbox.top},
      "bottom-left": {x: bbox.left, y: bbox.bottom},
      "bottom-right": {x: bbox.right, y: bbox.bottom},
      top: {x: bbox.left + bbox.width / 2, y: bbox.top},
      bottom: {x: bbox.left + bbox.width / 2, y: bbox.bottom},
      left: {x: bbox.left, y: bbox.top + bbox.height / 2},
      right: {x: bbox.right, y: bbox.top + bbox.height / 2},
    };

    for (const [handle, pos] of Object.entries(handles)) {
      if (Math.abs(x - pos.x) <= tolerance && Math.abs(y - pos.y) <= tolerance) {
        return handle;
      }
    }
    return null;
  }
}

export default Shape;
