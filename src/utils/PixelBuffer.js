class PixelBuffer {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.buffer = new Uint8ClampedArray(width * height * 4);
    this.clear();
  }

  clear() {
    for (let i = 0; i < this.buffer.length; i++) {
      this.buffer[i] = 0;
    }
  }

  setPixel(x, y, r, g, b, a = 255) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return;
    }
    const index = (y * this.width + x) * 4;
    if (index >= 0 && index < this.buffer.length) {
      this.buffer[index] = r;
      this.buffer[index + 1] = g;
      this.buffer[index + 2] = b;
      this.buffer[index + 3] = a;
    }
  }

  getPixel(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return null;
    }
    const index = (y * this.width + x) * 4;
    if (index >= 0 && index < this.buffer.length) {
      return {
        r: this.buffer[index],
        g: this.buffer[index + 1],
        b: this.buffer[index + 2],
        a: this.buffer[index + 3],
      };
    }
    return null;
  }

  drawBorder(r = 128, g = 128, b = 128, a = 255) {
    for (let x = 0; x < this.width; x++) {
      this.setPixel(x, 0, r, g, b, a);
      this.setPixel(x, this.height - 1, r, g, b, a);
    }

    for (let y = 0; y < this.height; y++) {
      this.setPixel(0, y, r, g, b, a);
      this.setPixel(this.width - 1, y, r, g, b, a);
    }
  }

  getBuffer() {
    return this.buffer;
  }
}

export default PixelBuffer;
