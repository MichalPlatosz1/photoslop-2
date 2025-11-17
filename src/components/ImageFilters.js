import React, {useState, useRef, useEffect, useCallback} from "react";

const ImageFilters = ({loadedImage, onImageTransformed, onImageUpdate}) => {
  const canvasRef = useRef(null);
  const originalImageRef = useRef(null);

  // Filter parameters state
  const [filterParams, setFilterParams] = useState({
    smoothing: {
      size: 3, // 3x3, 5x5, 7x7
    },
    median: {
      size: 3, // 3x3, 5x5, 7x7
    },
    sobel: {
      threshold: 128,
      direction: "both", // 'horizontal', 'vertical', 'both'
    },
    highpass: {
      strength: 1.0, // 0.1 to 3.0
    },
    gaussian: {
      radius: 1.0, // 0.1 to 5.0
      sigma: 1.0, // 0.1 to 3.0
    },
    custom: {
      size: 3,
      kernel: [
        [-1, -1, -1],
        [-1, 8, -1],
        [-1, -1, -1],
      ],
      divisor: 1,
      offset: 0,
    },
  });

  // UI state
  const [activeTab, setActiveTab] = useState("smoothing");
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

  // Get pixel value with boundary handling (replicate edge pixels)
  const getPixelSafe = useCallback((data, width, height, x, y, channel) => {
    const clampedX = Math.max(0, Math.min(width - 1, x));
    const clampedY = Math.max(0, Math.min(height - 1, y));
    const index = (clampedY * width + clampedX) * 4 + channel;
    return data[index];
  }, []);

  // 1. Smoothing Filter (Average Filter)
  const applySmoothingFilter = useCallback(
    (imageData, kernelSize) => {
      const {width, height, data} = imageData;
      const result = new Uint8ClampedArray(data);
      const halfSize = Math.floor(kernelSize / 2);
      const kernelArea = kernelSize * kernelSize;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let sumR = 0,
            sumG = 0,
            sumB = 0;

          // Apply kernel
          for (let ky = -halfSize; ky <= halfSize; ky++) {
            for (let kx = -halfSize; kx <= halfSize; kx++) {
              sumR += getPixelSafe(data, width, height, x + kx, y + ky, 0);
              sumG += getPixelSafe(data, width, height, x + kx, y + ky, 1);
              sumB += getPixelSafe(data, width, height, x + kx, y + ky, 2);
            }
          }

          const index = (y * width + x) * 4;
          result[index] = clampPixel(sumR / kernelArea); // Red
          result[index + 1] = clampPixel(sumG / kernelArea); // Green
          result[index + 2] = clampPixel(sumB / kernelArea); // Blue
          // Alpha remains unchanged
        }
      }

      return {...imageData, data: result};
    },
    [getPixelSafe, clampPixel]
  );

  // 2. Median Filter
  const applyMedianFilter = useCallback(
    (imageData, kernelSize) => {
      const {width, height, data} = imageData;
      const result = new Uint8ClampedArray(data);
      const halfSize = Math.floor(kernelSize / 2);

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const rValues = [],
            gValues = [],
            bValues = [];

          // Collect values in kernel area
          for (let ky = -halfSize; ky <= halfSize; ky++) {
            for (let kx = -halfSize; kx <= halfSize; kx++) {
              rValues.push(getPixelSafe(data, width, height, x + kx, y + ky, 0));
              gValues.push(getPixelSafe(data, width, height, x + kx, y + ky, 1));
              bValues.push(getPixelSafe(data, width, height, x + kx, y + ky, 2));
            }
          }

          // Sort and find median
          rValues.sort((a, b) => a - b);
          gValues.sort((a, b) => a - b);
          bValues.sort((a, b) => a - b);

          const medianIndex = Math.floor(rValues.length / 2);

          const index = (y * width + x) * 4;
          result[index] = rValues[medianIndex]; // Red
          result[index + 1] = gValues[medianIndex]; // Green
          result[index + 2] = bValues[medianIndex]; // Blue
          // Alpha remains unchanged
        }
      }

      return {...imageData, data: result};
    },
    [getPixelSafe]
  );

  // 3. Sobel Edge Detection Filter
  const applySobelFilter = useCallback(
    (imageData, threshold, direction) => {
      const {width, height, data} = imageData;
      const result = new Uint8ClampedArray(data);

      // Sobel kernels
      const sobelX = [
        [-1, 0, 1],
        [-2, 0, 2],
        [-1, 0, 1],
      ];

      const sobelY = [
        [-1, -2, -1],
        [0, 0, 0],
        [1, 2, 1],
      ];

      // Convert to grayscale first for edge detection
      const grayscaleData = new Uint8ClampedArray(data.length);
      for (let i = 0; i < data.length; i += 4) {
        const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        grayscaleData[i] = grayscaleData[i + 1] = grayscaleData[i + 2] = gray;
        grayscaleData[i + 3] = data[i + 3];
      }

      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          let gx = 0,
            gy = 0;

          // Apply Sobel kernels
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const pixelValue = getPixelSafe(grayscaleData, width, height, x + kx, y + ky, 0);
              gx += pixelValue * sobelX[ky + 1][kx + 1];
              gy += pixelValue * sobelY[ky + 1][kx + 1];
            }
          }

          let magnitude = 0;
          switch (direction) {
            case "horizontal":
              magnitude = Math.abs(gx);
              break;
            case "vertical":
              magnitude = Math.abs(gy);
              break;
            case "both":
            default:
              magnitude = Math.sqrt(gx * gx + gy * gy);
              break;
          }

          // Apply threshold
          const edgeValue = magnitude > threshold ? 255 : 0;

          const index = (y * width + x) * 4;
          result[index] = edgeValue; // Red
          result[index + 1] = edgeValue; // Green
          result[index + 2] = edgeValue; // Blue
          // Alpha remains unchanged
        }
      }

      return {...imageData, data: result};
    },
    [getPixelSafe]
  );

  // 4. High-pass Sharpening Filter
  const applyHighpassFilter = useCallback(
    (imageData, strength) => {
      const {width, height, data} = imageData;
      const result = new Uint8ClampedArray(data);

      // High-pass kernel for sharpening
      const kernel = [
        [0, -1, 0],
        [-1, 5, -1],
        [0, -1, 0],
      ];

      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          let sumR = 0,
            sumG = 0,
            sumB = 0;

          // Apply kernel
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const weight = kernel[ky + 1][kx + 1];
              sumR += getPixelSafe(data, width, height, x + kx, y + ky, 0) * weight;
              sumG += getPixelSafe(data, width, height, x + kx, y + ky, 1) * weight;
              sumB += getPixelSafe(data, width, height, x + kx, y + ky, 2) * weight;
            }
          }

          const index = (y * width + x) * 4;
          const originalR = data[index];
          const originalG = data[index + 1];
          const originalB = data[index + 2];

          // Blend original with sharpened
          result[index] = clampPixel(originalR + (sumR - originalR) * strength);
          result[index + 1] = clampPixel(originalG + (sumG - originalG) * strength);
          result[index + 2] = clampPixel(originalB + (sumB - originalB) * strength);
          // Alpha remains unchanged
        }
      }

      return {...imageData, data: result};
    },
    [getPixelSafe, clampPixel]
  );

  // 5. Gaussian Blur Filter
  const applyGaussianFilter = useCallback(
    (imageData, radius, sigma) => {
      const {width, height, data} = imageData;

      // Generate Gaussian kernel
      const kernelSize = Math.ceil(radius * 6) | 1; // Ensure odd size
      const halfSize = Math.floor(kernelSize / 2);
      const kernel = [];
      let kernelSum = 0;

      for (let y = -halfSize; y <= halfSize; y++) {
        const row = [];
        for (let x = -halfSize; x <= halfSize; x++) {
          const value = Math.exp(-(x * x + y * y) / (2 * sigma * sigma));
          row.push(value);
          kernelSum += value;
        }
        kernel.push(row);
      }

      // Normalize kernel
      for (let y = 0; y < kernelSize; y++) {
        for (let x = 0; x < kernelSize; x++) {
          kernel[y][x] /= kernelSum;
        }
      }

      const result = new Uint8ClampedArray(data);

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let sumR = 0,
            sumG = 0,
            sumB = 0;

          // Apply Gaussian kernel
          for (let ky = -halfSize; ky <= halfSize; ky++) {
            for (let kx = -halfSize; kx <= halfSize; kx++) {
              const weight = kernel[ky + halfSize][kx + halfSize];
              sumR += getPixelSafe(data, width, height, x + kx, y + ky, 0) * weight;
              sumG += getPixelSafe(data, width, height, x + kx, y + ky, 1) * weight;
              sumB += getPixelSafe(data, width, height, x + kx, y + ky, 2) * weight;
            }
          }

          const index = (y * width + x) * 4;
          result[index] = clampPixel(sumR); // Red
          result[index + 1] = clampPixel(sumG); // Green
          result[index + 2] = clampPixel(sumB); // Blue
          // Alpha remains unchanged
        }
      }

      return {...imageData, data: result};
    },
    [getPixelSafe, clampPixel]
  );

  // 6. Custom Convolution Filter (Bonus)
  const applyCustomFilter = useCallback(
    (imageData, kernel, divisor, offset) => {
      const {width, height, data} = imageData;
      const result = new Uint8ClampedArray(data);
      const kernelSize = kernel.length;
      const halfSize = Math.floor(kernelSize / 2);

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let sumR = 0,
            sumG = 0,
            sumB = 0;

          // Apply custom kernel
          for (let ky = -halfSize; ky <= halfSize; ky++) {
            for (let kx = -halfSize; kx <= halfSize; kx++) {
              const weight = kernel[ky + halfSize][kx + halfSize];
              sumR += getPixelSafe(data, width, height, x + kx, y + ky, 0) * weight;
              sumG += getPixelSafe(data, width, height, x + kx, y + ky, 1) * weight;
              sumB += getPixelSafe(data, width, height, x + kx, y + ky, 2) * weight;
            }
          }

          const index = (y * width + x) * 4;
          result[index] = clampPixel(sumR / divisor + offset); // Red
          result[index + 1] = clampPixel(sumG / divisor + offset); // Green
          result[index + 2] = clampPixel(sumB / divisor + offset); // Blue
          // Alpha remains unchanged
        }
      }

      return {...imageData, data: result};
    },
    [getPixelSafe, clampPixel]
  );

  // Auto-apply filter when parameters change (live preview)
  useEffect(() => {
    if (!originalImageRef.current) return;

    const applyLivePreview = async () => {
      try {
        let filteredImage = {
          data: new Uint8ClampedArray(originalImageRef.current.data),
          width: originalImageRef.current.width,
          height: originalImageRef.current.height,
        };

        switch (activeTab) {
          case "smoothing":
            filteredImage = applySmoothingFilter(filteredImage, parseInt(filterParams.smoothing.size));
            break;
          case "median":
            filteredImage = applyMedianFilter(filteredImage, parseInt(filterParams.median.size));
            break;
          case "sobel":
            filteredImage = applySobelFilter(
              filteredImage,
              parseFloat(filterParams.sobel.threshold),
              filterParams.sobel.direction
            );
            break;
          case "highpass":
            filteredImage = applyHighpassFilter(filteredImage, parseFloat(filterParams.highpass.strength));
            break;
          case "gaussian":
            filteredImage = applyGaussianFilter(
              filteredImage,
              parseFloat(filterParams.gaussian.radius),
              parseFloat(filterParams.gaussian.sigma)
            );
            break;
          case "custom":
            filteredImage = applyCustomFilter(
              filteredImage,
              filterParams.custom.kernel,
              parseFloat(filterParams.custom.divisor),
              parseFloat(filterParams.custom.offset)
            );
            break;
          default:
            break;
        }

        displayImage(filteredImage);
      } catch (error) {
        console.error("Error applying live preview:", error);
      }
    };

    applyLivePreview();
  }, [
    filterParams,
    activeTab,
    displayImage,
    applySmoothingFilter,
    applyMedianFilter,
    applySobelFilter,
    applyHighpassFilter,
    applyGaussianFilter,
    applyCustomFilter,
  ]);

  // Apply currently visible filter to parent
  const applyCurrentFilter = () => {
    if (!originalImageRef.current) return;

    setIsProcessing(true);

    try {
      let filteredImage = {
        data: new Uint8ClampedArray(originalImageRef.current.data),
        width: originalImageRef.current.width,
        height: originalImageRef.current.height,
      };

      switch (activeTab) {
        case "smoothing":
          filteredImage = applySmoothingFilter(filteredImage, parseInt(filterParams.smoothing.size));
          break;
        case "median":
          filteredImage = applyMedianFilter(filteredImage, parseInt(filterParams.median.size));
          break;
        case "sobel":
          filteredImage = applySobelFilter(
            filteredImage,
            parseFloat(filterParams.sobel.threshold),
            filterParams.sobel.direction
          );
          break;
        case "highpass":
          filteredImage = applyHighpassFilter(filteredImage, parseFloat(filterParams.highpass.strength));
          break;
        case "gaussian":
          filteredImage = applyGaussianFilter(
            filteredImage,
            parseFloat(filterParams.gaussian.radius),
            parseFloat(filterParams.gaussian.sigma)
          );
          break;
        case "custom":
          filteredImage = applyCustomFilter(
            filteredImage,
            filterParams.custom.kernel,
            parseFloat(filterParams.custom.divisor),
            parseFloat(filterParams.custom.offset)
          );
          break;
        default:
          break;
      }

      if (onImageTransformed) {
        onImageTransformed(filteredImage);
      }
    } catch (error) {
      console.error("Error applying filter:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset to original image
  const resetFilter = () => {
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

  // Update filter parameters
  const updateFilterParam = (category, param, value) => {
    setFilterParams((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [param]: param === "direction" ? value : parseFloat(value),
      },
    }));
  };

  // Update custom kernel value
  const updateKernelValue = (row, col, value) => {
    setFilterParams((prev) => {
      const newKernel = prev.custom.kernel.map((row) => [...row]);
      newKernel[row][col] = parseFloat(value) || 0;
      return {
        ...prev,
        custom: {
          ...prev.custom,
          kernel: newKernel,
        },
      };
    });
  };

  // Resize custom kernel
  const resizeKernel = (newSize) => {
    const size = parseInt(newSize);
    const newKernel = Array(size)
      .fill()
      .map(() => Array(size).fill(0));

    // Copy existing values
    const oldKernel = filterParams.custom.kernel;
    const copySize = Math.min(size, oldKernel.length);

    for (let i = 0; i < copySize; i++) {
      for (let j = 0; j < copySize; j++) {
        newKernel[i][j] = oldKernel[i][j];
      }
    }

    setFilterParams((prev) => ({
      ...prev,
      custom: {
        ...prev.custom,
        size: size,
        kernel: newKernel,
      },
    }));
  };

  // Preset kernels for custom filter
  const loadPresetKernel = (presetName) => {
    let kernel,
      divisor = 1,
      offset = 0;

    switch (presetName) {
      case "sharpen":
        kernel = [
          [0, -1, 0],
          [-1, 5, -1],
          [0, -1, 0],
        ];
        break;
      case "edge":
        kernel = [
          [-1, -1, -1],
          [-1, 8, -1],
          [-1, -1, -1],
        ];
        break;
      case "emboss":
        kernel = [
          [-2, -1, 0],
          [-1, 1, 1],
          [0, 1, 2],
        ];
        break;
      case "blur":
        kernel = [
          [1, 1, 1],
          [1, 1, 1],
          [1, 1, 1],
        ];
        divisor = 9;
        break;
      default:
        return;
    }

    setFilterParams((prev) => ({
      ...prev,
      custom: {
        ...prev.custom,
        size: kernel.length,
        kernel: kernel,
        divisor: divisor,
        offset: offset,
      },
    }));
  };

  // Render controls based on active tab
  const renderControls = () => {
    switch (activeTab) {
      case "smoothing":
        return (
          <div className="filter-controls">
            <h4>Filtr wygładzający (uśredniający)</h4>
            <div className="control-group">
              <label>Rozmiar maski:</label>
              <select
                value={filterParams.smoothing.size}
                onChange={(e) => updateFilterParam("smoothing", "size", parseInt(e.target.value))}
              >
                <option value={3}>3x3</option>
                <option value={5}>5x5</option>
                <option value={7}>7x7</option>
                <option value={9}>9x9</option>
              </select>
            </div>
            <p className="description">Redukuje szum poprzez uśrednianie wartości pikseli w danym obszarze.</p>
          </div>
        );

      case "median":
        return (
          <div className="filter-controls">
            <h4>Filtr medianowy</h4>
            <div className="control-group">
              <label>Rozmiar maski:</label>
              <select
                value={filterParams.median.size}
                onChange={(e) => updateFilterParam("median", "size", parseInt(e.target.value))}
              >
                <option value={3}>3x3</option>
                <option value={5}>5x5</option>
                <option value={7}>7x7</option>
              </select>
            </div>
            <p className="description">Skutecznie usuwa szum impulsowy zachowując krawędzie.</p>
          </div>
        );

      case "sobel":
        return (
          <div className="filter-controls">
            <h4>Filtr wykrywania krawędzi (Sobel)</h4>
            <div className="control-group">
              <label>Próg:</label>
              <input
                type="range"
                min="0"
                max="255"
                value={filterParams.sobel.threshold}
                onChange={(e) => updateFilterParam("sobel", "threshold", e.target.value)}
              />
              <span>{filterParams.sobel.threshold}</span>
            </div>
            <div className="control-group">
              <label>Kierunek:</label>
              <select
                value={filterParams.sobel.direction}
                onChange={(e) => updateFilterParam("sobel", "direction", e.target.value)}
              >
                <option value="both">Oba kierunki</option>
                <option value="horizontal">Poziomy</option>
                <option value="vertical">Pionowy</option>
              </select>
            </div>
            <p className="description">Wykrywa krawędzie używając operatorów Sobela.</p>
          </div>
        );

      case "highpass":
        return (
          <div className="filter-controls">
            <h4>Filtr górnoprzepustowy wyostrzający</h4>
            <div className="control-group">
              <label>Siła wyostrzania:</label>
              <input
                type="range"
                min="0.1"
                max="3.0"
                step="0.1"
                value={filterParams.highpass.strength}
                onChange={(e) => updateFilterParam("highpass", "strength", e.target.value)}
              />
              <span>{parseFloat(filterParams.highpass.strength).toFixed(1)}</span>
            </div>
            <p className="description">Zwiększa ostrość poprzez wzmocnienie wysokich częstotliwości.</p>
          </div>
        );

      case "gaussian":
        return (
          <div className="filter-controls">
            <h4>Filtr rozmycie gaussowskie</h4>
            <div className="control-group">
              <label>Promień:</label>
              <input
                type="range"
                min="0.5"
                max="5.0"
                step="0.1"
                value={filterParams.gaussian.radius}
                onChange={(e) => updateFilterParam("gaussian", "radius", e.target.value)}
              />
              <span>{parseFloat(filterParams.gaussian.radius).toFixed(1)}</span>
            </div>
            <div className="control-group">
              <label>Sigma:</label>
              <input
                type="range"
                min="0.1"
                max="3.0"
                step="0.1"
                value={filterParams.gaussian.sigma}
                onChange={(e) => updateFilterParam("gaussian", "sigma", e.target.value)}
              />
              <span>{parseFloat(filterParams.gaussian.sigma).toFixed(1)}</span>
            </div>
            <p className="description">Tworzy naturalne rozmycie zachowując szczegóły.</p>
          </div>
        );

      case "custom":
        return (
          <div className="filter-controls">
            <h4>Splot maski dowolnej (Bonus)</h4>

            <div className="control-group">
              <label>Rozmiar maski:</label>
              <select value={filterParams.custom.size} onChange={(e) => resizeKernel(e.target.value)}>
                <option value={3}>3x3</option>
                <option value={5}>5x5</option>
                <option value={7}>7x7</option>
              </select>
            </div>

            <div className="control-group">
              <label>Gotowe maski:</label>
              <select onChange={(e) => loadPresetKernel(e.target.value)} value="">
                <option value="">Wybierz preset...</option>
                <option value="sharpen">Wyostrzanie</option>
                <option value="edge">Wykrywanie krawędzi</option>
                <option value="emboss">Emboss</option>
                <option value="blur">Rozmycie</option>
              </select>
            </div>

            <div className="control-group">
              <label>Maska konwolucji:</label>
              <div
                className="kernel-grid"
                style={{
                  "--kernel-size": filterParams.custom.size,
                  gridTemplateColumns: `repeat(${filterParams.custom.size}, 1fr)`,
                }}
              >
                {filterParams.custom.kernel.map((row, i) =>
                  row.map((value, j) => (
                    <input
                      key={`${i}-${j}`}
                      type="number"
                      step="0.1"
                      value={value}
                      onChange={(e) => updateKernelValue(i, j, e.target.value)}
                      className="kernel-input"
                    />
                  ))
                )}
              </div>
            </div>

            <div className="control-group">
              <label>Dzielnik:</label>
              <input
                type="number"
                step="0.1"
                value={filterParams.custom.divisor}
                onChange={(e) => updateFilterParam("custom", "divisor", e.target.value)}
                className="number-input"
              />
            </div>

            <div className="control-group">
              <label>Przesunięcie:</label>
              <input
                type="number"
                value={filterParams.custom.offset}
                onChange={(e) => updateFilterParam("custom", "offset", e.target.value)}
                className="number-input"
              />
            </div>

            <p className="description">Dowolna maska konwolucji z możliwością definiowania własnych wartości.</p>
          </div>
        );

      default:
        return null;
    }
  };

  if (!loadedImage) {
    return (
      <div className="image-filters" style={{padding: "20px", background: "#f8f9fa", borderRadius: "8px"}}>
        <h3>Filtry polepszania jakości obrazów</h3>
        <p>Wczytaj obraz, aby rozpocząć.</p>
      </div>
    );
  }

  return (
    <div className="image-filters">
      <h3>Filtry polepszania jakości obrazów</h3>

      {/* Tab navigation */}
      <div className="tab-navigation">
        <button className={activeTab === "smoothing" ? "active" : ""} onClick={() => setActiveTab("smoothing")}>
          Wygładzający
        </button>
        <button className={activeTab === "median" ? "active" : ""} onClick={() => setActiveTab("median")}>
          Medianowy
        </button>
        <button className={activeTab === "sobel" ? "active" : ""} onClick={() => setActiveTab("sobel")}>
          Sobel (krawędzie)
        </button>
        <button className={activeTab === "highpass" ? "active" : ""} onClick={() => setActiveTab("highpass")}>
          Wyostrzający
        </button>
        <button className={activeTab === "gaussian" ? "active" : ""} onClick={() => setActiveTab("gaussian")}>
          Gaussian Blur
        </button>
        <button className={activeTab === "custom" ? "active bonus" : "bonus"} onClick={() => setActiveTab("custom")}>
          ⭐ Splot maski
        </button>
      </div>

      {/* Controls */}
      <div className="controls-section">
        {renderControls()}

        <div className="action-buttons">
          <button onClick={applyCurrentFilter} disabled={isProcessing} className="apply-btn">
            {isProcessing ? "Przetwarzanie..." : "Potwierdź filtr"}
          </button>
          <button onClick={resetFilter} disabled={isProcessing} className="reset-btn">
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
          Rozmiar: {loadedImage.width} × {loadedImage.height} pikseli
        </p>
      </div>

      <style jsx>{`
        .image-filters {
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
          flex-wrap: wrap;
        }

        .tab-navigation button {
          padding: 10px 12px;
          border: none;
          background: #e9ecef;
          cursor: pointer;
          border-radius: 4px 4px 0 0;
          transition: background-color 0.2s;
          font-size: 13px;
          white-space: nowrap;
        }

        .tab-navigation button:hover {
          background: #dee2e6;
        }

        .tab-navigation button.active {
          background: #007bff;
          color: white;
        }

        .tab-navigation button.bonus {
          background: #28a745;
          color: white;
          font-weight: bold;
        }

        .tab-navigation button.bonus.active {
          background: #155724;
        }

        .controls-section {
          background: white;
          padding: 20px;
          border-radius: 6px;
          margin-bottom: 20px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .filter-controls h4 {
          margin-top: 0;
          color: #333;
          border-bottom: 2px solid #007bff;
          padding-bottom: 8px;
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

        .kernel-grid {
          display: grid;
          grid-template-columns: repeat(var(--kernel-size, 3), 1fr);
          gap: 8px;
          margin-top: 10px;
          max-width: 300px;
        }

        .kernel-input {
          width: 100%;
          height: 45px;
          text-align: center;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 12px;
          font-weight: bold;
          transition: border-color 0.2s;
        }

        .kernel-input:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
        }

        .number-input {
          width: 80px;
          padding: 5px;
          border: 1px solid #ccc;
          border-radius: 4px;
          text-align: center;
        }

        .number-input:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
        }

        .description {
          font-size: 12px;
          color: #666;
          font-style: italic;
          margin-top: 15px;
          padding: 8px;
          background: #f8f9fa;
          border-radius: 4px;
          border-left: 3px solid #007bff;
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

export default ImageFilters;
