class Bresenham {
  static drawLine(pixelBuffer, x0, y0, x1, y1, r = 0, g = 0, b = 0, a = 255, lineWidth = 1) {
    if (lineWidth === 1) {
      this.drawThinLine(pixelBuffer, x0, y0, x1, y1, r, g, b, a);
    } else {
      this.drawThickLine(pixelBuffer, x0, y0, x1, y1, r, g, b, a, lineWidth);
    }
  }

  static drawThinLine(pixelBuffer, x0, y0, x1, y1, r, g, b, a) {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      pixelBuffer.setPixel(x0, y0, r, g, b, a);

      if (x0 === x1 && y0 === y1) break;
      const err2 = err * 2;
      if (err2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (err2 < dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  static drawThickLine(pixelBuffer, x0, y0, x1, y1, r, g, b, a, lineWidth) {
    const halfWidth = Math.floor(lineWidth / 2);

    const dx = x1 - x0;
    const dy = y1 - y0;
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length === 0) {
      this.drawCircle(pixelBuffer, x0, y0, halfWidth, r, g, b, a);
      return;
    }

    // Normalize perpendicular vector
    const perpX = -dy / length;
    const perpY = dx / length;

    // Wu's line algorithm
    this.drawThinLine(pixelBuffer, x0, y0, x1, y1, r, g, b, a);

    // Draw additional parallel lines for thickness
    for (let i = 1; i <= halfWidth; i++) {
      // Positive side
      const offsetX1 = perpX * i;
      const offsetY1 = perpY * i;
      this.drawThinLine(
        pixelBuffer,
        Math.round(x0 + offsetX1),
        Math.round(y0 + offsetY1),
        Math.round(x1 + offsetX1),
        Math.round(y1 + offsetY1),
        r,
        g,
        b,
        a
      );

      // Negative side
      const offsetX2 = perpX * -i;
      const offsetY2 = perpY * -i;
      this.drawThinLine(
        pixelBuffer,
        Math.round(x0 + offsetX2),
        Math.round(y0 + offsetY2),
        Math.round(x1 + offsetX2),
        Math.round(y1 + offsetY2),
        r,
        g,
        b,
        a
      );
    }

    // Fill gaps by drawing additional pixels between parallel lines
    if (lineWidth > 2) {
      this.fillThickLineGaps(pixelBuffer, x0, y0, x1, y1, r, g, b, a, lineWidth);
    }
  }

  static fillThickLineGaps(pixelBuffer, x0, y0, x1, y1, r, g, b, a, lineWidth) {
    const halfWidth = Math.floor(lineWidth / 2);
    const dx = x1 - x0;
    const dy = y1 - y0;

    const steps = Math.max(Math.abs(dx), Math.abs(dy));
    for (let t = 0; t <= steps; t++) {
      const progress = steps > 0 ? t / steps : 0;
      const centerX = Math.round(x0 + dx * progress);
      const centerY = Math.round(y0 + dy * progress);

      for (let i = -halfWidth; i <= halfWidth; i++) {
        for (let j = -halfWidth; j <= halfWidth; j++) {
          if (i * i + j * j <= halfWidth * halfWidth) {
            pixelBuffer.setPixel(centerX + i, centerY + j, r, g, b, a);
          }
        }
      }
    }
  }

  static drawCircle(pixelBuffer, centerX, centerY, radius, r, g, b, a) {
    for (let x = -radius; x <= radius; x++) {
      for (let y = -radius; y <= radius; y++) {
        if (x * x + y * y <= radius * radius) {
          pixelBuffer.setPixel(centerX + x, centerY + y, r, g, b, a);
        }
      }
    }
  }

  static drawCircleOutline(pixelBuffer, centerX, centerY, radius, r = 0, g = 0, b = 0, a = 255, lineWidth = 1) {
    if (radius < 1) {
      if (radius > 0) {
        pixelBuffer.setPixel(Math.round(centerX), Math.round(centerY), r, g, b, a);
      }
      return;
    }

    if (lineWidth === 1) {
      this.drawThinCircle(pixelBuffer, centerX, centerY, radius, r, g, b, a);
    } else {
      this.drawThickCircle(pixelBuffer, centerX, centerY, radius, r, g, b, a, lineWidth);
    }
  }

  static drawThinCircle(pixelBuffer, centerX, centerY, radius, r, g, b, a) {
    const cx = Math.round(centerX);
    const cy = Math.round(centerY);
    const rad = Math.round(radius);

    if (rad <= 0) {
      pixelBuffer.setPixel(cx, cy, r, g, b, a);
      return;
    }

    if (rad === 1) {
      pixelBuffer.setPixel(cx, cy - 1, r, g, b, a);
      pixelBuffer.setPixel(cx - 1, cy, r, g, b, a);
      pixelBuffer.setPixel(cx + 1, cy, r, g, b, a);
      pixelBuffer.setPixel(cx, cy + 1, r, g, b, a);
      return;
    }

    let x = 0;
    let y = rad;
    let d = 3 - 2 * rad;

    this.drawCirclePoints(pixelBuffer, cx, cy, x, y, r, g, b, a);

    while (y >= x) {
      x++;
      if (d > 0) {
        y--;
        d = d + 4 * (x - y) + 10;
      } else {
        d = d + 4 * x + 6;
      }
      this.drawCirclePoints(pixelBuffer, cx, cy, x, y, r, g, b, a);
    }
  }

  static drawThickCircle(pixelBuffer, centerX, centerY, radius, r, g, b, a, lineWidth) {
    const halfWidth = Math.floor(lineWidth / 2);

    if (radius <= halfWidth) {
      this.drawCircle(pixelBuffer, centerX, centerY, Math.max(halfWidth, 1), r, g, b, a);
      return;
    }

    this.fillThickCircleGaps(pixelBuffer, centerX, centerY, radius, r, g, b, a, lineWidth);
  }

  static fillThickCircleGaps(pixelBuffer, centerX, centerY, radius, r, g, b, a, lineWidth) {
    const halfWidth = Math.floor(lineWidth / 2);
    const cx = Math.round(centerX);
    const cy = Math.round(centerY);

    const innerRadius = Math.max(0, radius - halfWidth - 0.5);
    const outerRadius = radius + halfWidth + 0.5;

    const maxRange = Math.ceil(outerRadius) + 1;

    for (let x = cx - maxRange; x <= cx + maxRange; x++) {
      for (let y = cy - maxRange; y <= cy + maxRange; y++) {
        const distance = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));

        if (distance >= innerRadius && distance <= outerRadius) {
          pixelBuffer.setPixel(x, y, r, g, b, a);
        }
      }
    }
  }

