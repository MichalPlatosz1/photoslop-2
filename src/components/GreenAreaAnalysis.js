import React, {useState, useRef, useEffect, useCallback} from "react";

const GreenAreaAnalysis = ({loadedImage, onImageTransformed}) => {
  const canvasRef = useRef(null);
  const visualizationCanvasRef = useRef(null);
  const originalImageRef = useRef(null);

  const [analysisResults, setAnalysisResults] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Parametry analizy
  const [analysisMethod, setAnalysisMethod] = useState("rgb"); // rgb, hsv, advanced
  const [colorThreshold, setColorThreshold] = useState({
    hue: {min: 60, max: 180}, // Zakres zielonego w HSV (60-180°)
    saturation: {min: 30, max: 100}, // Minimalna saturacja (30-100%)
    value: {min: 20, max: 100}, // Minimalna jasność (20-100%)
    rgb: {
      green: {min: 50, max: 255}, // Minimalna wartość zielonego
      redRatio: 0.7, // R/G ratio < 0.7
      blueRatio: 0.8 // B/G ratio < 0.8
    }
  });

  const [customColor, setCustomColor] = useState({
    target: {r: 0, g: 128, b: 0}, // Docelowy kolor
    tolerance: 50, // Tolerancja odchylenia
    useHSV: false // Czy używać przestrzeni HSV
  });

  // Funkcje konwersji kolorów
  const rgbToHsv = useCallback((r, g, b) => {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;

    let h = 0;
    if (diff !== 0) {
      if (max === r) {
        h = ((g - b) / diff) % 6;
      } else if (max === g) {
        h = (b - r) / diff + 2;
      } else {
        h = (r - g) / diff + 4;
      }
      h *= 60;
      if (h < 0) h += 360;
    }

    const s = max === 0 ? 0 : (diff / max) * 100;
    const v = max * 100;

    return {h, s, v};
  }, []);

  // Algorytmy wykrywania zielonych obszarów
  const detectGreenAreasRGB = useCallback((imageData) => {
    const pixels = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    let greenPixels = 0;
    const totalPixels = width * height;
    const detectionMask = new Uint8ClampedArray(totalPixels);

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const pixelIndex = i / 4;

      // Metoda 1: Bezwzględne wartości RGB
      const isGreenByValue = g >= colorThreshold.rgb.green.min && 
                           g <= colorThreshold.rgb.green.max;

      // Metoda 2: Proporcje kolorów
      const rRatio = g > 0 ? r / g : 0;
      const bRatio = g > 0 ? b / g : 0;
      const isGreenByRatio = rRatio < colorThreshold.rgb.redRatio && 
                           bRatio < colorThreshold.rgb.blueRatio &&
                           g > 30; // Minimum green threshold

      // Metoda 3: Dominacja zielonego
      const isGreenDominant = g > r && g > b && g > 50;

      if (isGreenByValue && isGreenByRatio && isGreenDominant) {
        greenPixels++;
        detectionMask[pixelIndex] = 255;
      }
    }

    return {
      greenPixels,
      totalPixels,
      percentage: (greenPixels / totalPixels) * 100,
      detectionMask,
      method: "RGB Analysis"
    };
  }, [colorThreshold]);

  const detectGreenAreasHSV = useCallback((imageData) => {
    const pixels = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    let greenPixels = 0;
    const totalPixels = width * height;
    const detectionMask = new Uint8ClampedArray(totalPixels);

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const pixelIndex = i / 4;

      const {h, s, v} = rgbToHsv(r, g, b);

      // Sprawdź czy kolor mieści się w zakresie zielonego w HSV
      const isInHueRange = (h >= colorThreshold.hue.min && h <= colorThreshold.hue.max) ||
                          (colorThreshold.hue.min > colorThreshold.hue.max && 
                           (h >= colorThreshold.hue.min || h <= colorThreshold.hue.max));
      
      const isInSaturationRange = s >= colorThreshold.saturation.min && 
                                 s <= colorThreshold.saturation.max;
      
      const isInValueRange = v >= colorThreshold.value.min && 
                            v <= colorThreshold.value.max;

      if (isInHueRange && isInSaturationRange && isInValueRange) {
        greenPixels++;
        detectionMask[pixelIndex] = 255;
      }
    }

    return {
      greenPixels,
      totalPixels,
      percentage: (greenPixels / totalPixels) * 100,
      detectionMask,
      method: "HSV Analysis"
    };
  }, [colorThreshold, rgbToHsv]);

  const detectCustomColorAreas = useCallback((imageData) => {
    const pixels = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    let matchingPixels = 0;
    const totalPixels = width * height;
    const detectionMask = new Uint8ClampedArray(totalPixels);

    const target = customColor.target;
    const tolerance = customColor.tolerance;

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const pixelIndex = i / 4;

      let isMatch = false;

      if (customColor.useHSV) {
        const pixelHSV = rgbToHsv(r, g, b);
        const targetHSV = rgbToHsv(target.r, target.g, target.b);
        
        const hueDiff = Math.min(
          Math.abs(pixelHSV.h - targetHSV.h),
          360 - Math.abs(pixelHSV.h - targetHSV.h)
        );
        const satDiff = Math.abs(pixelHSV.s - targetHSV.s);
        const valDiff = Math.abs(pixelHSV.v - targetHSV.v);

        isMatch = hueDiff <= tolerance * 0.36 && // Hue tolerance in degrees
                 satDiff <= tolerance * 0.01 && // Saturation tolerance
                 valDiff <= tolerance * 0.01;   // Value tolerance
      } else {
        // Euclidean distance in RGB space
        const distance = Math.sqrt(
          Math.pow(r - target.r, 2) +
          Math.pow(g - target.g, 2) +
          Math.pow(b - target.b, 2)
        );
        isMatch = distance <= tolerance;
      }

      if (isMatch) {
        matchingPixels++;
        detectionMask[pixelIndex] = 255;
      }
    }

    return {
      greenPixels: matchingPixels,
      totalPixels,
      percentage: (matchingPixels / totalPixels) * 100,
      detectionMask,
      method: `Custom Color Analysis (${customColor.useHSV ? 'HSV' : 'RGB'})`
    };
  }, [customColor, rgbToHsv]);

  // Zaawansowana analiza z morfologią
  const detectGreenAreasAdvanced = useCallback((imageData) => {
    // Rozpocznij od analizy HSV
    let result = detectGreenAreasHSV(imageData);
    
    // Zastosuj operacje morfologiczne do oczyszczenia maski
    const width = imageData.width;
    const height = imageData.height;
    const cleanedMask = new Uint8ClampedArray(result.detectionMask);

    // Operacja zamknięcia (closing) - dilatacja + erozja
    // Pomaga usunąć małe dziury w zielonych obszarach
    const dilate = (mask, width, height) => {
      const result = new Uint8ClampedArray(mask.length);
      const kernel = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],  [0, 0],  [0, 1],
        [1, -1],  [1, 0],  [1, 1]
      ];

      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = y * width + x;
          let maxVal = 0;
          
          for (const [dy, dx] of kernel) {
            const ny = y + dy;
            const nx = x + dx;
            const nIdx = ny * width + nx;
            if (mask[nIdx] > maxVal) {
              maxVal = mask[nIdx];
            }
          }
          result[idx] = maxVal;
        }
      }
      return result;
    };

    const erode = (mask, width, height) => {
      const result = new Uint8ClampedArray(mask.length);
      const kernel = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],  [0, 0],  [0, 1],
        [1, -1],  [1, 0],  [1, 1]
      ];

      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = y * width + x;
          let minVal = 255;
          
          for (const [dy, dx] of kernel) {
            const ny = y + dy;
            const nx = x + dx;
            const nIdx = ny * width + nx;
            if (mask[nIdx] < minVal) {
              minVal = mask[nIdx];
            }
          }
          result[idx] = minVal;
        }
      }
      return result;
    };

    // Zastosuj zamknięcie morfologiczne
    const dilated = dilate(cleanedMask, width, height);
    const closed = erode(dilated, width, height);

    // Przelicz statystyki dla oczyszczonej maski
    let cleanedGreenPixels = 0;
    for (let i = 0; i < closed.length; i++) {
      if (closed[i] > 0) {
        cleanedGreenPixels++;
      }
    }

    return {
      ...result,
      greenPixels: cleanedGreenPixels,
      percentage: (cleanedGreenPixels / result.totalPixels) * 100,
      detectionMask: closed,
      method: "Advanced Analysis (HSV + Morphology)"
    };
  }, [detectGreenAreasHSV]);

  // Wyświetlenie obrazu oryginalnego
  const displayOriginalImage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !loadedImage) return;

    const width = Math.floor(loadedImage.width);
    const height = Math.floor(loadedImage.height);
    
    if (width <= 0 || height <= 0) return;

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    const imgData = ctx.createImageData(width, height);
    imgData.data.set(loadedImage.data);
    ctx.putImageData(imgData, 0, 0);
  }, [loadedImage]);

  // Wizualizacja wykrytych obszarów
  const visualizeDetection = useCallback((detectionMask) => {
    const canvas = visualizationCanvasRef.current;
    if (!canvas || !loadedImage || !detectionMask) return;

    const width = Math.floor(loadedImage.width);
    const height = Math.floor(loadedImage.height);
    
    if (width <= 0 || height <= 0) return;

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    // Stwórz obraz wizualizacji
    const imgData = ctx.createImageData(width, height);
    const pixels = imgData.data;

    for (let i = 0; i < detectionMask.length; i++) {
      const pixelIndex = i * 4;
      const originalIndex = i * 4;

      if (detectionMask[i] > 0) {
        // Wykryte obszary - podświetl na zielono
        pixels[pixelIndex] = Math.min(255, loadedImage.data[originalIndex] + 50);     // R
        pixels[pixelIndex + 1] = 255;                                               // G
        pixels[pixelIndex + 2] = Math.min(255, loadedImage.data[originalIndex + 2] + 50); // B
        pixels[pixelIndex + 3] = 255;                                               // A
      } else {
        // Pozostałe obszary - przygaś
        pixels[pixelIndex] = Math.floor(loadedImage.data[originalIndex] * 0.3);     // R
        pixels[pixelIndex + 1] = Math.floor(loadedImage.data[originalIndex + 1] * 0.3); // G
        pixels[pixelIndex + 2] = Math.floor(loadedImage.data[originalIndex + 2] * 0.3); // B
        pixels[pixelIndex + 3] = 255;                                               // A
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }, [loadedImage]);

  // Główna funkcja analizy
  const analyzeGreenAreas = useCallback(() => {
    if (!loadedImage) {
      console.error("Brak załadowanego obrazu");
      return;
    }

    // Sprawdź czy obraz ma prawidłowe wymiary
    const width = Math.floor(loadedImage.width);
    const height = Math.floor(loadedImage.height);
    
    if (width <= 0 || height <= 0) {
      console.error("Nieprawidłowe wymiary obrazu:", { width, height });
      return;
    }

    // Sprawdź czy dane pikseli są dostępne
    if (!loadedImage.data || loadedImage.data.length === 0) {
      console.error("Brak danych pikseli obrazu");
      return;
    }

    setIsProcessing(true);
    
    setTimeout(() => {
      try {
        let result;
        const startTime = performance.now();

        switch (analysisMethod) {
          case "rgb":
            result = detectGreenAreasRGB(loadedImage);
            break;
          case "hsv":
            result = detectGreenAreasHSV(loadedImage);
            break;
          case "advanced":
            result = detectGreenAreasAdvanced(loadedImage);
            break;
          case "custom":
            result = detectCustomColorAreas(loadedImage);
            break;
          default:
            result = detectGreenAreasHSV(loadedImage);
        }

        const endTime = performance.now();
        result.processingTime = endTime - startTime;

        setAnalysisResults(result);
        console.log("Analiza zakończona:", result);

        // Wyświetl obraz oryginalny
        displayOriginalImage();
        
        visualizeDetection(result.detectionMask);

      } catch (error) {
        console.error("Błąd podczas analizy:", error);
      } finally {
        setIsProcessing(false);
      }
    }, 10);
  }, [loadedImage, analysisMethod, detectGreenAreasRGB, detectGreenAreasHSV, detectGreenAreasAdvanced, detectCustomColorAreas, displayOriginalImage, visualizeDetection]);

  // Efekt - wyświetl obraz po załadowaniu
  useEffect(() => {
    if (loadedImage) {
      displayOriginalImage();
      originalImageRef.current = structuredClone(loadedImage);
    }
  }, [loadedImage, displayOriginalImage]);

  // Efekt - automatyczna analiza po zmianie parametrów
  useEffect(() => {
    if (loadedImage) {
      analyzeGreenAreas();
    }
  }, [loadedImage, analysisMethod, colorThreshold, customColor, analyzeGreenAreas]);

  return (
    <div className="green-area-analysis">
      <div className="analysis-header">
        <h3>Analiza Zielonych Obszarów</h3>
      </div>

      {/* Analysis Controls and Results */}
      <div className="analysis-controls">
        <div className="method-selection">
          <label>Metoda analizy:</label>
          <select
            value={analysisMethod}
            onChange={(e) => setAnalysisMethod(e.target.value)}
          >
            <option value="rgb">RGB - Proporcje kolorów</option>
            <option value="hsv">HSV - Odcień i saturacja</option>
            <option value="advanced">Zaawansowana (HSV + Morfologia)</option>
            <option value="custom">Niestandardowy kolor</option>
          </select>
        </div>

        <button
          onClick={analyzeGreenAreas}
          disabled={!loadedImage || isProcessing}
          className="analyze-button"
        >
          {isProcessing ? "Analizuję..." : "Wykonaj analizę"}
        </button>
      </div>

      {analysisResults && (
        <div className="analysis-results">
          <h4>Wyniki analizy</h4>
          <div className="result-item">
            <strong>Metoda:</strong> {analysisResults.method}
          </div>
          <div className="result-item">
            <strong>Wykryte piksele:</strong> {analysisResults.greenPixels.toLocaleString()} / {analysisResults.totalPixels.toLocaleString()}
          </div>
          <div className="result-item percentage">
            <strong>Procent zielonych obszarów:</strong> 
            <span className="percentage-value">{analysisResults.percentage.toFixed(2)}%</span>
          </div>
          <div className="result-item">
            <strong>Czas przetwarzania:</strong> {analysisResults.processingTime?.toFixed(1)} ms
          </div>
        </div>
      )}

      {/* Parameters Section */}
      <div className="parameters-section">
        <h4>Parametry analizy</h4>
        {analysisMethod === "rgb" && (
          <div className="rgb-parameters">
            <div className="parameter-group">
              <label>Minimalna wartość zielonego:</label>
              <input
                type="range"
                min="0"
                max="255"
                value={colorThreshold.rgb.green.min}
                onChange={(e) => setColorThreshold(prev => ({
                  ...prev,
                  rgb: {...prev.rgb, green: {...prev.rgb.green, min: parseInt(e.target.value)}}
                }))}
              />
              <span>{colorThreshold.rgb.green.min}</span>
            </div>
            <div className="parameter-group">
              <label>Maksymalny stosunek R/G:</label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={colorThreshold.rgb.redRatio}
                onChange={(e) => setColorThreshold(prev => ({
                  ...prev,
                  rgb: {...prev.rgb, redRatio: parseFloat(e.target.value)}
                }))}
              />
              <span>{colorThreshold.rgb.redRatio}</span>
            </div>
            <div className="parameter-group">
              <label>Maksymalny stosunek B/G:</label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={colorThreshold.rgb.blueRatio}
                onChange={(e) => setColorThreshold(prev => ({
                  ...prev,
                  rgb: {...prev.rgb, blueRatio: parseFloat(e.target.value)}
                }))}
              />
              <span>{colorThreshold.rgb.blueRatio}</span>
            </div>
          </div>
        )}

        {(analysisMethod === "hsv" || analysisMethod === "advanced") && (
          <div className="hsv-parameters">
            <div className="parameter-group">
              <label>Zakres odcienia (Hue):</label>
              <div className="range-inputs">
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={colorThreshold.hue.min}
                  onChange={(e) => setColorThreshold(prev => ({
                    ...prev,
                    hue: {...prev.hue, min: parseInt(e.target.value)}
                  }))}
                />
                <span>{colorThreshold.hue.min}°</span>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={colorThreshold.hue.max}
                  onChange={(e) => setColorThreshold(prev => ({
                    ...prev,
                    hue: {...prev.hue, max: parseInt(e.target.value)}
                  }))}
                />
                <span>{colorThreshold.hue.max}°</span>
              </div>
            </div>
            <div className="parameter-group">
              <label>Zakres saturacji:</label>
              <div className="range-inputs">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={colorThreshold.saturation.min}
                  onChange={(e) => setColorThreshold(prev => ({
                    ...prev,
                    saturation: {...prev.saturation, min: parseInt(e.target.value)}
                  }))}
                />
                <span>{colorThreshold.saturation.min}%</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={colorThreshold.saturation.max}
                  onChange={(e) => setColorThreshold(prev => ({
                    ...prev,
                    saturation: {...prev.saturation, max: parseInt(e.target.value)}
                  }))}
                />
                <span>{colorThreshold.saturation.max}%</span>
              </div>
            </div>
            <div className="parameter-group">
              <label>Zakres jasności (Value):</label>
              <div className="range-inputs">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={colorThreshold.value.min}
                  onChange={(e) => setColorThreshold(prev => ({
                    ...prev,
                    value: {...prev.value, min: parseInt(e.target.value)}
                  }))}
                />
                <span>{colorThreshold.value.min}%</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={colorThreshold.value.max}
                  onChange={(e) => setColorThreshold(prev => ({
                    ...prev,
                    value: {...prev.value, max: parseInt(e.target.value)}
                  }))}
                />
                <span>{colorThreshold.value.max}%</span>
              </div>
            </div>
          </div>
        )}

        {analysisMethod === "custom" && (
          <div className="custom-parameters">
            <div className="parameter-group">
              <label>Kolor docelowy:</label>
              <div className="color-inputs">
                <label>R:</label>
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={customColor.target.r}
                  onChange={(e) => setCustomColor(prev => ({
                    ...prev,
                    target: {...prev.target, r: parseInt(e.target.value)}
                  }))}
                />
                <span>{customColor.target.r}</span>
                
                <label>G:</label>
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={customColor.target.g}
                  onChange={(e) => setCustomColor(prev => ({
                    ...prev,
                    target: {...prev.target, g: parseInt(e.target.value)}
                  }))}
                />
                <span>{customColor.target.g}</span>
                
                <label>B:</label>
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={customColor.target.b}
                  onChange={(e) => setCustomColor(prev => ({
                    ...prev,
                    target: {...prev.target, b: parseInt(e.target.value)}
                  }))}
                />
                <span>{customColor.target.b}</span>
              </div>
              <div 
                className="color-preview"
                style={{
                  backgroundColor: `rgb(${customColor.target.r}, ${customColor.target.g}, ${customColor.target.b})`,
                  width: "40px",
                  height: "20px",
                  border: "1px solid #ccc"
                }}
              ></div>
            </div>
            <div className="parameter-group">
              <label>Tolerancja:</label>
              <input
                type="range"
                min="1"
                max="150"
                value={customColor.tolerance}
                onChange={(e) => setCustomColor(prev => ({
                  ...prev,
                  tolerance: parseInt(e.target.value)
                }))}
              />
              <span>{customColor.tolerance}</span>
            </div>
            <div className="parameter-group">
              <label>
                <input
                  type="checkbox"
                  checked={customColor.useHSV}
                  onChange={(e) => setCustomColor(prev => ({
                    ...prev,
                    useHSV: e.target.checked
                  }))}
                />
                Użyj przestrzeni HSV
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Visualization Section */}
      <div className="visualization-section">
        <div className="image-display">
          <div className="canvas-container">
            <h4>Obraz oryginalny</h4>
            <canvas ref={canvasRef} />
          </div>

          <div className="canvas-container">
            <h4>Wykryte obszary (podświetlone na zielono)</h4>
            <canvas ref={visualizationCanvasRef} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default GreenAreaAnalysis;