class DrawingTool {
    constructor(canvas) {
        this.canvas = canvas;
        this.currentShape = null;
    }

    selectShape(shape) {
        this.currentShape = shape;
    }

    drawShape(startX, startY, endX, endY) {
        if (!this.currentShape) return;

        const shapeData = this.currentShape.getShapeData(startX, startY, endX, endY);
        this.canvas.modifyPixels(shapeData);
    }

    modifyShape(newProperties) {
        if (this.currentShape) {
            this.currentShape.modify(newProperties);
            this.canvas.render();
        }
    }
}

export default DrawingTool;