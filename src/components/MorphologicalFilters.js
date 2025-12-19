import React, { useState, useRef, useEffect, useCallback } from "react";

const MorphologicalFilters = ({ loadedImage, onImageTransformed, onImageUpdate }) => {
  const canvasRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const originalImageRef = useRef(null);

  // Morphological filter parameters state
  const [filterParams, setFilterParams] = useState({
    structuringElement: {
      size: 3,
      shape: "square", // 'square', 'cross', 'circle', 'custom'
      data: [
        [1, 1, 1],
        [1, 1, 1],
        [1, 1, 1]
      ]
    },
    hitOrMiss: {
      foregroundKernel: [
        [0, 1, 0],
        [1, 1, 1],
        [0, 1, 0]
      ],
      backgroundKernel: [
        [1, 0, 1],
        [0, 0, 0],
        [1, 0, 1]
      ]
    }
  });

  // UI state
  const [activeTab, setActiveTab] = useState("dilation");
  const [isProcessing, setIsProcessing] = useState(false);
  const [binaryThreshold, setBinaryThreshold] = useState(128);
  const [showPreview, setShowPreview] = useState(true);
  const [previewMode, setPreviewMode] = useState("side-by-side"); // "side-by-side", "original", "processed"

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

  // Display preview images
  const displayPreview = useCallback((originalData, processedData = null) => {
    const canvas = previewCanvasRef.current;
    if (!canvas || !originalData) return;

    const ctx = canvas.getContext("2d");
    
    if (previewMode === "side-by-side" && processedData) {
      // Side by side view
      canvas.width = originalData.width * 2 + 10; // 10px gap
      canvas.height = originalData.height;
      
      // Clear canvas
      ctx.fillStyle = "#f0f0f0";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Display original
      const originalImgData = ctx.createImageData(originalData.width, originalData.height);
      originalImgData.data.set(originalData.data);
      ctx.putImageData(originalImgData, 0, 0);
      
      // Add label for original
      ctx.fillStyle = "#333";
      ctx.font = "12px Arial";
      ctx.fillText("Oryginał", 5, originalData.height + 15);
      
      // Display processed
      const processedImgData = ctx.createImageData(processedData.width, processedData.height);
      processedImgData.data.set(processedData.data);
      ctx.putImageData(processedImgData, originalData.width + 10, 0);
      
      // Add label for processed
      ctx.fillText(`${activeTab} (prog: ${binaryThreshold})`, originalData.width + 15, originalData.height + 15);
    } else {
      // Single image view
      const imageData = previewMode === "original" ? originalData : (processedData || originalData);
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      
      const imgData = ctx.createImageData(imageData.width, imageData.height);
      imgData.data.set(imageData.data);
      ctx.putImageData(imgData, 0, 0);
    }
  }, [previewMode, activeTab, binaryThreshold]);

  // Store original image data when component loads or image changes
  useEffect(() => {
    if (loadedImage) {
      originalImageRef.current = {
        data: new Uint8ClampedArray(loadedImage.data),
        width: loadedImage.width,
        height: loadedImage.height,
      };
      displayImage(loadedImage);
      displayPreview(loadedImage);
    }
  }, [loadedImage, displayImage, displayPreview]);

  // Convert image to binary using threshold
  const toBinary = useCallback((imageData, threshold = 128) => {
    const { width, height, data } = imageData;
    const result = new Uint8ClampedArray(data.length);

    for (let i = 0; i < data.length; i += 4) {
      // Convert to grayscale using luminance formula
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const binary = gray >= threshold ? 255 : 0;
      
      result[i] = binary;     // Red
      result[i + 1] = binary; // Green
      result[i + 2] = binary; // Blue
      result[i + 3] = data[i + 3]; // Alpha
    }

    return { ...imageData, data: result };
  }, []);

  // Get binary pixel value (0 or 255) safely with boundary handling
  const getBinaryPixelSafe = useCallback((data, width, height, x, y) => {
    if (x < 0 || x >= width || y < 0 || y >= height) {
      return 0; // Treat outside pixels as black
    }
    const index = (y * width + x) * 4;
    return data[index] > 127 ? 255 : 0;
  }, []);

  // Generate predefined structuring elements
  const generateStructuringElement = useCallback((size, shape) => {
    const element = Array(size).fill().map(() => Array(size).fill(0));
    const center = Math.floor(size / 2);

    switch (shape) {
      case "square":
        for (let i = 0; i < size; i++) {
          for (let j = 0; j < size; j++) {
            element[i][j] = 1;
          }
        }
        break;
      
      case "cross":
        for (let i = 0; i < size; i++) {
          element[center][i] = 1;
          element[i][center] = 1;
        }
        break;
      
      case "circle":
        const radius = center;
        for (let i = 0; i < size; i++) {
          for (let j = 0; j < size; j++) {
            const distance = Math.sqrt((i - center) ** 2 + (j - center) ** 2);
            if (distance <= radius) {
              element[i][j] = 1;
            }
          }
        }
        break;
      
      default:
        return element;
    }

    return element;
  }, []);

  // DILATION: Expands white regions
  const applyDilation = useCallback((imageData, structuringElement) => {
    const { width, height, data } = imageData;
    const result = new Uint8ClampedArray(data.length);
    
    // Copy alpha channel
    for (let i = 3; i < data.length; i += 4) {
      result[i] = data[i];
    }

    const seSize = structuringElement.length;
    const seCenter = Math.floor(seSize / 2);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let maxValue = 0;

        // Check all positions where structuring element is 1
        for (let sy = 0; sy < seSize; sy++) {
          for (let sx = 0; sx < seSize; sx++) {
            if (structuringElement[sy][sx] === 1) {
              const imageY = y - sy + seCenter;
              const imageX = x - sx + seCenter;
              const pixelValue = getBinaryPixelSafe(data, width, height, imageX, imageY);
              maxValue = Math.max(maxValue, pixelValue);
            }
          }
        }

        const index = (y * width + x) * 4;
        result[index] = maxValue;     // Red
        result[index + 1] = maxValue; // Green
        result[index + 2] = maxValue; // Blue
      }
    }

    return { ...imageData, data: result };
  }, [getBinaryPixelSafe]);

  // EROSION: Shrinks white regions
  const applyErosion = useCallback((imageData, structuringElement) => {
    const { width, height, data } = imageData;
    const result = new Uint8ClampedArray(data.length);
    
    // Copy alpha channel
    for (let i = 3; i < data.length; i += 4) {
      result[i] = data[i];
    }

    const seSize = structuringElement.length;
    const seCenter = Math.floor(seSize / 2);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let minValue = 255;

        // Check all positions where structuring element is 1
        for (let sy = 0; sy < seSize; sy++) {
          for (let sx = 0; sx < seSize; sx++) {
            if (structuringElement[sy][sx] === 1) {
              const imageY = y + sy - seCenter;
              const imageX = x + sx - seCenter;
              const pixelValue = getBinaryPixelSafe(data, width, height, imageX, imageY);
              minValue = Math.min(minValue, pixelValue);
            }
          }
        }

        const index = (y * width + x) * 4;
        result[index] = minValue;     // Red
        result[index + 1] = minValue; // Green
        result[index + 2] = minValue; // Blue
      }
    }

    return { ...imageData, data: result };
  }, [getBinaryPixelSafe]);

  // OPENING: Erosion followed by dilation (removes small noise)
  const applyOpening = useCallback((imageData, structuringElement) => {
    const eroded = applyErosion(imageData, structuringElement);
    return applyDilation(eroded, structuringElement);
  }, [applyErosion, applyDilation]);

  // CLOSING: Dilation followed by erosion (fills small gaps)
  const applyClosing = useCallback((imageData, structuringElement) => {
    const dilated = applyDilation(imageData, structuringElement);
    return applyErosion(dilated, structuringElement);
  }, [applyDilation, applyErosion]);

  // HIT-OR-MISS TRANSFORM: Pattern matching
  const applyHitOrMiss = useCallback((imageData, foregroundKernel, backgroundKernel) => {
    const { width, height, data } = imageData;
    const result = new Uint8ClampedArray(data.length);
    
    // Initialize to black
    for (let i = 0; i < data.length; i += 4) {
      result[i] = 0;
      result[i + 1] = 0;
      result[i + 2] = 0;
      result[i + 3] = data[i + 3];
    }

    const kernelSize = foregroundKernel.length;
    const center = Math.floor(kernelSize / 2);

    for (let y = center; y < height - center; y++) {
      for (let x = center; x < width - center; x++) {
        let foregroundMatch = true;
        let backgroundMatch = true;

        // Check foreground kernel
        for (let ky = 0; ky < kernelSize; ky++) {
          for (let kx = 0; kx < kernelSize; kx++) {
            if (foregroundKernel[ky][kx] === 1) {
              const imageY = y + ky - center;
              const imageX = x + kx - center;
              const pixelValue = getBinaryPixelSafe(data, width, height, imageX, imageY);
              if (pixelValue < 127) {
                foregroundMatch = false;
                break;
              }
            }
          }
          if (!foregroundMatch) break;
        }

        // Check background kernel
        if (foregroundMatch) {
          for (let ky = 0; ky < kernelSize; ky++) {
            for (let kx = 0; kx < kernelSize; kx++) {
              if (backgroundKernel[ky][kx] === 1) {
                const imageY = y + ky - center;
                const imageX = x + kx - center;
                const pixelValue = getBinaryPixelSafe(data, width, height, imageX, imageY);
                if (pixelValue > 127) {
                  backgroundMatch = false;
                  break;
                }
              }
            }
            if (!backgroundMatch) break;
          }
        }

        if (foregroundMatch && backgroundMatch) {
          const index = (y * width + x) * 4;
          result[index] = 255;     // Red
          result[index + 1] = 255; // Green
          result[index + 2] = 255; // Blue
        }
      }
    }

    return { ...imageData, data: result };
  }, [getBinaryPixelSafe]);

  // Apply selected filter
  const applyFilter = useCallback(async (filterType) => {
    if (!originalImageRef.current) return;

    setIsProcessing(true);

    try {
      const originalImage = originalImageRef.current;
      
      // Convert to binary first
      const binaryImage = toBinary(originalImage, binaryThreshold);
      
      let processedImage;
      const se = filterParams.structuringElement.data;

      switch (filterType) {
        case "dilation":
          processedImage = applyDilation(binaryImage, se);
          break;
        case "erosion":
          processedImage = applyErosion(binaryImage, se);
          break;
        case "opening":
          processedImage = applyOpening(binaryImage, se);
          break;
        case "closing":
          processedImage = applyClosing(binaryImage, se);
          break;
        case "hitormiss":
          processedImage = applyHitOrMiss(
            binaryImage,
            filterParams.hitOrMiss.foregroundKernel,
            filterParams.hitOrMiss.backgroundKernel
          );
          break;
        default:
          processedImage = binaryImage;
      }

      displayImage(processedImage);
      displayPreview(binaryImage, processedImage);
      if (onImageTransformed) {
        onImageTransformed(processedImage);
      }
    } catch (error) {
      console.error("Error applying morphological filter:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [
    toBinary,
    binaryThreshold,
    filterParams,
    applyDilation,
    applyErosion,
    applyOpening,
    applyClosing,
    applyHitOrMiss,
    displayImage,
    displayPreview,
    onImageTransformed
  ]);

  // Generate preview on parameter changes
  const generatePreview = useCallback(() => {
    if (!originalImageRef.current || !showPreview) return;

    const originalImage = originalImageRef.current;
    const binaryImage = toBinary(originalImage, binaryThreshold);
    
    let processedImage;
    const se = filterParams.structuringElement.data;

    try {
      switch (activeTab) {
        case "dilation":
          processedImage = applyDilation(binaryImage, se);
          break;
        case "erosion":
          processedImage = applyErosion(binaryImage, se);
          break;
        case "opening":
          processedImage = applyOpening(binaryImage, se);
          break;
        case "closing":
          processedImage = applyClosing(binaryImage, se);
          break;
        case "hitormiss":
          processedImage = applyHitOrMiss(
            binaryImage,
            filterParams.hitOrMiss.foregroundKernel,
            filterParams.hitOrMiss.backgroundKernel
          );
          break;
        default:
          processedImage = binaryImage;
      }

      displayPreview(binaryImage, processedImage);
    } catch (error) {
      console.error("Error generating preview:", error);
      displayPreview(binaryImage);
    }
  }, [
    showPreview,
    toBinary,
    binaryThreshold,
    filterParams,
    activeTab,
    applyDilation,
    applyErosion,
    applyOpening,
    applyClosing,
    applyHitOrMiss,
    displayPreview
  ]);

  // Auto-generate preview when parameters change
  useEffect(() => {
    if (showPreview) {
      const timeoutId = setTimeout(generatePreview, 300); // Debounce
      return () => clearTimeout(timeoutId);
    }
  }, [generatePreview, showPreview]);

  // Update structuring element
  const updateStructuringElement = useCallback((size, shape) => {
    const newElement = generateStructuringElement(size, shape);
    setFilterParams(prev => ({
      ...prev,
      structuringElement: {
        size,
        shape,
        data: newElement
      }
    }));
  }, [generateStructuringElement]);

  // Update custom structuring element
  const updateCustomElement = useCallback((row, col, value) => {
    setFilterParams(prev => {
      const newData = [...prev.structuringElement.data];
      newData[row] = [...newData[row]];
      newData[row][col] = value;
      return {
        ...prev,
        structuringElement: {
          ...prev.structuringElement,
          data: newData
        }
      };
    });
  }, []);

  // Update hit-or-miss kernels
  const updateHitOrMissKernel = useCallback((kernelType, row, col, value) => {
    setFilterParams(prev => {
      const newKernel = [...prev.hitOrMiss[kernelType]];
      newKernel[row] = [...newKernel[row]];
      newKernel[row][col] = value;
      return {
        ...prev,
        hitOrMiss: {
          ...prev.hitOrMiss,
          [kernelType]: newKernel
        }
      };
    });
  }, []);

  // Reset to original image
  const resetToOriginal = useCallback(() => {
    if (originalImageRef.current) {
      displayImage(originalImageRef.current);
      displayPreview(originalImageRef.current);
      if (onImageUpdate) {
        onImageUpdate(originalImageRef.current);
      }
    }
  }, [displayImage, displayPreview, onImageUpdate]);

  const renderStructuringElementEditor = () => {
    const { size, shape, data } = filterParams.structuringElement;

    return (
      <div className="structuring-element-editor">
        <h4>Element strukturyzujący</h4>
        
        <div className="se-controls">
          <div className="control-group">
            <label>Rozmiar:</label>
            <select
              value={size}
              onChange={(e) => {
                const newSize = parseInt(e.target.value);
                updateStructuringElement(newSize, shape);
              }}
            >
              <option value={3}>3x3</option>
              <option value={5}>5x5</option>
              <option value={7}>7x7</option>
              <option value={9}>9x9</option>
            </select>
          </div>
          
          <div className="control-group">
            <label>Kształt:</label>
            <select
              value={shape}
              onChange={(e) => {
                const newShape = e.target.value;
                updateStructuringElement(size, newShape);
              }}
            >
              <option value="square">Kwadrat</option>
              <option value="cross">Krzyż</option>
              <option value="circle">Koło</option>
              <option value="custom">Własny</option>
            </select>
          </div>
        </div>

        <div className="se-matrix">
          {data.map((row, i) => (
            <div key={i} className="se-row">
              {row.map((cell, j) => (
                <input
                  key={j}
                  type="number"
                  min="0"
                  max="1"
                  value={cell}
                  onChange={(e) => updateCustomElement(i, j, parseInt(e.target.value) || 0)}
                  className={`se-cell ${cell === 1 ? 'active' : ''}`}
                  disabled={shape !== 'custom'}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderHitOrMissEditor = () => {
    const { foregroundKernel, backgroundKernel } = filterParams.hitOrMiss;

    return (
      <div className="hit-or-miss-editor">
        <h4>Hit-or-Miss Kernels</h4>
        
        <div className="kernels-container">
          <div className="kernel-editor">
            <h5>Kernel pierwszego planu (1 = biały wymagany, 0 = nie ma znaczenia)</h5>
            <div className="kernel-matrix">
              {foregroundKernel.map((row, i) => (
                <div key={i} className="kernel-row">
                  {row.map((cell, j) => (
                    <input
                      key={j}
                      type="number"
                      min="0"
                      max="1"
                      value={cell}
                      onChange={(e) => updateHitOrMissKernel('foregroundKernel', i, j, parseInt(e.target.value) || 0)}
                      className={`kernel-cell ${cell === 1 ? 'active' : ''}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="kernel-editor">
            <h5>Kernel tła (1 = czarny wymagany, 0 = nie ma znaczenia)</h5>
            <div className="kernel-matrix">
              {backgroundKernel.map((row, i) => (
                <div key={i} className="kernel-row">
                  {row.map((cell, j) => (
                    <input
                      key={j}
                      type="number"
                      min="0"
                      max="1"
                      value={cell}
                      onChange={(e) => updateHitOrMissKernel('backgroundKernel', i, j, parseInt(e.target.value) || 0)}
                      className={`kernel-cell ${cell === 1 ? 'active' : ''}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="morphological-filters">
      <div className="filter-controls">
        <h3>Filtry Morfologiczne</h3>
        
        <div className="threshold-control">
          <label>Próg binaryzacji:</label>
          <input
            type="range"
            min="0"
            max="255"
            value={binaryThreshold}
            onChange={(e) => setBinaryThreshold(parseInt(e.target.value))}
          />
          <span>{binaryThreshold}</span>
        </div>

        <div className="preview-controls">
          <div className="preview-toggle">
            <label>
              <input
                type="checkbox"
                checked={showPreview}
                onChange={(e) => setShowPreview(e.target.checked)}
              />
              Podgląd na żywo
            </label>
          </div>
          
          {showPreview && (
            <div className="preview-mode-selector">
              <label>Tryb podglądu:</label>
              <select
                value={previewMode}
                onChange={(e) => setPreviewMode(e.target.value)}
              >
                <option value="side-by-side">Porównanie</option>
                <option value="original">Tylko oryginał</option>
                <option value="processed">Tylko przetworzony</option>
              </select>
            </div>
          )}
        </div>

        <div className="filter-tabs">
          {[
            { id: "dilation", name: "Dylatacja" },
            { id: "erosion", name: "Erozja" },
            { id: "opening", name: "Otwarcie" },
            { id: "closing", name: "Domknięcie" },
            { id: "hitormiss", name: "Hit-or-Miss" },
          ].map((tab) => (
            <button
              key={tab.id}
              className={`filter-tab ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.name}
            </button>
          ))}
        </div>

        <div className="filter-content">
          {activeTab === "hitormiss" ? (
            renderHitOrMissEditor()
          ) : (
            renderStructuringElementEditor()
          )}

          <div className="filter-actions">
            <button
              onClick={() => applyFilter(activeTab)}
              disabled={isProcessing || !loadedImage}
              className="apply-button"
            >
              {isProcessing ? "Przetwarzanie..." : `Zastosuj ${activeTab}`}
            </button>
            
            <button
              onClick={resetToOriginal}
              disabled={!loadedImage}
              className="reset-button"
            >
              Przywróć oryginał
            </button>
          </div>
        </div>
      </div>

      {showPreview && (
        <div className="filter-preview">
          <h4>Podgląd</h4>
          <canvas
            ref={previewCanvasRef}
            className="preview-canvas"
            style={{
              maxWidth: "100%",
              maxHeight: "400px",
              objectFit: "contain",
              border: "1px solid #ddd",
              borderRadius: "4px",
            }}
          />
          {previewMode === "side-by-side" && (
            <div className="preview-legend">
              <div className="legend-item">
                <span className="legend-color" style={{backgroundColor: "#666"}}></span>
                <span>Oryginał (po binaryzacji)</span>
              </div>
              <div className="legend-item">
                <span className="legend-color" style={{backgroundColor: "#007bff"}}></span>
                <span>Wynik operacji {activeTab}</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="filter-output">
        <h4>Wynik</h4>
        <canvas
          ref={canvasRef}
          className="filter-canvas"
          style={{
            maxWidth: "100%",
            maxHeight: "500px",
            objectFit: "contain",
          }}
        />
      </div>
    </div>
  );
};

export default MorphologicalFilters;