  static drawCirclePoints(pixelBuffer, centerX, centerY, x, y, r, g, b, a) {
    pixelBuffer.setPixel(centerX + x, centerY + y, r, g, b, a);
    pixelBuffer.setPixel(centerX - x, centerY + y, r, g, b, a);
    pixelBuffer.setPixel(centerX + x, centerY - y, r, g, b, a);
    pixelBuffer.setPixel(centerX - x, centerY - y, r, g, b, a);
    pixelBuffer.setPixel(centerX + y, centerY + x, r, g, b, a);
    pixelBuffer.setPixel(centerX - y, centerY + x, r, g, b, a);
    pixelBuffer.setPixel(centerX + y, centerY - x, r, g, b, a);
    pixelBuffer.setPixel(centerX - y, centerY - x, r, g, b, a);
  }

  static drawRectangle(pixelBuffer, x, y, width, height, r = 0, g = 0, b = 0, a = 255, lineWidth = 1) {
    this.drawLine(pixelBuffer, x, y, x + width, y, r, g, b, a, lineWidth);
    this.drawLine(pixelBuffer, x, y, x, y + height, r, g, b, a, lineWidth);
    this.drawLine(pixelBuffer, x + width, y, x + width, y + height, r, g, b, a, lineWidth);
    this.drawLine(pixelBuffer, x, y + height, x + width, y + height, r, g, b, a, lineWidth);
  }
}

export default Bresenham;
