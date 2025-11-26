import React, {useState, useEffect, useRef} from "react";
import PixelBuffer from "../utils/PixelBuffer.js";
import ImageLoader from "../utils/ImageLoader.js";
import Viewport from "./Viewport.js";
import Grid from "./Grid.js";
import PanTool from "../tools/PanTool.js";
import ZoomTool from "../tools/ZoomTool.js";
import DrawingTool from "../tools/DrawingTool.js";
import SelectionTool from "../tools/SelectionTool.js";
import Line from "../shapes/Line.js";
import Rectangle from "../shapes/Rectangle.js";
import Circle from "../shapes/Circle.js";
import ColorSpaceConverter from "../components/ColorSpaceConverter.js";
import RGBCube3D from "../components/RGBCube3D.js";
import PointTransformations from "../components/PointTransformations.js";
import ImageFilters from "../components/ImageFilters.js";
import HistogramAnalysis from "../components/HistogramAnalysis.js";
import BinarizationMethods from "../components/BinarizationMethods.js";

const Canvas = () => {
  const canvasRef = useRef(null);
  const canvasInstanceRef = useRef(null);
  const ctxRef = useRef(null);
  const pixelBufferRef = useRef(null);
  const viewportRef = useRef(null);
  const gridRef = useRef(null);
  const shapesRef = useRef([]);
  const panToolRef = useRef(null);
  const zoomToolRef = useRef(null);
  const drawingToolRef = useRef(null);
  const selectionToolRef = useRef(null);

  // State management
  const [currentTool, setCurrentTool] = useState("line");
  const [mode, setMode] = useState("draw");
  const [cursor, setCursor] = useState("crosshair");
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({x: 0, y: 0});
  const [shapeCount, setShapeCount] = useState(0);
  const [lineWidth, setLineWidth] = useState(1);
  const [currentPreviewShape, setCurrentPreviewShape] = useState(null);
  const [selectedShape, setSelectedShape] = useState(null);

  // Parametric shape creation state
  const [placementMode, setPlacementMode] = useState(false);
  const [placementTool, setPlacementTool] = useState(null); // 'line', 'rectangle', 'circle'
  const [lineParams, setLineParams] = useState({startX: 50, startY: 50, endX: 150, endY: 100});
  const [rectParams, setRectParams] = useState({width: 80, height: 60});
  const [circleParams, setCircleParams] = useState({radius: 40});
  const [placementPreview, setPlacementPreview] = useState(null);

  // RGB hover display state
  const [hoverRGB, setHoverRGB] = useState(null);
  const [hoverPosition, setHoverPosition] = useState({x: 0, y: 0});

  // Performance optimization
  const drawTimerRef = useRef(null);

  const throttledDrawCanvas = () => {
    if (drawTimerRef.current) {
      return; // Already scheduled
    }

    drawTimerRef.current = requestAnimationFrame(() => {
      drawCanvas();
      drawTimerRef.current = null;
    });
  };

  // Color selection state
  const [currentColor, setCurrentColor] = useState("#000000");

  // PPM image loading state
  const [loadedImage, setLoadedImage] = useState(null);
  const loadedImageRef = useRef(null);
  const [imagePosition, setImagePosition] = useState({x: 0, y: 0});
  const imagePositionRef = useRef({x: 0, y: 0});

  // JPG compression quality state (0.1 to 1.0, default 0.92)
  const [jpgQuality, setJpgQuality] = useState(0.92);

  // Color space converter state
  const [showColorConverter, setShowColorConverter] = useState(false);

  // RGB Cube 3D state
  const [showRGBCube, setShowRGBCube] = useState(false);

  // Point Transformations state
  const [showPointTransformations, setShowPointTransformations] = useState(false);

  // Image Filters state
  const [showImageFilters, setShowImageFilters] = useState(false);

  // Histogram Analysis state
  const [showHistogramAnalysis, setShowHistogramAnalysis] = useState(false);

  // Binarization Methods state
  const [showBinarizationMethods, setShowBinarizationMethods] = useState(false);

  // Canvas dimensions
  const canvasWidth = 800;
  const canvasHeight = 600;
  const [virtualWidth, setVirtualWidth] = useState(400);
  const [virtualHeight, setVirtualHeight] = useState(300);

  useEffect(() => {
    // Initialize components
    pixelBufferRef.current = new PixelBuffer(virtualWidth, virtualHeight);
    viewportRef.current = new Viewport(canvasWidth, canvasHeight, virtualWidth, virtualHeight);
    gridRef.current = new Grid();

    // Initialize image position ref
    imagePositionRef.current = imagePosition;

    // Tools
    panToolRef.current = new PanTool(viewportRef.current);
    zoomToolRef.current = new ZoomTool(viewportRef.current, shapesRef.current);
    drawingToolRef.current = new DrawingTool();
    selectionToolRef.current = new SelectionTool(shapesRef.current, viewportRef.current, () => {
      setSelectedShape(selectionToolRef.current.selectedShape);
      drawCanvas();
    });

    canvasInstanceRef.current = canvasRef.current;
    ctxRef.current = canvasInstanceRef.current.getContext("2d");

    // Disable image smoothing for pixel-perfect rendering
    ctxRef.current.imageSmoothingEnabled = false;

    const keyDownHandler = (event) => {
      // Skip keyboard shortcuts if user is typing in an input field
      const activeElement = document.activeElement;
      if (
        activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          activeElement.tagName === "SELECT" ||
          activeElement.contentEditable === "true")
      ) {
        return;
      }

      switch (event.key) {
        case "p":
          setMode((prevMode) => (prevMode === "pan" ? "draw" : "pan"));
          break;
        case "s":
          setMode("select");
          break;
        case "l":
          setCurrentTool("line");
          setMode("draw");
          break;
        case "r":
          setCurrentTool("rectangle");
          setMode("draw");
          break;
        case "c":
          setCurrentTool("circle");
          setMode("draw");
          break;
        case "+":
        case "=":
          if (zoomToolRef.current) {
            zoomToolRef.current.zoomIn();
            drawCanvas();
          }
          break;
        case "-":
          if (zoomToolRef.current) {
            zoomToolRef.current.zoomOut();
            drawCanvas();
          }
          break;
        case "0":
          if (viewportRef.current) {
            viewportRef.current.reset();
            drawCanvas();
          }
          break;
        case "Escape":
          if (placementMode) {
            exitPlacementMode();
          }
          break;
        default:
          break;
      }
    };

    document.addEventListener("keydown", keyDownHandler);

    const wheelHandler = (event) => {
      if (canvasInstanceRef.current && canvasInstanceRef.current.contains(event.target)) {
        event.preventDefault();
        const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = viewportRef.current.zoom * zoomFactor;

        const rect = canvasInstanceRef.current.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        viewportRef.current.zoomToPoint(newZoom, mouseX, mouseY);
        console.log(
          `Zoom: ${newZoom.toFixed(2)}, Position: ${viewportRef.current.position.x.toFixed(
            1
          )}, ${viewportRef.current.position.y.toFixed(1)}, ImagePos: (${imagePositionRef.current.x}, ${
            imagePositionRef.current.y
          })`
        );
        drawCanvas();
      }
    };

    document.addEventListener("wheel", wheelHandler, {passive: false});

    drawCanvas();

    return () => {
      document.removeEventListener("keydown", keyDownHandler);
      document.removeEventListener("wheel", wheelHandler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update zoom tool with current shapes whenever shapes change
  useEffect(() => {
    if (zoomToolRef.current) {
      zoomToolRef.current.updateShapes(shapesRef.current);
    }
  }, [shapeCount]);

  // Redraw when loaded image changes
  useEffect(() => {
    loadedImageRef.current = loadedImage;
    if (loadedImage && ctxRef.current) {
      setTimeout(() => {
        drawCanvas();
      }, 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedImage]);

  // Sync imagePosition state with imagePositionRef
  useEffect(() => {
    imagePositionRef.current = imagePosition;
  }, [imagePosition]);

  // Update UI state from viewport periodically (for display purposes)
  useEffect(() => {
    const updateUIState = () => {
      if (viewportRef.current) {
        setZoom(viewportRef.current.zoom);
        setPosition({...viewportRef.current.position});
      }
    };

    const interval = setInterval(updateUIState, 100);
    return () => clearInterval(interval);
  }, []);

  const addShape = (shape) => {
    shapesRef.current.push(shape);
    if (selectionToolRef.current) {
      selectionToolRef.current.shapes = shapesRef.current;
    }
    setShapeCount(shapesRef.current.length);
    drawCanvas();
  };

  const clearAllShapes = () => {
    shapesRef.current = [];
    if (selectionToolRef.current) {
      selectionToolRef.current.shapes = shapesRef.current;
    }
    setShapeCount(0);
    drawCanvas();
  };

  const drawPPMToPixelBuffer = (ppmData, offsetX, offsetY) => {
    if (!pixelBufferRef.current || !ppmData || !ppmData.data) return;

    const imageWidth = ppmData.width;
    const imageHeight = ppmData.height;
    const imagePixels = ppmData.data;

    for (let y = 0; y < imageHeight; y++) {
      for (let x = 0; x < imageWidth; x++) {
        const targetX = offsetX + x;
        const targetY = offsetY + y;

        if (
          targetX >= 0 &&
          targetX < pixelBufferRef.current.width &&
          targetY >= 0 &&
          targetY < pixelBufferRef.current.height
        ) {
          const sourceIndex = (y * imageWidth + x) * 4;
          const r = imagePixels[sourceIndex];
          const g = imagePixels[sourceIndex + 1];
          const b = imagePixels[sourceIndex + 2];
          const a = imagePixels[sourceIndex + 3];

          if (a > 0) {
            pixelBufferRef.current.setPixel(targetX, targetY, r, g, b, a);
          }
        }
      }
    }
  };

  const drawCanvas = () => {
    if (!pixelBufferRef.current || !ctxRef.current) return;

    const currentVirtualWidth = viewportRef.current.virtualWidth;
    const currentVirtualHeight = viewportRef.current.virtualHeight;

    if (
      pixelBufferRef.current.width !== currentVirtualWidth ||
      pixelBufferRef.current.height !== currentVirtualHeight
    ) {
      console.log(
        `Resizing pixel buffer from ${pixelBufferRef.current.width}x${pixelBufferRef.current.height} to ${currentVirtualWidth}x${currentVirtualHeight} (zoom: ${viewportRef.current.zoom})`
      );
      pixelBufferRef.current = new PixelBuffer(currentVirtualWidth, currentVirtualHeight);
    }

    pixelBufferRef.current.clear();

    const currentLoadedImage = loadedImageRef.current;
    if (currentLoadedImage && currentLoadedImage.data) {
      const imgPos = imagePositionRef.current;
      console.log(
        `Drawing PPM image at position (${imgPos.x}, ${imgPos.y}), size: ${currentLoadedImage.data.width}x${currentLoadedImage.data.height}, buffer: ${pixelBufferRef.current.width}x${pixelBufferRef.current.height}`
      );
      drawPPMToPixelBuffer(currentLoadedImage.data, imgPos.x, imgPos.y);
    } else {
      console.log(
        `PPM image NOT drawn - loadedImageRef: ${!!currentLoadedImage}, data: ${!!(
          currentLoadedImage && currentLoadedImage.data
        )}`
      );
    }

    shapesRef.current.forEach((shape) => {
      shape.draw(pixelBufferRef.current);
    });

    if (currentPreviewShape) {
      currentPreviewShape.draw(pixelBufferRef.current);
    }

    if (placementPreview) {
      placementPreview.draw(pixelBufferRef.current);
    }

    // Clear entire canvas completely
    ctxRef.current.clearRect(0, 0, canvasWidth, canvasHeight);

    // Reset canvas state to ensure clean rendering
    ctxRef.current.setTransform(1, 0, 0, 1, 0, 0); // Reset transform matrix
    ctxRef.current.globalCompositeOperation = "source-over"; // Reset composite operation
    ctxRef.current.imageSmoothingEnabled = false; // Ensure pixel-perfect rendering

    // Fill with background color
    ctxRef.current.fillStyle = "#e8e8e8";
    ctxRef.current.fillRect(0, 0, canvasWidth, canvasHeight);

    // Create ImageData using pixel buffer dimensions to avoid transient mismatches
    const bufferWidth = pixelBufferRef.current.width;
    const bufferHeight = pixelBufferRef.current.height;
    const imageData = ctxRef.current.createImageData(bufferWidth, bufferHeight);
    const bufferData = pixelBufferRef.current.getBuffer();

    // Fill ImageData from buffer; if sizes differ, copy the overlapping portion only
    if (bufferData.length === imageData.data.length) {
      imageData.data.set(bufferData);
    } else {
      const minLen = Math.min(bufferData.length, imageData.data.length);
      imageData.data.set(bufferData.subarray(0, minLen));
      // Leave any remaining bytes as transparent (zeros) to avoid blanking the entire frame
      if (process && process.env && process.env.NODE_ENV !== "production") {
        console.warn(
          `Buffer/ImageData length mismatch (copied ${minLen} of ${bufferData.length} -> ${imageData.data.length}).`
        );
      }
    }

    // Prepare temp canvas with pixel data
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = bufferWidth;
    tempCanvas.height = bufferHeight;
    const tempCtx = tempCanvas.getContext("2d");

    // Disable image smoothing for pixel-perfect rendering
    tempCtx.imageSmoothingEnabled = false;
    tempCtx.putImageData(imageData, 0, 0);

    // Apply viewport transformation
    ctxRef.current.save();
    ctxRef.current.translate(viewportRef.current.position.x, viewportRef.current.position.y);
    ctxRef.current.scale(viewportRef.current.zoom, viewportRef.current.zoom);

    // Ensure image smoothing is disabled for pixel-perfect rendering
    ctxRef.current.imageSmoothingEnabled = false;

    // Draw white background for virtual canvas area
    ctxRef.current.fillStyle = "#ffffff";
    ctxRef.current.fillRect(0, 0, currentVirtualWidth, currentVirtualHeight);

    // Draw the pixel data
    ctxRef.current.drawImage(tempCanvas, 0, 0);

    // Draw border around virtual canvas
    ctxRef.current.strokeStyle = "#333333";
    ctxRef.current.lineWidth = 2 / viewportRef.current.zoom;
    ctxRef.current.strokeRect(0, 0, currentVirtualWidth, currentVirtualHeight);

    if (mode === "select" && selectionToolRef.current) {
      selectionToolRef.current.drawSelectionHandles(ctxRef.current, viewportRef.current);
    }

    ctxRef.current.restore();

    gridRef.current.draw(ctxRef.current, viewportRef.current);
  };

  const handleMouseDown = (event) => {
    const rect = canvasInstanceRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const worldPos = viewportRef.current.screenToWorld(x, y);

    if (mode === "pan") {
      panToolRef.current.onMouseDown(event);
    } else if (mode === "select") {
      selectionToolRef.current.onMouseDown(worldPos.x, worldPos.y);
      setSelectedShape(selectionToolRef.current.selectedShape);
      drawCanvas();
    } else if (mode === "place" && placementTool && placementPreview) {
      addShape(placementPreview);
      exitPlacementMode();
    } else if (mode === "draw") {
      setIsDrawing(true);
      setStartPoint(worldPos);
      setCurrentPreviewShape(null);
    }
  };

  const handleMouseMove = (event) => {
    const rect = canvasInstanceRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const worldPos = viewportRef.current.screenToWorld(x, y);

    if (mode === "pan" && panToolRef.current.isPanning) {
      panToolRef.current.onMouseMove(event);
      throttledDrawCanvas();
    } else if (mode === "select") {
      const handled = selectionToolRef.current.onMouseMove(worldPos.x, worldPos.y);
      if (handled) {
        setSelectedShape(selectionToolRef.current.selectedShape);
        throttledDrawCanvas();
      }

      const newCursor = selectionToolRef.current.getCursor(worldPos.x, worldPos.y);
      setCursor(newCursor);
    } else if (mode === "place" && placementTool) {
      let previewShape;
      if (placementTool === "rectangle") {
        previewShape = new Rectangle(
          worldPos.x - rectParams.width / 2,
          worldPos.y - rectParams.height / 2,
          rectParams.width,
          rectParams.height
        );
        previewShape.setLineWidth(lineWidth);
        previewShape.setColor(currentColor);
      } else if (placementTool === "circle") {
        previewShape = new Circle(worldPos.x, worldPos.y, circleParams.radius);
        previewShape.setLineWidth(lineWidth);
        previewShape.setColor(currentColor);
      } else if (placementTool === "line") {
        const dx = lineParams.endX - lineParams.startX;
        const dy = lineParams.endY - lineParams.startY;
        previewShape = new Line(worldPos.x, worldPos.y, worldPos.x + dx, worldPos.y + dy);
        previewShape.setLineWidth(lineWidth);
        previewShape.setColor(currentColor);
      }

      setPlacementPreview(previewShape);
      throttledDrawCanvas();
    } else if (isDrawing && startPoint) {
      // Preview drawing - show shape being drawn in real-time
      let previewShape;
      if (currentTool === "line") {
        previewShape = new Line(startPoint.x, startPoint.y, worldPos.x, worldPos.y);
        previewShape.setLineWidth(lineWidth);
        previewShape.setColor(currentColor);
      } else if (currentTool === "rectangle") {
        const width = worldPos.x - startPoint.x;
        const height = worldPos.y - startPoint.y;
        previewShape = new Rectangle(startPoint.x, startPoint.y, width, height);
        previewShape.setLineWidth(lineWidth);
        previewShape.setColor(currentColor);
      } else if (currentTool === "circle") {
        const radius = Math.sqrt((worldPos.x - startPoint.x) ** 2 + (worldPos.y - startPoint.y) ** 2);
        previewShape = new Circle(startPoint.x, startPoint.y, radius);
        previewShape.setLineWidth(lineWidth);
        previewShape.setColor(currentColor);
      }

      setCurrentPreviewShape(previewShape);
      throttledDrawCanvas();
    }

    // Get RGB values at mouse position for hover display
    if (pixelBufferRef.current) {
      // Convert world coordinates to pixel buffer coordinates
      const pixelX = Math.floor(worldPos.x);
      const pixelY = Math.floor(worldPos.y);
      const pixelData = pixelBufferRef.current.getPixel(pixelX, pixelY);

      if (pixelData) {
        setHoverRGB(pixelData);
        setHoverPosition({x: event.clientX, y: event.clientY}); // Screen coordinates for tooltip
      } else {
        setHoverRGB(null);
      }
    }
  };

  const handleMouseUp = (event) => {
    if (mode === "pan") {
      panToolRef.current.onMouseUp();
    } else if (mode === "select") {
      selectionToolRef.current.onMouseUp();
    } else if (isDrawing && startPoint) {
      const rect = canvasInstanceRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const worldPos = viewportRef.current.screenToWorld(x, y);

      let shape;
      if (currentTool === "line") {
        shape = new Line(startPoint.x, startPoint.y, worldPos.x, worldPos.y);
        shape.setLineWidth(lineWidth);
        shape.setColor(currentColor);
      } else if (currentTool === "rectangle") {
        const width = worldPos.x - startPoint.x;
        const height = worldPos.y - startPoint.y;
        shape = new Rectangle(startPoint.x, startPoint.y, width, height);
        shape.setLineWidth(lineWidth);
        shape.setColor(currentColor);
      } else if (currentTool === "circle") {
        const radius = Math.sqrt((worldPos.x - startPoint.x) ** 2 + (worldPos.y - startPoint.y) ** 2);
        shape = new Circle(startPoint.x, startPoint.y, radius);
        shape.setLineWidth(lineWidth);
        shape.setColor(currentColor);
      }

      if (shape) {
        addShape(shape);
      }

      setIsDrawing(false);
      setStartPoint(null);
      setCurrentPreviewShape(null);
    }
  };

  const handleToolChange = (tool) => {
    setCurrentTool(tool);
    setMode("draw");
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
  };

  const handleZoomIn = () => {
    zoomToolRef.current.zoomIn();
    drawCanvas();
  };

  const handleZoomOut = () => {
    zoomToolRef.current.zoomOut();
    drawCanvas();
  };

  const handleResetView = () => {
    viewportRef.current.reset();
    drawCanvas();
  };

  const handleFitToContent = () => {
    if (zoomToolRef.current) {
      zoomToolRef.current.fitToContent();
      drawCanvas();
    }
  };

  const handleSelectedShapeLineWidthChange = (newLineWidth) => {
    if (selectedShape) {
      selectedShape.setLineWidth(newLineWidth);
      drawCanvas();
    }
  };

  const handleSelectedShapeColorChange = (newColor) => {
    if (selectedShape) {
      selectedShape.setColor(newColor);
      drawCanvas();
    }
  };

  const handleColorConverterChange = (newColor) => {
    setCurrentColor(newColor);
  };

  const handleRGBCubeColorSelect = (color) => {
    const hexColor = `#${((1 << 24) + (color.r << 16) + (color.g << 8) + color.b).toString(16).slice(1)}`;
    setCurrentColor(hexColor);
  };

  const handleImageTransformed = (transformedImage) => {
    // Update the loaded image with the transformed data
    setLoadedImage((prev) => ({
      ...prev,
      data: transformedImage.data
        ? transformedImage
        : {
            ...prev.data,
            data: transformedImage,
          },
    }));

    // Trigger canvas redraw
    if (ctxRef.current) {
      throttledDrawCanvas();
    }
  };

  const handleSaveAsJPG = async () => {
    try {
      const imageLoader = new ImageLoader();

      const blob = await imageLoader.pixelBufferToJPG(pixelBufferRef.current, jpgQuality);

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `photoslop-drawing-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log(`Drawing saved as JPG successfully (quality: ${Math.round(jpgQuality * 100)}%)`);
    } catch (error) {
      console.error("Error saving as JPG:", error);
      alert("Error saving as JPG: " + error.message);
    }
  };

  const handleSaveProject = () => {
    try {
      const projectData = {
        version: "1.0",
        timestamp: new Date().toISOString(),
        viewport: {
          zoom: viewportRef.current.zoom,
          position: {
            x: viewportRef.current.position.x,
            y: viewportRef.current.position.y,
          },
        },
        canvas: {
          virtualWidth: virtualWidth,
          virtualHeight: virtualHeight,
        },
        shapes: shapesRef.current.map((shape) => shape.getShapeData()),
        settings: {
          currentTool,
          currentColor,
          lineWidth,
        },
      };

      if (loadedImage && loadedImage.data) {
        const imageDataArray = Array.from(loadedImage.data.data);
        projectData.loadedImage = {
          width: loadedImage.data.width,
          height: loadedImage.data.height,
          format: loadedImage.data.format,
          maxVal: loadedImage.data.maxVal,
          data: imageDataArray,
          position: {
            x: imagePosition.x,
            y: imagePosition.y,
          },
          originalSize: loadedImage.originalSize || null,
          info: loadedImage.info,
          originalFormat: loadedImage.originalFormat || "ppm",
        };
        console.log(
          `Including ${loadedImage.originalFormat || "PPM"} image in save: ${loadedImage.data.width}x${
            loadedImage.data.height
          }`
        );
      }

      // Convert to JSON string
      const jsonString = JSON.stringify(projectData, null, 2);

      // Create and download the file
      const blob = new Blob([jsonString], {type: "application/json"});
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `photoslop-project-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.psh`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log("Project saved successfully");
    } catch (error) {
      console.error("Error saving project:", error);
      alert("Error saving project: " + error.message);
    }
  };

  const handleLoadProject = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".psh")) {
      alert("Please select a .psh file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const projectData = JSON.parse(e.target.result);

        if (!projectData.shapes || !Array.isArray(projectData.shapes)) {
          throw new Error("Invalid project file: missing shapes data");
        }

        // Clear existing shapes
        shapesRef.current = [];
        setSelectedShape(null);

        // Recreate shapes from data
        projectData.shapes.forEach((shapeData) => {
          let shape;

          switch (shapeData.type) {
            case "line":
              shape = new Line(shapeData.startX, shapeData.startY, shapeData.endX, shapeData.endY);
              break;
            case "rectangle":
              shape = new Rectangle(shapeData.x, shapeData.y, shapeData.width, shapeData.height);
              break;
            case "circle":
              shape = new Circle(shapeData.centerX, shapeData.centerY, shapeData.radius);
              break;
            default:
              console.warn(`Unknown shape type: ${shapeData.type}`);
              return;
          }

          if (shapeData.color) shape.setColor(shapeData.color);
          if (shapeData.lineWidth) shape.setLineWidth(shapeData.lineWidth);

          shapesRef.current.push(shape);
        });

        // Restore canvas dimensions if available
        if (projectData.canvas) {
          if (projectData.canvas.virtualWidth && projectData.canvas.virtualHeight) {
            resizeVirtualCanvas(projectData.canvas.virtualWidth, projectData.canvas.virtualHeight);
          }
        }

        // Restore viewport if available
        if (projectData.viewport) {
          if (projectData.viewport.zoom) {
            viewportRef.current.setZoom(projectData.viewport.zoom);
          }
          if (projectData.viewport.position) {
            viewportRef.current.position.x = projectData.viewport.position.x;
            viewportRef.current.position.y = projectData.viewport.position.y;
          }
        }

        // Restore settings if available
        if (projectData.settings) {
          if (projectData.settings.currentTool) setCurrentTool(projectData.settings.currentTool);
          if (projectData.settings.currentColor) setCurrentColor(projectData.settings.currentColor);
          if (projectData.settings.lineWidth) setLineWidth(projectData.settings.lineWidth);
        }

        // Restore loaded image if available (supports both old ppmImage and new loadedImage formats)
        const imageToRestore = projectData.loadedImage || projectData.ppmImage;
        if (imageToRestore) {
          const imageData = {
            width: imageToRestore.width,
            height: imageToRestore.height,
            format: imageToRestore.format,
            maxVal: imageToRestore.maxVal,
            data: new Uint8ClampedArray(imageToRestore.data),
            originalSize: imageToRestore.originalSize,
            originalFormat: imageToRestore.originalFormat || "ppm",
          };

          const imageLoader = new ImageLoader();
          setLoadedImage({
            data: imageData,
            imageData: imageLoader.createImageData(imageData, ctxRef.current),
            info: imageToRestore.info,
            originalSize: imageToRestore.originalSize,
            originalFormat: imageData.originalFormat,
          });

          if (imageToRestore.position) {
            const newImagePos = {
              x: imageToRestore.position.x,
              y: imageToRestore.position.y,
            };
            setImagePosition(newImagePos);
            imagePositionRef.current = newImagePos;
          }

          console.log(
            `Restored ${imageData.originalFormat.toUpperCase()} image: ${imageData.width}x${imageData.height}`
          );
        }

        // Update UI and redraw
        setShapeCount(shapesRef.current.length);
        if (selectionToolRef.current) {
          selectionToolRef.current.shapes = shapesRef.current;
        }
        if (zoomToolRef.current) {
          zoomToolRef.current.updateShapes(shapesRef.current);
        }
        drawCanvas();

        console.log(`Project loaded successfully: ${shapesRef.current.length} shapes`);
      } catch (error) {
        console.error("Error loading project:", error);
        alert("Error loading project: " + error.message);
      }
    };

    reader.readAsText(file);
    // Clear the input value so the same file can be loaded again
    event.target.value = "";
  };

  const handleLoadPPMImage = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const isJPG = fileName.endsWith(".jpg") || fileName.endsWith(".jpeg");
    const isPPM = fileName.endsWith(".ppm");

    if (!isPPM && !isJPG) {
      const ext = fileName.split(".").pop() || "brak rozszerzenia";
      alert(`Nieobsługiwany format pliku: .${ext}\n\nObsługiwane formaty:\n- .ppm (P3, P6)\n- .jpg, .jpeg`);
      return;
    }

    try {
      const imageLoader = new ImageLoader();
      console.log(`Wczytywanie pliku: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);

      const fileInfo = await imageLoader.getFileInfo(file);
      console.log(`Format: ${fileInfo.format}, Wymiary: ${fileInfo.width}x${fileInfo.height}`);

      const imageData = await imageLoader.loadImage(file);

      // Resize virtual canvas if image is larger
      let newVirtualWidth = virtualWidth;
      let newVirtualHeight = virtualHeight;
      let canvasResized = false;

      if (imageData.width > virtualWidth || imageData.height > virtualHeight) {
        const padding = 20;
        newVirtualWidth = Math.max(virtualWidth, imageData.width + padding * 2);
        newVirtualHeight = Math.max(virtualHeight, imageData.height + padding * 2);
        canvasResized = true;

        console.log(`Rozszerzanie wirtualnego płótna: ${newVirtualWidth}x${newVirtualHeight}`);
        resizeVirtualCanvas(newVirtualWidth, newVirtualHeight);
      }

      setLoadedImage({
        data: imageData,
        imageData: imageLoader.createImageData(imageData, ctxRef.current),
        info: fileInfo,
        canvasResized: canvasResized,
        originalFormat: imageData.originalFormat,
      });

      const newImagePos = {
        x: Math.floor((newVirtualWidth - imageData.width) / 2),
        y: Math.floor((newVirtualHeight - imageData.height) / 2),
      };
      setImagePosition(newImagePos);
      imagePositionRef.current = newImagePos;

      drawCanvas();

      console.log(`Obraz wczytany pomyślnie: ${imageData.format} ${imageData.width}x${imageData.height}`);

      const formatName = imageData.originalFormat === "ppm" ? `PPM ${imageData.format}` : "JPEG";
      alert(
        `Obraz wczytany pomyślnie!\n\nFormat: ${formatName}\nWymiary: ${imageData.width}x${
          imageData.height
        }\nRozmiar pliku: ${(file.size / 1024).toFixed(2)} KB`
      );
    } catch (error) {
      console.error("Błąd wczytywania obrazu:", error);

      let errorMsg = "Błąd wczytywania obrazu:\n\n" + error.message;

      if (error.message.includes("Nieobsługiwany format")) {
        errorMsg += "\n\nSprawdź, czy plik ma odpowiednie rozszerzenie (.ppm, .jpg, .jpeg).";
      } else if (error.message.includes("Nieprawidłowy nagłówek") || error.message.includes("Nieprawidłowy plik")) {
        errorMsg += "\n\nPlik może być uszkodzony lub w złym formacie.";
      } else if (error.message.includes("zbyt duży")) {
        errorMsg += "\n\nSpróbuj wczytać mniejszy obraz.";
      } else if (error.message.includes("Niewystarczające dane")) {
        errorMsg += "\n\nPlik jest niekompletny lub uszkodzony.";
      }

      alert(errorMsg);
    }

    event.target.value = "";
  };

  const clearLoadedImage = () => {
    setLoadedImage(null);
    const newImagePos = {x: 0, y: 0};
    setImagePosition(newImagePos);
    imagePositionRef.current = newImagePos;
    drawCanvas();
  };

  const resizeVirtualCanvas = (newWidth, newHeight) => {
    console.log(`Resizing virtual canvas from ${virtualWidth}x${virtualHeight} to ${newWidth}x${newHeight}`);

    const oldPixelBuffer = pixelBufferRef.current;
    const oldWidth = virtualWidth;
    const oldHeight = virtualHeight;

    setVirtualWidth(newWidth);
    setVirtualHeight(newHeight);

    const newPixelBuffer = new PixelBuffer(newWidth, newHeight);

    if (oldPixelBuffer && oldWidth > 0 && oldHeight > 0) {
      for (let y = 0; y < Math.min(oldHeight, newHeight); y++) {
        for (let x = 0; x < Math.min(oldWidth, newWidth); x++) {
          const pixel = oldPixelBuffer.getPixel(x, y);
          if (pixel) {
            newPixelBuffer.setPixel(x, y, pixel.r, pixel.g, pixel.b, pixel.a);
          }
        }
      }
    }

    pixelBufferRef.current = newPixelBuffer;

    viewportRef.current.virtualWidth = newWidth;
    viewportRef.current.virtualHeight = newHeight;

    setTimeout(() => {
      drawCanvas();
    }, 0);
  };

  const startPlacementMode = (tool) => {
    setPlacementMode(true);
    setPlacementTool(tool);
    setMode("place");
    setPlacementPreview(null);
  };

  const exitPlacementMode = () => {
    setPlacementMode(false);
    setPlacementTool(null);
    setMode("draw");
    setPlacementPreview(null);
  };

  const createParametricLine = () => {
    startPlacementMode("line");
  };

  const createParametricRectangle = () => {
    startPlacementMode("rectangle");
  };

  const createParametricCircle = () => {
    startPlacementMode("circle");
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
        backgroundColor: "#f8f9fa",
      }}
    >
      {/* Top Toolbar */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "10px",
          padding: "10px",
          backgroundColor: "#f5f5f5",
          borderBottom: "1px solid #ddd",
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: "50px",
        }}
      >
        {/* Drawing Tools */}
        <div style={{display: "flex", gap: "5px", alignItems: "center", flexWrap: "wrap"}}>
          <span style={{fontSize: "12px", fontWeight: "bold", marginRight: "5px"}}>Tools:</span>
          <button
            onClick={() => handleToolChange("line")}
            style={{
              padding: "5px 10px",
              fontSize: "11px",
              backgroundColor: currentTool === "line" && mode === "draw" ? "#007bff" : "#fff",
              color: currentTool === "line" && mode === "draw" ? "#fff" : "#333",
              border: "1px solid #ddd",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            📏 Line
          </button>
          <button
            onClick={() => handleToolChange("rectangle")}
            style={{
              padding: "5px 10px",
              fontSize: "11px",
              backgroundColor: currentTool === "rectangle" && mode === "draw" ? "#007bff" : "#fff",
              color: currentTool === "rectangle" && mode === "draw" ? "#fff" : "#333",
              border: "1px solid #ddd",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            ⬜ Rect
          </button>
          <button
            onClick={() => handleToolChange("circle")}
            style={{
              padding: "5px 10px",
              fontSize: "11px",
              backgroundColor: currentTool === "circle" && mode === "draw" ? "#007bff" : "#fff",
              color: currentTool === "circle" && mode === "draw" ? "#fff" : "#333",
              border: "1px solid #ddd",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            ⭕ Circle
          </button>
          <button
            onClick={() => handleModeChange("select")}
            style={{
              padding: "5px 10px",
              fontSize: "11px",
              backgroundColor: mode === "select" ? "#17a2b8" : "#fff",
              color: mode === "select" ? "#fff" : "#333",
              border: "1px solid #ddd",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            👆 Select
          </button>
          <button
            onClick={() => handleModeChange("pan")}
            style={{
              padding: "5px 10px",
              fontSize: "11px",
              backgroundColor: mode === "pan" ? "#28a745" : "#fff",
              color: mode === "pan" ? "#fff" : "#333",
              border: "1px solid #ddd",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            ✋ Pan
          </button>
        </div>

        {/* Line Width Controls */}
        <div style={{display: "flex", gap: "10px", alignItems: "center"}}>
          <span style={{fontSize: "12px", fontWeight: "bold"}}>Width:</span>
          <input
            type="range"
            min="1"
            max="10"
            value={lineWidth}
            onChange={(e) => setLineWidth(parseInt(e.target.value))}
            style={{width: "80px"}}
          />
          <span style={{fontSize: "11px", color: "#666", minWidth: "25px"}}>{lineWidth}px</span>
        </div>

        {/* Color Picker */}
        <div style={{display: "flex", gap: "10px", alignItems: "center"}}>
          <span style={{fontSize: "12px", fontWeight: "bold"}}>Color:</span>
          <input
            type="color"
            value={currentColor}
            onChange={(e) => setCurrentColor(e.target.value)}
            style={{
              width: "40px",
              height: "30px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              cursor: "pointer",
              padding: "0",
            }}
          />
          <div
            style={{
              width: "12px",
              height: "12px",
              backgroundColor: currentColor,
              border: "1px solid #ccc",
              borderRadius: "2px",
            }}
          ></div>
          <button
            onClick={() => setShowColorConverter(!showColorConverter)}
            style={{
              padding: "4px 8px",
              fontSize: "11px",
              backgroundColor: showColorConverter ? "#007bff" : "#6c757d",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
            title="RGB ↔ CMYK Converter"
          >
            🎨 RGB/CMYK
          </button>
          <button
            onClick={() => setShowRGBCube(!showRGBCube)}
            style={{
              padding: "4px 8px",
              fontSize: "11px",
              backgroundColor: showRGBCube ? "#28a745" : "#6c757d",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
            title="Kostka RGB 3D"
          >
            🧊 RGB Cube
          </button>
          <button
            onClick={() => setShowPointTransformations(!showPointTransformations)}
            style={{
              padding: "4px 8px",
              fontSize: "11px",
              backgroundColor: showPointTransformations ? "#17a2b8" : "#6c757d",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
            title="Przekształcenia punktowe"
          >
            ⚡ Transformacje
          </button>
          <button
            onClick={() => setShowImageFilters(!showImageFilters)}
            style={{
              padding: "4px 8px",
              fontSize: "11px",
              backgroundColor: showImageFilters ? "#fd7e14" : "#6c757d",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
            title="Filtry jakości obrazu"
          >
            🔧 Filtry
          </button>
          <button
            onClick={() => setShowHistogramAnalysis(!showHistogramAnalysis)}
            style={{
              padding: "4px 8px",
              fontSize: "11px",
              backgroundColor: showHistogramAnalysis ? "#28a745" : "#6c757d",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
            title="Analiza histogramu"
          >
            📊 Histogram
          </button>
          <button
            onClick={() => setShowBinarizationMethods(!showBinarizationMethods)}
            style={{
              padding: "4px 8px",
              fontSize: "11px",
              backgroundColor: showBinarizationMethods ? "#dc3545" : "#6c757d",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
            title="Metody binaryzacji"
          >
            ⚫⚪ Binaryzacja
          </button>
        </div>

        {/* Zoom Controls */}
        <div style={{display: "flex", gap: "5px", alignItems: "center"}}>
          <span style={{fontSize: "12px", fontWeight: "bold", marginRight: "5px"}}>Zoom:</span>
          <button
            onClick={handleZoomOut}
            style={{
              padding: "4px 8px",
              fontSize: "11px",
              backgroundColor: "#fff",
              border: "1px solid #ddd",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            🔍➖
          </button>
          <span style={{fontSize: "11px", color: "#666", minWidth: "40px", textAlign: "center"}}>
            {zoom.toFixed(1)}x
          </span>
          <button
            onClick={handleZoomIn}
            style={{
              padding: "4px 8px",
              fontSize: "11px",
              backgroundColor: "#fff",
              border: "1px solid #ddd",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            🔍➕
          </button>
          <button
            onClick={handleResetView}
            style={{
              padding: "4px 8px",
              fontSize: "11px",
              backgroundColor: "#fff",
              border: "1px solid #ddd",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            🎯
          </button>
          <button
            onClick={handleFitToContent}
            style={{
              padding: "4px 8px",
              fontSize: "11px",
              backgroundColor: "#fff",
              border: "1px solid #ddd",
              borderRadius: "4px",
              cursor: "pointer",
            }}
            title="Fit to Content"
          >
            📐
          </button>
        </div>

        {/* Canvas Actions */}
        <div style={{display: "flex", gap: "5px", alignItems: "center", flexWrap: "wrap"}}>
          <button
            onClick={handleSaveProject}
            style={{
              padding: "5px 10px",
              fontSize: "11px",
              backgroundColor: "#28a745",
              color: "#fff",
              border: "1px solid #28a745",
              borderRadius: "4px",
              cursor: "pointer",
            }}
            title="Save project as .psh file"
          >
            💾 Save
          </button>
          <label
            style={{
              padding: "5px 10px",
              fontSize: "11px",
              backgroundColor: "#007bff",
              color: "#fff",
              border: "1px solid #007bff",
              borderRadius: "4px",
              cursor: "pointer",
              display: "inline-block",
            }}
            title="Load project from .psh file"
          >
            📁 Load
            <input type="file" accept=".psh" onChange={handleLoadProject} style={{display: "none"}} />
          </label>
          <label
            style={{
              padding: "5px 10px",
              fontSize: "11px",
              backgroundColor: "#6f42c1",
              color: "#fff",
              border: "1px solid #6f42c1",
              borderRadius: "4px",
              cursor: "pointer",
              display: "inline-block",
            }}
            title="Load image (PPM, JPG, JPEG)"
          >
            🖼️ Load Image
            <input type="file" accept=".ppm,.jpg,.jpeg" onChange={handleLoadPPMImage} style={{display: "none"}} />
          </label>
          <button
            onClick={handleSaveAsJPG}
            style={{
              padding: "5px 10px",
              fontSize: "11px",
              backgroundColor: "#17a2b8",
              color: "#fff",
              border: "1px solid #17a2b8",
              borderRadius: "4px",
              cursor: "pointer",
            }}
            title={`Save drawing as JPG (Quality: ${Math.round(jpgQuality * 100)}%)`}
          >
            📷 Save JPG
          </button>
          <div style={{display: "flex", alignItems: "center", gap: "5px"}}>
            <label style={{fontSize: "11px", color: "#333"}}>Quality:</label>
            <input
              type="range"
              min="10"
              max="100"
              value={Math.round(jpgQuality * 100)}
              onChange={(e) => setJpgQuality(parseInt(e.target.value) / 100)}
              style={{width: "80px"}}
              title="JPG compression quality (10-100%)"
            />
            <span style={{fontSize: "11px", color: "#666", minWidth: "35px"}}>{Math.round(jpgQuality * 100)}%</span>
          </div>
          {loadedImage && (
            <button
              onClick={clearLoadedImage}
              style={{
                padding: "5px 10px",
                fontSize: "11px",
                backgroundColor: "#fd7e14",
                color: "#fff",
                border: "1px solid #fd7e14",
                borderRadius: "4px",
                cursor: "pointer",
              }}
              title="Clear loaded image"
            >
              🗑️ Clear Image
            </button>
          )}
          <button
            onClick={clearAllShapes}
            style={{
              padding: "5px 10px",
              fontSize: "11px",
              backgroundColor: "#dc3545",
              color: "#fff",
              border: "1px solid #dc3545",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            🗑️ Clear
          </button>
          <span style={{fontSize: "11px", color: "#666"}}>Shapes: {shapeCount}</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div
        style={{
          display: "flex",
          flex: 1,
          overflow: "hidden",
          gap: "10px",
          padding: "10px",
        }}
      >
        {/* Canvas Area */}
        <div
          style={{flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center"}}
        >
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            style={{
              border: "2px solid #333",
              borderRadius: "4px",
              cursor: mode === "pan" ? "grab" : mode === "select" ? cursor : mode === "place" ? "copy" : "crosshair",
              boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
              maxWidth: "100%",
              maxHeight: "100%",
            }}
          />

          {/* Canvas Info */}
          <div
            style={{
              marginTop: "10px",
              fontSize: "11px",
              color: "#666",
              backgroundColor: "#f8f9fa",
              padding: "8px 12px",
              borderRadius: "4px",
              border: "1px solid #dee2e6",
              textAlign: "center",
            }}
          >
            <span style={{marginRight: "15px"}}>
              Canvas: {canvasWidth}x{canvasHeight}
            </span>
            <span style={{marginRight: "15px"}}>
              Virtual: {virtualWidth}x{virtualHeight}
            </span>
            <span style={{marginRight: "15px"}}>
              Position: {position.x.toFixed(0)}, {position.y.toFixed(0)}
            </span>
            <span>Grid: {zoom >= 8 ? "Visible" : "Hidden"}</span>
          </div>
        </div>

        {/* Right Sidebar - Properties Panel */}
        <div
          style={{
            width: "250px",
            backgroundColor: "#f5f5f5",
            padding: "15px",
            borderRadius: "8px",
            border: "1px solid #ddd",
            overflowY: "auto",
            flexShrink: 0,
          }}
        >
          <h3 style={{margin: "0 0 15px 0", fontSize: "16px"}}>Properties</h3>

          {/* Selected Shape Properties */}
          {selectedShape && (
            <div style={{marginBottom: "20px"}}>
              <h4 style={{margin: "0 0 10px 0", fontSize: "14px", color: "#666"}}>Selected Shape</h4>
              <div
                style={{
                  padding: "10px",
                  backgroundColor: "#e3f2fd",
                  borderRadius: "4px",
                  border: "1px solid #2196f3",
                  marginBottom: "10px",
                }}
              >
                <div style={{fontSize: "12px", marginBottom: "8px"}}>
                  <strong>Type:</strong> {selectedShape.type}
                </div>
                <div style={{fontSize: "12px", marginBottom: "8px"}}>
                  <strong>Current Width:</strong> {selectedShape.lineWidth}px
                </div>
                <div style={{marginBottom: "5px"}}>
                  <label style={{fontSize: "12px", fontWeight: "bold"}}>Line Width:</label>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={selectedShape.lineWidth}
                  onChange={(e) => handleSelectedShapeLineWidthChange(parseInt(e.target.value))}
                  style={{width: "100%", marginBottom: "5px"}}
                />
                <div style={{textAlign: "center", fontSize: "11px", color: "#1976d2", marginBottom: "10px"}}>
                  Adjust selected shape width
                </div>

                <div style={{marginBottom: "5px"}}>
                  <label style={{fontSize: "12px", fontWeight: "bold"}}>Color:</label>
                </div>
                <div style={{display: "flex", gap: "10px", alignItems: "center", marginBottom: "5px"}}>
                  <input
                    type="color"
                    value={selectedShape.color}
                    onChange={(e) => handleSelectedShapeColorChange(e.target.value)}
                    style={{
                      width: "40px",
                      height: "30px",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      cursor: "pointer",
                      padding: "0",
                    }}
                  />
                  <div
                    style={{
                      width: "20px",
                      height: "20px",
                      backgroundColor: selectedShape.color,
                      border: "1px solid #ccc",
                      borderRadius: "2px",
                    }}
                  ></div>
                  <span style={{fontSize: "11px", color: "#666"}}>{selectedShape.color}</span>
                </div>
                <div style={{textAlign: "center", fontSize: "11px", color: "#1976d2"}}>Adjust selected shape color</div>
              </div>
            </div>
          )}

          {/* Parametric Shape Creation */}
          <div style={{marginBottom: "20px"}}>
            <h4 style={{margin: "0 0 10px 0", fontSize: "14px", color: "#666"}}>Create with Parameters</h4>

            {/* Line Parameters */}
            <div style={{marginBottom: "15px"}}>
              <h5 style={{margin: "0 0 8px 0", fontSize: "13px", color: "#888"}}>Line</h5>
              <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px", marginBottom: "8px"}}>
                <div>
                  <label style={{fontSize: "11px"}}>Start X:</label>
                  <input
                    type="number"
                    value={lineParams.startX}
                    onChange={(e) => setLineParams({...lineParams, startX: parseInt(e.target.value) || 0})}
                    style={{width: "100%", fontSize: "11px", padding: "2px"}}
                  />
                </div>
                <div>
                  <label style={{fontSize: "11px"}}>Start Y:</label>
                  <input
                    type="number"
                    value={lineParams.startY}
                    onChange={(e) => setLineParams({...lineParams, startY: parseInt(e.target.value) || 0})}
                    style={{width: "100%", fontSize: "11px", padding: "2px"}}
                  />
                </div>
                <div>
                  <label style={{fontSize: "11px"}}>End X:</label>
                  <input
                    type="number"
                    value={lineParams.endX}
                    onChange={(e) => setLineParams({...lineParams, endX: parseInt(e.target.value) || 0})}
                    style={{width: "100%", fontSize: "11px", padding: "2px"}}
                  />
                </div>
                <div>
                  <label style={{fontSize: "11px"}}>End Y:</label>
                  <input
                    type="number"
                    value={lineParams.endY}
                    onChange={(e) => setLineParams({...lineParams, endY: parseInt(e.target.value) || 0})}
                    style={{width: "100%", fontSize: "11px", padding: "2px"}}
                  />
                </div>
              </div>
              <button
                onClick={createParametricLine}
                style={{
                  width: "100%",
                  padding: "4px 8px",
                  fontSize: "11px",
                  backgroundColor: placementTool === "line" ? "#28a745" : "#007bff",
                  color: "#fff",
                  border: `1px solid ${placementTool === "line" ? "#28a745" : "#007bff"}`,
                  borderRadius: "3px",
                  cursor: "pointer",
                }}
              >
                {placementTool === "line" ? "Click to Place" : "Place Line"}
              </button>
            </div>

            {/* Rectangle Parameters */}
            <div style={{marginBottom: "15px"}}>
              <h5 style={{margin: "0 0 8px 0", fontSize: "13px", color: "#888"}}>Rectangle</h5>
              <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px", marginBottom: "8px"}}>
                <div>
                  <label style={{fontSize: "11px"}}>X:</label>
                  <input
                    type="number"
                    value={rectParams.x}
                    onChange={(e) => setRectParams({...rectParams, x: parseInt(e.target.value) || 0})}
                    style={{width: "100%", fontSize: "11px", padding: "2px"}}
                  />
                </div>
                <div>
                  <label style={{fontSize: "11px"}}>Y:</label>
                  <input
                    type="number"
                    value={rectParams.y}
                    onChange={(e) => setRectParams({...rectParams, y: parseInt(e.target.value) || 0})}
                    style={{width: "100%", fontSize: "11px", padding: "2px"}}
                  />
                </div>
                <div>
                  <label style={{fontSize: "11px"}}>Width:</label>
                  <input
                    type="number"
                    value={rectParams.width}
                    onChange={(e) => setRectParams({...rectParams, width: parseInt(e.target.value) || 1})}
                    style={{width: "100%", fontSize: "11px", padding: "2px"}}
                  />
                </div>
                <div>
                  <label style={{fontSize: "11px"}}>Height:</label>
                  <input
                    type="number"
                    value={rectParams.height}
                    onChange={(e) => setRectParams({...rectParams, height: parseInt(e.target.value) || 1})}
                    style={{width: "100%", fontSize: "11px", padding: "2px"}}
                  />
                </div>
              </div>
              <button
                onClick={createParametricRectangle}
                style={{
                  width: "100%",
                  padding: "4px 8px",
                  fontSize: "11px",
                  backgroundColor: placementTool === "rectangle" ? "#28a745" : "#007bff",
                  color: "#fff",
                  border: `1px solid ${placementTool === "rectangle" ? "#28a745" : "#007bff"}`,
                  borderRadius: "3px",
                  cursor: "pointer",
                }}
              >
                {placementTool === "rectangle" ? "Click to Place" : "Place Rectangle"}
              </button>
            </div>

            {/* Circle Parameters */}
            <div style={{marginBottom: "15px"}}>
              <h5 style={{margin: "0 0 8px 0", fontSize: "13px", color: "#888"}}>Circle</h5>
              <div style={{display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "5px", marginBottom: "8px"}}>
                <div>
                  <label style={{fontSize: "11px"}}>Center X:</label>
                  <input
                    type="number"
                    value={circleParams.centerX}
                    onChange={(e) => setCircleParams({...circleParams, centerX: parseInt(e.target.value) || 0})}
                    style={{width: "100%", fontSize: "11px", padding: "2px"}}
                  />
                </div>
                <div>
                  <label style={{fontSize: "11px"}}>Center Y:</label>
                  <input
                    type="number"
                    value={circleParams.centerY}
                    onChange={(e) => setCircleParams({...circleParams, centerY: parseInt(e.target.value) || 0})}
                    style={{width: "100%", fontSize: "11px", padding: "2px"}}
                  />
                </div>
                <div>
                  <label style={{fontSize: "11px"}}>Radius:</label>
                  <input
                    type="number"
                    value={circleParams.radius}
                    onChange={(e) => setCircleParams({...circleParams, radius: parseInt(e.target.value) || 1})}
                    style={{width: "100%", fontSize: "11px", padding: "2px"}}
                  />
                </div>
              </div>
              <button
                onClick={createParametricCircle}
                style={{
                  width: "100%",
                  padding: "4px 8px",
                  fontSize: "11px",
                  backgroundColor: placementTool === "circle" ? "#28a745" : "#007bff",
                  color: "#fff",
                  border: `1px solid ${placementTool === "circle" ? "#28a745" : "#007bff"}`,
                  borderRadius: "3px",
                  cursor: "pointer",
                }}
              >
                {placementTool === "circle" ? "Click to Place" : "Place Circle"}
              </button>
            </div>

            {/* Cancel placement mode button */}
            {placementMode && (
              <div style={{marginTop: "10px", textAlign: "center"}}>
                <button
                  onClick={exitPlacementMode}
                  style={{
                    padding: "6px 12px",
                    fontSize: "11px",
                    backgroundColor: "#dc3545",
                    color: "#fff",
                    border: "1px solid #dc3545",
                    borderRadius: "3px",
                    cursor: "pointer",
                  }}
                >
                  ❌ Cancel Placement
                </button>
              </div>
            )}
          </div>

          {/* Status Info */}
          <div style={{marginBottom: "20px"}}>
            <h4 style={{margin: "0 0 10px 0", fontSize: "14px", color: "#666"}}>Status</h4>
            <div
              style={{
                padding: "10px",
                backgroundColor: placementMode ? "#fff3cd" : "#e9ecef",
                borderRadius: "4px",
                fontSize: "12px",
                border: placementMode ? "1px solid #ffeaa7" : "none",
              }}
            >
              <div>
                <strong>Mode:</strong> {mode} {placementMode && placementTool && `(Placing ${placementTool})`}
              </div>
              <div>
                <strong>Tool:</strong> {currentTool}
              </div>
              <div>
                <strong>Line Width:</strong> {lineWidth}px
              </div>
              <div>
                <strong>Zoom:</strong> {zoom.toFixed(1)}x
              </div>
              <div>
                <strong>Shapes:</strong> {shapeCount}
              </div>
              {loadedImage && (
                <div>
                  <strong>PPM Image:</strong> {loadedImage.info.format} {loadedImage.data.width}x
                  {loadedImage.data.height}
                </div>
              )}
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div>
            <h4 style={{margin: "0 0 10px 0", fontSize: "14px", color: "#666"}}>Shortcuts</h4>
            <div style={{fontSize: "11px", color: "#666", lineHeight: "1.4"}}>
              <div>
                <strong>S</strong> - Select mode
              </div>
              <div>
                <strong>L</strong> - Line tool
              </div>
              <div>
                <strong>R</strong> - Rectangle tool
              </div>
              <div>
                <strong>C</strong> - Circle tool
              </div>
              <div>
                <strong>P</strong> - Pan mode
              </div>
              <div>
                <strong>+/-</strong> - Zoom in/out
              </div>
              <div>
                <strong>0</strong> - Reset view
              </div>
              <div>
                <strong>Mouse Wheel</strong> - Zoom
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RGB Hover Display */}
      {hoverRGB && (
        <div
          style={{
            position: "fixed",
            left: hoverPosition.x + 10,
            top: hoverPosition.y - 30,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            color: "white",
            padding: "4px 8px",
            borderRadius: "4px",
            fontSize: "11px",
            fontFamily: "monospace",
            pointerEvents: "none",
            zIndex: 1000,
            whiteSpace: "nowrap",
          }}
        >
          RGB({hoverRGB.r}, {hoverRGB.g}, {hoverRGB.b}) A:{hoverRGB.a}
        </div>
      )}

      {/* Color Space Converter */}
      {showColorConverter && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            zIndex: 1000,
            maxHeight: "80vh",
            overflowY: "auto",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            borderRadius: "8px",
          }}
        >
          <div style={{position: "relative"}}>
            <button
              onClick={() => setShowColorConverter(false)}
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                background: "#dc3545",
                color: "white",
                border: "none",
                borderRadius: "50%",
                width: "25px",
                height: "25px",
                cursor: "pointer",
                fontSize: "14px",
                zIndex: 1001,
              }}
              title="Zamknij konwerter"
            >
              ×
            </button>
            <ColorSpaceConverter onColorChange={handleColorConverterChange} initialColor={currentColor} />
          </div>
        </div>
      )}

      {/* RGB Cube 3D Modal */}
      {showRGBCube && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            left: "20px",
            backgroundColor: "white",
            border: "1px solid #ccc",
            zIndex: 1000,
            maxHeight: "90vh",
            overflowY: "auto",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            borderRadius: "8px",
          }}
        >
          <div style={{position: "relative"}}>
            <button
              onClick={() => setShowRGBCube(false)}
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                background: "#dc3545",
                color: "white",
                border: "none",
                borderRadius: "50%",
                width: "25px",
                height: "25px",
                cursor: "pointer",
                fontSize: "14px",
                zIndex: 1001,
              }}
              title="Zamknij kostkę RGB"
            >
              ×
            </button>
            <RGBCube3D onColorSelect={handleRGBCubeColorSelect} />
          </div>
        </div>
      )}

      {/* Point Transformations Modal */}
      {showPointTransformations && (
        <>
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              zIndex: 999,
            }}
            onClick={() => setShowPointTransformations(false)}
          />
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              backgroundColor: "white",
              border: "1px solid #ccc",
              zIndex: 1000,
              maxHeight: "90vh",
              maxWidth: "90vw",
              overflowY: "auto",
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              borderRadius: "8px",
            }}
          >
            <div style={{position: "relative"}}>
              <button
                onClick={() => setShowPointTransformations(false)}
                style={{
                  position: "absolute",
                  top: "10px",
                  right: "10px",
                  background: "#dc3545",
                  color: "white",
                  border: "none",
                  borderRadius: "50%",
                  width: "25px",
                  height: "25px",
                  cursor: "pointer",
                  fontSize: "14px",
                  zIndex: 1001,
                }}
                title="Zamknij transformacje"
              >
                ×
              </button>
              <PointTransformations loadedImage={loadedImage?.data} onImageTransformed={handleImageTransformed} />
            </div>
          </div>
        </>
      )}

      {/* Image Filters Modal */}
      {showImageFilters && (
        <>
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              zIndex: 999,
            }}
            onClick={() => setShowImageFilters(false)}
          />
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              backgroundColor: "white",
              border: "1px solid #ccc",
              zIndex: 1000,
              maxHeight: "90vh",
              maxWidth: "90vw",
              overflowY: "auto",
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              borderRadius: "8px",
            }}
          >
            <div style={{position: "relative"}}>
              <button
                onClick={() => setShowImageFilters(false)}
                style={{
                  position: "absolute",
                  top: "10px",
                  right: "10px",
                  background: "#dc3545",
                  color: "white",
                  border: "none",
                  borderRadius: "50%",
                  width: "25px",
                  height: "25px",
                  cursor: "pointer",
                  fontSize: "14px",
                  zIndex: 1001,
                }}
                title="Zamknij filtry"
              >
                ×
              </button>
              <ImageFilters loadedImage={loadedImage?.data} onImageTransformed={handleImageTransformed} />
            </div>
          </div>
        </>
      )}

      {/* Histogram Analysis Modal */}
      {showHistogramAnalysis && (
        <>
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              zIndex: 999,
            }}
            onClick={() => setShowHistogramAnalysis(false)}
          />
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              backgroundColor: "white",
              border: "1px solid #ccc",
              zIndex: 1000,
              maxHeight: "90vh",
              maxWidth: "90vw",
              overflowY: "auto",
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              borderRadius: "8px",
            }}
          >
            <div style={{position: "relative"}}>
              <button
                onClick={() => setShowHistogramAnalysis(false)}
                style={{
                  position: "absolute",
                  top: "10px",
                  right: "10px",
                  background: "#dc3545",
                  color: "white",
                  border: "none",
                  borderRadius: "50%",
                  width: "25px",
                  height: "25px",
                  cursor: "pointer",
                  fontSize: "14px",
                  zIndex: 1001,
                }}
                title="Zamknij histogram"
              >
                ×
              </button>
              <HistogramAnalysis loadedImage={loadedImage?.data} onImageTransformed={handleImageTransformed} />
            </div>
          </div>
        </>
      )}

      {/* Binarization Methods Modal */}
      {showBinarizationMethods && (
        <>
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              zIndex: 999,
            }}
            onClick={() => setShowBinarizationMethods(false)}
          />
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              backgroundColor: "white",
              border: "1px solid #ccc",
              zIndex: 1000,
              maxHeight: "90vh",
              maxWidth: "90vw",
              overflowY: "auto",
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              borderRadius: "8px",
            }}
          >
            <div style={{position: "relative"}}>
              <button
                onClick={() => setShowBinarizationMethods(false)}
                style={{
                  position: "absolute",
                  top: "10px",
                  right: "10px",
                  background: "#dc3545",
                  color: "white",
                  border: "none",
                  borderRadius: "50%",
                  width: "25px",
                  height: "25px",
                  cursor: "pointer",
                  fontSize: "14px",
                  zIndex: 1001,
                }}
                title="Zamknij binaryzację"
              >
                ×
              </button>
              <BinarizationMethods loadedImage={loadedImage?.data} onImageTransformed={handleImageTransformed} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Canvas;
