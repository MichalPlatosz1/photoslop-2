class PanTool {
    constructor(viewport) {
        this.viewport = viewport;
        this.isPanning = false;
        this.startX = 0;
        this.startY = 0;

        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
    }

    activate(canvasElement) {
        canvasElement.addEventListener('mousedown', this.onMouseDown);
        canvasElement.addEventListener('mousemove', this.onMouseMove);
        canvasElement.addEventListener('mouseup', this.onMouseUp);
        canvasElement.addEventListener('mouseleave', this.onMouseUp);
    }

    deactivate(canvasElement) {
        canvasElement.removeEventListener('mousedown', this.onMouseDown);
        canvasElement.removeEventListener('mousemove', this.onMouseMove);
        canvasElement.removeEventListener('mouseup', this.onMouseUp);
        canvasElement.removeEventListener('mouseleave', this.onMouseUp);
    }

    onMouseDown(event) {
        this.isPanning = true;
        this.startX = event.clientX - this.viewport.position.x;
        this.startY = event.clientY - this.viewport.position.y;
    }

    onMouseMove(event) {
        if (!this.isPanning) return;

        const x = event.clientX;
        const y = event.clientY;

        this.viewport.position.x = x - this.startX;
        this.viewport.position.y = y - this.startY;
    }

    onMouseUp() {
        this.isPanning = false;
    }
}

export default PanTool;