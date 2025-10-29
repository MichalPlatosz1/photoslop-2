class Grid {
  constructor() {
    this.gridSize = 1; // 1 pixel grid
  }

  draw(ctx, viewport) {
    if (!viewport.isPixelGridVisible()) return;

    const {canvasWidth, canvasHeight} = viewport;
    const {zoom, position} = viewport;

    ctx.save();
    ctx.strokeStyle = "rgba(100, 100, 100, 0.3)";
    ctx.lineWidth = 1;

    const spacing = zoom;

    const offsetX = position.x % spacing;
    const offsetY = position.y % spacing;

    for (let x = offsetX; x < canvasWidth; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasHeight);
      ctx.stroke();
    }

    for (let y = offsetY; y < canvasHeight; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasWidth, y);
      ctx.stroke();
    }

    ctx.restore();
  }
}

export default Grid;
