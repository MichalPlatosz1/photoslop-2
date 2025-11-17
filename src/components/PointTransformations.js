import React, {useState, useRef, useEffect, useCallback} from "react";

const PointTransformations = ({loadedImage, onImageTransformed, onImageUpdate}) => {
  const canvasRef = useRef(null);
  const originalImageRef = useRef(null);

  // Transformation parameters state
  const [transformParams, setTransformParams] = useState({
    add: {r: 0, g: 0, b: 0},
    subtract: {r: 0, g: 0, b: 0},
    multiply: {r: 1, g: 1, b: 1},
    divide: {r: 1, g: 1, b: 1},
    brightness: 0,
    grayscaleMethod: "average",
  });

  // UI state
  const [activeTab, setActiveTab] = useState("add");
  const [isProcessing, setIsProcessing] = useState(false);

  // Display image on canvas
  const displayImage = useCallback((imageData) => {
    const canvas = canvasRef.current;
    if (!canvas || !imageData) return;

    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext("2d");

    const imgData = ctx.createImageData(imageData.width, imageData.height);
    imgData.data.set(imageData.data);
    ctx.putImageData(imgData, 0, 0);
  }, []);

  // Store original image data when component loads or image changes
  useEffect(() => {
    if (loadedImage) {
      originalImageRef.current = {
        data: new Uint8ClampedArray(loadedImage.data),
        width: loadedImage.width,
        height: loadedImage.height,
      };
      displayImage(loadedImage);
    }
  }, [loadedImage, displayImage]);

  // Clamp pixel values to 0-255 range
  const clampPixel = useCallback((value) => Math.max(0, Math.min(255, Math.round(value))), []);

  // Addition transformation
  const applyAddition = useCallback(
    (imageData, addValues) => {
      const result = new Uint8ClampedArray(imageData.data);

      for (let i = 0; i < result.length; i += 4) {
        result[i] = clampPixel(result[i] + addValues.r); // Red
        result[i + 1] = clampPixel(result[i + 1] + addValues.g); // Green
        result[i + 2] = clampPixel(result[i + 2] + addValues.b); // Blue
        // Alpha channel (i + 3) remains unchanged
      }

      return {
        ...imageData,
        data: result,
      };
    },
    [clampPixel]
  );

  // Subtraction transformation
  const applySubtraction = useCallback(
    (imageData, subtractValues) => {
      const result = new Uint8ClampedArray(imageData.data);

      for (let i = 0; i < result.length; i += 4) {
        result[i] = clampPixel(result[i] - subtractValues.r); // Red
        result[i + 1] = clampPixel(result[i + 1] - subtractValues.g); // Green
        result[i + 2] = clampPixel(result[i + 2] - subtractValues.b); // Blue
        // Alpha channel (i + 3) remains unchanged
      }

      return {
        ...imageData,
        data: result,
      };
    },
    [clampPixel]
  );

  // Multiplication transformation
  const applyMultiplication = useCallback(
    (imageData, multiplyValues) => {
      const result = new Uint8ClampedArray(imageData.data);

      for (let i = 0; i < result.length; i += 4) {
        result[i] = clampPixel(result[i] * multiplyValues.r); // Red
        result[i + 1] = clampPixel(result[i + 1] * multiplyValues.g); // Green
        result[i + 2] = clampPixel(result[i + 2] * multiplyValues.b); // Blue
        // Alpha channel (i + 3) remains unchanged
      }

      return {
        ...imageData,
        data: result,
      };
    },
    [clampPixel]
  );

  // Division transformation
  const applyDivision = useCallback(
    (imageData, divideValues) => {
      const result = new Uint8ClampedArray(imageData.data);

      for (let i = 0; i < result.length; i += 4) {
        // Prevent division by zero
        const rDiv = divideValues.r !== 0 ? divideValues.r : 1;
        const gDiv = divideValues.g !== 0 ? divideValues.g : 1;
        const bDiv = divideValues.b !== 0 ? divideValues.b : 1;

        result[i] = clampPixel(result[i] / rDiv); // Red
        result[i + 1] = clampPixel(result[i + 1] / gDiv); // Green
        result[i + 2] = clampPixel(result[i + 2] / bDiv); // Blue
        // Alpha channel (i + 3) remains unchanged
      }

      return {
        ...imageData,
        data: result,
      };
    },
    [clampPixel]
  );

  // Brightness adjustment
  const applyBrightness = useCallback(
    (imageData, brightnessValue) => {
      const result = new Uint8ClampedArray(imageData.data);

      for (let i = 0; i < result.length; i += 4) {
        result[i] = clampPixel(result[i] + brightnessValue); // Red
        result[i + 1] = clampPixel(result[i + 1] + brightnessValue); // Green
        result[i + 2] = clampPixel(result[i + 2] + brightnessValue); // Blue
        // Alpha channel (i + 3) remains unchanged
      }

      return {
        ...imageData,
        data: result,
      };
    },
    [clampPixel]
  );

  // Grayscale conversion - Average method
  const applyGrayscaleAverage = useCallback(
    (imageData) => {
      const result = new Uint8ClampedArray(imageData.data);

      for (let i = 0; i < result.length; i += 4) {
        const gray = clampPixel((result[i] + result[i + 1] + result[i + 2]) / 3);
        result[i] = gray; // Red
        result[i + 1] = gray; // Green
        result[i + 2] = gray; // Blue
        // Alpha channel (i + 3) remains unchanged
      }

      return {
        ...imageData,
        data: result,
      };
    },
    [clampPixel]
  );

  // Grayscale conversion - Luminance method (weighted average)
  const applyGrayscaleLuminance = useCallback(
    (imageData) => {
      const result = new Uint8ClampedArray(imageData.data);

      for (let i = 0; i < result.length; i += 4) {
        // Standard luminance weights for RGB to grayscale conversion
        const gray = clampPixel(
          0.299 * result[i] + // Red weight
            0.587 * result[i + 1] + // Green weight
            0.114 * result[i + 2] // Blue weight
        );
        result[i] = gray; // Red
        result[i + 1] = gray; // Green
        result[i + 2] = gray; // Blue
        // Alpha channel (i + 3) remains unchanged
      }

      return {
        ...imageData,
        data: result,
      };
    },
    [clampPixel]
  );

  // Grayscale conversion - Lightness method
  const applyGrayscaleLightness = useCallback(
    (imageData) => {
      const result = new Uint8ClampedArray(imageData.data);

      for (let i = 0; i < result.length; i += 4) {
        const max = Math.max(result[i], result[i + 1], result[i + 2]);
        const min = Math.min(result[i], result[i + 1], result[i + 2]);
        const gray = clampPixel((max + min) / 2);

        result[i] = gray; // Red
        result[i + 1] = gray; // Green
        result[i + 2] = gray; // Blue
        // Alpha channel (i + 3) remains unchanged
      }

      return {
        ...imageData,
        data: result,
      };
    },
    [clampPixel]
  );

  // Apply currently visible transformation to parent
  const applyCurrentTransformation = () => {
    if (!originalImageRef.current) return;

    setIsProcessing(true);

    try {
      let transformedImage = {
        data: new Uint8ClampedArray(originalImageRef.current.data),
        width: originalImageRef.current.width,
        height: originalImageRef.current.height,
      };

      switch (activeTab) {
        case "add":
          transformedImage = applyAddition(transformedImage, transformParams.add);
          break;
        case "subtract":
          transformedImage = applySubtraction(transformedImage, transformParams.subtract);
          break;
        case "multiply":
          transformedImage = applyMultiplication(transformedImage, transformParams.multiply);
          break;
        case "divide":
          transformedImage = applyDivision(transformedImage, transformParams.divide);
          break;
        case "brightness":
          transformedImage = applyBrightness(transformedImage, transformParams.brightness);
          break;
        case "grayscale":
          switch (transformParams.grayscaleMethod) {
            case "average":
              transformedImage = applyGrayscaleAverage(transformedImage);
              break;
            case "luminance":
              transformedImage = applyGrayscaleLuminance(transformedImage);
              break;
            case "lightness":
              transformedImage = applyGrayscaleLightness(transformedImage);
              break;
            default:
              transformedImage = applyGrayscaleAverage(transformedImage);
              break;
          }
          break;
        default:
          break;
      }

      if (onImageTransformed) {
        onImageTransformed(transformedImage);
      }
    } catch (error) {
      console.error("Error applying transformation:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Apply selected transformation (kept for backward compatibility, but now just calls applyCurrentTransformation)
  const applyTransformation = () => {
    applyCurrentTransformation();
  };

  // Reset to original image
  const resetTransformation = () => {
    if (originalImageRef.current) {
      const originalData = {
        data: new Uint8ClampedArray(originalImageRef.current.data),
        width: originalImageRef.current.width,
        height: originalImageRef.current.height,
      };
      displayImage(originalData);

      if (onImageTransformed) {
        onImageTransformed(originalData);
      }
    }
  };

  // Update transformation parameters
  const updateTransformParam = (category, param, value) => {
    setTransformParams((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [param]: parseFloat(value),
      },
    }));
  };

  // Auto-apply transformation when parameters change (live preview)
  useEffect(() => {
    if (!originalImageRef.current) return;

    const applyLivePreview = async () => {
      try {
        let transformedImage = {
          data: new Uint8ClampedArray(originalImageRef.current.data),
          width: originalImageRef.current.width,
          height: originalImageRef.current.height,
        };

        switch (activeTab) {
          case "add":
            transformedImage = applyAddition(transformedImage, transformParams.add);
            break;
          case "subtract":
            transformedImage = applySubtraction(transformedImage, transformParams.subtract);
            break;
          case "multiply":
            transformedImage = applyMultiplication(transformedImage, transformParams.multiply);
            break;
          case "divide":
            transformedImage = applyDivision(transformedImage, transformParams.divide);
            break;
          case "brightness":
            transformedImage = applyBrightness(transformedImage, transformParams.brightness);
            break;
          case "grayscale":
            switch (transformParams.grayscaleMethod) {
              case "average":
                transformedImage = applyGrayscaleAverage(transformedImage);
                break;
              case "luminance":
                transformedImage = applyGrayscaleLuminance(transformedImage);
                break;
              case "lightness":
                transformedImage = applyGrayscaleLightness(transformedImage);
                break;
              default:
                transformedImage = applyGrayscaleAverage(transformedImage);
                break;
            }
            break;
          default:
            // No transformation for unknown tabs
            break;
        }

        displayImage(transformedImage);
      } catch (error) {
        console.error("Error applying live preview:", error);
      }
    };

    applyLivePreview();
  }, [
    transformParams,
    activeTab,
    displayImage,
    applyAddition,
    applySubtraction,
    applyMultiplication,
    applyDivision,
    applyBrightness,
    applyGrayscaleAverage,
    applyGrayscaleLuminance,
    applyGrayscaleLightness,
  ]);

  // Render input controls based on active tab
  const renderControls = () => {
    switch (activeTab) {
      case "add":
        return (
          <div className="transform-controls">
            <h4>Dodawanie wartości</h4>
            <div className="control-group">
              <label>Czerwony (+):</label>
              <input
                type="range"
                min="-255"
                max="255"
                value={transformParams.add.r}
                onChange={(e) => updateTransformParam("add", "r", e.target.value)}
              />
              <span>{transformParams.add.r}</span>
            </div>
            <div className="control-group">
              <label>Zielony (+):</label>
              <input
                type="range"
                min="-255"
                max="255"
                value={transformParams.add.g}
                onChange={(e) => updateTransformParam("add", "g", e.target.value)}
              />
              <span>{transformParams.add.g}</span>
            </div>
            <div className="control-group">
              <label>Niebieski (+):</label>
              <input
                type="range"
                min="-255"
                max="255"
                value={transformParams.add.b}
                onChange={(e) => updateTransformParam("add", "b", e.target.value)}
              />
              <span>{transformParams.add.b}</span>
            </div>
          </div>
        );

      case "subtract":
        return (
          <div className="transform-controls">
            <h4>Odejmowanie wartości</h4>
            <div className="control-group">
              <label>Czerwony (-):</label>
              <input
                type="range"
                min="-255"
                max="255"
                value={transformParams.subtract.r}
                onChange={(e) => updateTransformParam("subtract", "r", e.target.value)}
              />
              <span>{transformParams.subtract.r}</span>
            </div>
            <div className="control-group">
              <label>Zielony (-):</label>
              <input
                type="range"
                min="-255"
                max="255"
                value={transformParams.subtract.g}
                onChange={(e) => updateTransformParam("subtract", "g", e.target.value)}
              />
              <span>{transformParams.subtract.g}</span>
            </div>
            <div className="control-group">
              <label>Niebieski (-):</label>
              <input
                type="range"
                min="-255"
                max="255"
                value={transformParams.subtract.b}
                onChange={(e) => updateTransformParam("subtract", "b", e.target.value)}
              />
              <span>{transformParams.subtract.b}</span>
            </div>
          </div>
        );

      case "multiply":
        return (
          <div className="transform-controls">
            <h4>Mnożenie przez wartości</h4>
            <div className="control-group">
              <label>Czerwony (x):</label>
              <input
                type="range"
                min="0"
                max="3"
                step="0.1"
                value={transformParams.multiply.r}
                onChange={(e) => updateTransformParam("multiply", "r", e.target.value)}
              />
              <span>{transformParams.multiply.r.toFixed(1)}</span>
            </div>
            <div className="control-group">
              <label>Zielony (x):</label>
              <input
                type="range"
                min="0"
                max="3"
                step="0.1"
                value={transformParams.multiply.g}
                onChange={(e) => updateTransformParam("multiply", "g", e.target.value)}
              />
              <span>{transformParams.multiply.g.toFixed(1)}</span>
            </div>
            <div className="control-group">
              <label>Niebieski (x):</label>
              <input
                type="range"
                min="0"
                max="3"
                step="0.1"
                value={transformParams.multiply.b}
                onChange={(e) => updateTransformParam("multiply", "b", e.target.value)}
              />
              <span>{transformParams.multiply.b.toFixed(1)}</span>
            </div>
          </div>
        );

      case "divide":
        return (
          <div className="transform-controls">
            <h4>Dzielenie przez wartości</h4>
            <div className="control-group">
              <label>Czerwony (÷):</label>
              <input
                type="range"
                min="0.1"
                max="5"
                step="0.1"
                value={transformParams.divide.r}
                onChange={(e) => updateTransformParam("divide", "r", e.target.value)}
              />
              <span>{transformParams.divide.r.toFixed(1)}</span>
            </div>
            <div className="control-group">
              <label>Zielony (÷):</label>
              <input
                type="range"
                min="0.1"
                max="5"
                step="0.1"
                value={transformParams.divide.g}
                onChange={(e) => updateTransformParam("divide", "g", e.target.value)}
              />
              <span>{transformParams.divide.g.toFixed(1)}</span>
            </div>
            <div className="control-group">
              <label>Niebieski (÷):</label>
              <input
                type="range"
                min="0.1"
                max="5"
                step="0.1"
                value={transformParams.divide.b}
                onChange={(e) => updateTransformParam("divide", "b", e.target.value)}
              />
              <span>{transformParams.divide.b.toFixed(1)}</span>
            </div>
          </div>
        );

      case "brightness":
        return (
          <div className="transform-controls">
            <h4>Zmiana jasności</h4>
            <div className="control-group">
              <label>Jasność:</label>
              <input
                type="range"
                min="-255"
                max="255"
                value={transformParams.brightness}
                onChange={(e) =>
                  setTransformParams((prev) => ({
                    ...prev,
                    brightness: parseInt(e.target.value),
                  }))
                }
              />
              <span>{transformParams.brightness}</span>
            </div>
          </div>
        );

      case "grayscale":
        return (
          <div className="transform-controls">
            <h4>Skala szarości</h4>
            <div className="control-group">
              <label>Metoda:</label>
              <select
                value={transformParams.grayscaleMethod}
                onChange={(e) =>
                  setTransformParams((prev) => ({
                    ...prev,
                    grayscaleMethod: e.target.value,
                  }))
                }
              >
                <option value="average">Średnia arytmetyczna</option>
                <option value="luminance">Luminancja (wagi RGB)</option>
                <option value="lightness">Lightness (max+min)/2</option>
              </select>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!loadedImage) {
    return (
      <div className="point-transformations" style={{padding: "1px 80px", background: "#f8f9fa", borderRadius: "8px"}}>
        <h3>Przekształcenia punktowe</h3>
        <p>Wczytaj obraz, aby rozpocząć.</p>
      </div>
    );
  }

  return (
    <div className="point-transformations">
      <h3>Przekształcenia punktowe</h3>

      {/* Tab navigation */}
      <div className="tab-navigation">
        <button className={activeTab === "add" ? "active" : ""} onClick={() => setActiveTab("add")}>
          Dodawanie
        </button>
        <button className={activeTab === "subtract" ? "active" : ""} onClick={() => setActiveTab("subtract")}>
          Odejmowanie
        </button>
        <button className={activeTab === "multiply" ? "active" : ""} onClick={() => setActiveTab("multiply")}>
          Mnożenie
        </button>
        <button className={activeTab === "divide" ? "active" : ""} onClick={() => setActiveTab("divide")}>
          Dzielenie
        </button>
        <button className={activeTab === "brightness" ? "active" : ""} onClick={() => setActiveTab("brightness")}>
          Jasność
        </button>
        <button className={activeTab === "grayscale" ? "active" : ""} onClick={() => setActiveTab("grayscale")}>
          Skala szarości
        </button>
      </div>

      {/* Controls */}
      <div className="controls-section">
        {renderControls()}

        <div className="action-buttons">
          <button onClick={applyTransformation} disabled={isProcessing} className="apply-btn">
            {isProcessing ? "Przetwarzanie..." : "Potwierdź zmiany"}
          </button>
          <button onClick={resetTransformation} disabled={isProcessing} className="reset-btn">
            Resetuj do oryginału
          </button>
        </div>
      </div>

      {/* Canvas for image preview */}
      <div className="image-preview">
        <h4>Podgląd obrazu</h4>
        <canvas
          ref={canvasRef}
          style={{
            border: "1px solid #ccc",
            maxWidth: "100%",
            height: "auto",
          }}
        />
        <p style={{fontSize: "12px", color: "#666", marginTop: "5px"}}>
          Rozmiar: {loadedImage.width} x {loadedImage.height} pikseli
        </p>
      </div>

      <style jsx>{`
        .point-transformations {
          padding: 20px;
          background: #f8f9fa;
          border-radius: 8px;
          margin: 20px 0;
        }

        .tab-navigation {
          display: flex;
          gap: 2px;
          margin-bottom: 20px;
          border-bottom: 2px solid #e9ecef;
        }

        .tab-navigation button {
          padding: 10px 15px;
          border: none;
          background: #e9ecef;
          cursor: pointer;
          border-radius: 4px 4px 0 0;
          transition: background-color 0.2s;
        }

        .tab-navigation button:hover {
          background: #dee2e6;
        }

        .tab-navigation button.active {
          background: #007bff;
          color: white;
        }

        .controls-section {
          background: white;
          padding: 20px;
          border-radius: 6px;
          margin-bottom: 20px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .transform-controls h4 {
          margin-top: 0;
          color: #333;
        }

        .control-group {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 15px;
        }

        .control-group label {
          min-width: 120px;
          font-weight: bold;
        }

        .control-group input[type="range"] {
          flex: 1;
          max-width: 200px;
        }

        .control-group select {
          padding: 5px;
          border: 1px solid #ccc;
          border-radius: 4px;
        }

        .control-group span {
          min-width: 40px;
          text-align: right;
          font-weight: bold;
        }

        .action-buttons {
          display: flex;
          gap: 10px;
          margin-top: 20px;
        }

        .apply-btn,
        .reset-btn {
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
          transition: background-color 0.2s;
        }

        .apply-btn {
          background: #28a745;
          color: white;
        }

        .apply-btn:hover:not(:disabled) {
          background: #218838;
        }

        .apply-btn:disabled {
          background: #6c757d;
          cursor: not-allowed;
        }

        .reset-btn {
          background: #6c757d;
          color: white;
        }

        .reset-btn:hover:not(:disabled) {
          background: #545b62;
        }

        .image-preview {
          background: white;
          padding: 20px;
          border-radius: 6px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .image-preview h4 {
          margin-top: 0;
          color: #333;
        }

        .image-preview canvas {
          display: block;
          margin: 10px auto;
        }
      `}</style>
    </div>
  );
};

export default PointTransformations;
