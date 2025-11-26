import React, {useState, useRef, useEffect, useCallback} from "react";

const BinarizationMethods = ({loadedImage, onImageTransformed}) => {
  const canvasRef = useRef(null);
  const originalImageRef = useRef(null);

  // Binarization parameters state
  const [binarizationParams, setBinarizationParams] = useState({
    manual: {
      threshold: 128,
    },
    percentBlack: {
      percentage: 50, // 50% black pixels
    },
    meanIterative: {},
    entropy: {},
    minimumError: {},
    fuzzyMinimumError: {},
  });

  const [activeTab, setActiveTab] = useState("manual");
  const [isProcessing, setIsProcessing] = useState(false);
  const [calculatedThreshold, setCalculatedThreshold] = useState(null);

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

  // Convert image to grayscale
  const convertToGrayscale = useCallback((imageData) => {
    const {width, height, data} = imageData;
    const grayscaleValues = new Array(width * height);

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      grayscaleValues[i / 4] = gray;
    }

    return grayscaleValues;
  }, []);

  // Calculate histogram for grayscale image
  const calculateHistogram = useCallback((grayscaleValues) => {
    const histogram = new Array(256).fill(0);
    for (let value of grayscaleValues) {
      histogram[value]++;
    }
    return histogram;
  }, []);

  // Apply binarization with given threshold
  const applyBinarization = useCallback((imageData, threshold) => {
    const {width, height, data} = imageData;
    const result = new Uint8ClampedArray(data);

    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      const binaryValue = gray >= threshold ? 255 : 0;

      result[i] = binaryValue; // Red
      result[i + 1] = binaryValue; // Green
      result[i + 2] = binaryValue; // Blue
      // Alpha remains unchanged
    }

    return {...imageData, data: result};
  }, []);

  // 1. Manual thresholding
  const calculateManualThreshold = useCallback(() => {
    return binarizationParams.manual.threshold;
  }, [binarizationParams.manual.threshold]);

  // 2. Percent Black Selection
  const calculatePercentBlackThreshold = useCallback(
    (grayscaleValues) => {
      const sortedValues = [...grayscaleValues].sort((a, b) => a - b);
      const targetIndex = Math.floor((binarizationParams.percentBlack.percentage / 100) * sortedValues.length);
      return sortedValues[targetIndex];
    },
    [binarizationParams.percentBlack.percentage]
  );

  // 3. Mean Iterative Selection
  const calculateMeanIterativeThreshold = useCallback((grayscaleValues) => {
    let threshold = 128; // Initial guess
    let prevThreshold = 0;
    const maxIterations = 100;
    let iteration = 0;

    while (Math.abs(threshold - prevThreshold) > 1 && iteration < maxIterations) {
      prevThreshold = threshold;

      let sum1 = 0,
        count1 = 0; // Background
      let sum2 = 0,
        count2 = 0; // Foreground

      for (let value of grayscaleValues) {
        if (value < threshold) {
          sum1 += value;
          count1++;
        } else {
          sum2 += value;
          count2++;
        }
      }

      const mean1 = count1 > 0 ? sum1 / count1 : 0;
      const mean2 = count2 > 0 ? sum2 / count2 : 255;

      threshold = Math.round((mean1 + mean2) / 2);
      iteration++;
    }

    return threshold;
  }, []);

  // 4. Entropy Selection (Kapur's method)
  const calculateEntropyThreshold = useCallback(
    (grayscaleValues) => {
      const histogram = calculateHistogram(grayscaleValues);
      const totalPixels = grayscaleValues.length;

      // Normalize histogram to probabilities
      const probabilities = histogram.map((count) => count / totalPixels);

      let maxEntropy = -1;
      let bestThreshold = 128;

      for (let t = 1; t < 255; t++) {
        // Calculate probabilities for background and foreground
        let P1 = 0,
          P2 = 0;
        for (let i = 0; i < t; i++) P1 += probabilities[i];
        for (let i = t; i < 256; i++) P2 += probabilities[i];

        if (P1 === 0 || P2 === 0) continue;

        // Calculate entropies
        let H1 = 0,
          H2 = 0;

        for (let i = 0; i < t; i++) {
          if (probabilities[i] > 0) {
            const p = probabilities[i] / P1;
            H1 -= p * Math.log2(p);
          }
        }

        for (let i = t; i < 256; i++) {
          if (probabilities[i] > 0) {
            const p = probabilities[i] / P2;
            H2 -= p * Math.log2(p);
          }
        }

        const totalEntropy = H1 + H2;

        if (totalEntropy > maxEntropy) {
          maxEntropy = totalEntropy;
          bestThreshold = t;
        }
      }

      return bestThreshold;
    },
    [calculateHistogram]
  );

  // 5. Minimum Error Thresholding (Kittler-Illingworth)
  const calculateMinimumErrorThreshold = useCallback(
    (grayscaleValues) => {
      const histogram = calculateHistogram(grayscaleValues);
      const totalPixels = grayscaleValues.length;

      let minError = Infinity;
      let bestThreshold = 128;

      for (let t = 1; t < 255; t++) {
        // Calculate means and weights for both classes
        let w1 = 0,
          w2 = 0;
        let sum1 = 0,
          sum2 = 0;

        for (let i = 0; i < t; i++) {
          w1 += histogram[i];
          sum1 += i * histogram[i];
        }

        for (let i = t; i < 256; i++) {
          w2 += histogram[i];
          sum2 += i * histogram[i];
        }

        if (w1 === 0 || w2 === 0) continue;

        const mean1 = sum1 / w1;
        const mean2 = sum2 / w2;

        // Calculate variances
        let var1 = 0,
          var2 = 0;

        for (let i = 0; i < t; i++) {
          var1 += histogram[i] * Math.pow(i - mean1, 2);
        }
        var1 /= w1;

        for (let i = t; i < 256; i++) {
          var2 += histogram[i] * Math.pow(i - mean2, 2);
        }
        var2 /= w2;

        // Avoid zero variance (add small epsilon)
        var1 = Math.max(var1, 1e-6);
        var2 = Math.max(var2, 1e-6);

        // Calculate error
        const P1 = w1 / totalPixels;
        const P2 = w2 / totalPixels;

        const error =
          1 +
          2 * (P1 * Math.log(Math.sqrt(var1)) + P2 * Math.log(Math.sqrt(var2))) -
          2 * (P1 * Math.log(P1) + P2 * Math.log(P2));

        if (error < minError) {
          minError = error;
          bestThreshold = t;
        }
      }

      return bestThreshold;
    },
    [calculateHistogram]
  );

  // 6. Fuzzy Minimum Error Thresholding
  const calculateFuzzyMinimumErrorThreshold = useCallback(
    (grayscaleValues) => {
      const histogram = calculateHistogram(grayscaleValues);
      const totalPixels = grayscaleValues.length;

      let minFuzzyError = Infinity;
      let bestThreshold = 128;

      for (let t = 1; t < 255; t++) {
        // Calculate fuzzy membership functions
        let fuzzyError = 0;

        for (let i = 0; i < 256; i++) {
          if (histogram[i] === 0) continue;

          const prob = histogram[i] / totalPixels;

          // Fuzzy membership for background class
          let mu1;
          if (i <= t) {
            mu1 = 1;
          } else {
            // Exponential decay
            mu1 = Math.exp(-(i - t) / 10.0);
          }

          // Fuzzy membership for foreground class
          let mu2;
          if (i >= t) {
            mu2 = 1;
          } else {
            // Exponential decay
            mu2 = Math.exp(-(t - i) / 10.0);
          }

          // Shannon entropy for fuzzy sets
          if (mu1 > 0) {
            fuzzyError -= prob * mu1 * Math.log(mu1);
          }
          if (mu2 > 0) {
            fuzzyError -= prob * mu2 * Math.log(mu2);
          }
        }

        if (fuzzyError < minFuzzyError) {
          minFuzzyError = fuzzyError;
          bestThreshold = t;
        }
      }

      return bestThreshold;
    },
    [calculateHistogram]
  );

  // Auto-apply binarization when parameters or tab changes
  useEffect(() => {
    if (!originalImageRef.current) return;

    const applyCurrentBinarization = async () => {
      try {
        const grayscaleValues = convertToGrayscale(originalImageRef.current);
        let threshold;

        switch (activeTab) {
          case "manual":
            threshold = calculateManualThreshold();
            break;
          case "percentBlack":
            threshold = calculatePercentBlackThreshold(grayscaleValues);
            break;
          case "meanIterative":
            threshold = calculateMeanIterativeThreshold(grayscaleValues);
            break;
          case "entropy":
            threshold = calculateEntropyThreshold(grayscaleValues);
            break;
          case "minimumError":
            threshold = calculateMinimumErrorThreshold(grayscaleValues);
            break;
          case "fuzzyMinimumError":
            threshold = calculateFuzzyMinimumErrorThreshold(grayscaleValues);
            break;
          default:
            threshold = 128;
        }

        setCalculatedThreshold(threshold);

        const binarizedImage = applyBinarization(
          {
            data: new Uint8ClampedArray(originalImageRef.current.data),
            width: originalImageRef.current.width,
            height: originalImageRef.current.height,
          },
          threshold
        );

        displayImage(binarizedImage);
      } catch (error) {
        console.error("Error applying binarization:", error);
      }
    };

    applyCurrentBinarization();
  }, [
    activeTab,
    binarizationParams,
    convertToGrayscale,
    calculateManualThreshold,
    calculatePercentBlackThreshold,
    calculateMeanIterativeThreshold,
    calculateEntropyThreshold,
    calculateMinimumErrorThreshold,
    calculateFuzzyMinimumErrorThreshold,
    applyBinarization,
    displayImage,
  ]);

  // Apply current binarization to parent
  const applyCurrentBinarization = () => {
    if (!originalImageRef.current || !calculatedThreshold) return;

    setIsProcessing(true);

    try {
      const binarizedImage = applyBinarization(
        {
          data: new Uint8ClampedArray(originalImageRef.current.data),
          width: originalImageRef.current.width,
          height: originalImageRef.current.height,
        },
        calculatedThreshold
      );

      if (onImageTransformed) {
        onImageTransformed(binarizedImage);
      }
    } catch (error) {
      console.error("Error applying binarization:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset to original image
  const resetBinarization = () => {
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

  // Update binarization parameters
  const updateBinarizationParam = (category, param, value) => {
    setBinarizationParams((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [param]: parseFloat(value),
      },
    }));
  };

  // Render controls based on active tab
  const renderControls = () => {
    switch (activeTab) {
      case "manual":
        return (
          <div className="binarization-controls">
            <h4>Binaryzacja ręczna</h4>
            <div className="control-group">
              <label>Próg binaryzacji:</label>
              <input
                type="range"
                min="0"
                max="255"
                value={binarizationParams.manual.threshold}
                onChange={(e) => updateBinarizationParam("manual", "threshold", e.target.value)}
              />
              <span>{binarizationParams.manual.threshold}</span>
            </div>
            <p className="description">
              Użytkownik bezpośrednio ustala próg binaryzacji. Piksele o intensywności ≥ próg stają się białe (255),
              pozostałe czarne (0).
            </p>
          </div>
        );

      case "percentBlack":
        return (
          <div className="binarization-controls">
            <h4>Procentowa selekcja czarnego</h4>
            <div className="control-group">
              <label>Procent czarnych pikseli:</label>
              <input
                type="range"
                min="1"
                max="99"
                value={binarizationParams.percentBlack.percentage}
                onChange={(e) => updateBinarizationParam("percentBlack", "percentage", e.target.value)}
              />
              <span>{binarizationParams.percentBlack.percentage}%</span>
            </div>
            <p className="description">
              Próg jest wybierany tak, aby określony procent pikseli stał się czarny. Obliczony próg:{" "}
              <strong>{calculatedThreshold}</strong>
            </p>
          </div>
        );

      case "meanIterative":
        return (
          <div className="binarization-controls">
            <h4>Selekcja iteratywna średniej</h4>
            <p className="description">
              Metoda iteracyjna, która rozpoczyna od początkowego progu i iteracyjnie oblicza średnie intensywności dla
              obiektów i tła, aktualizując próg jako ich średnią arytmetyczną.
              <br />
              Obliczony próg: <strong>{calculatedThreshold}</strong>
            </p>
          </div>
        );

      case "entropy":
        return (
          <div className="binarization-controls">
            <h4>Selekcja entropii (Kapur)</h4>
            <p className="description">
              Wybiera próg maksymalizujący entropię informacji w obu klasach (obiekt i tło). Metoda Kapur'a znajduje
              próg dający maksymalną sumę entropii.
              <br />
              Obliczony próg: <strong>{calculatedThreshold}</strong>
            </p>
          </div>
        );

      case "minimumError":
        return (
          <div className="binarization-controls">
            <h4>Błąd minimalny (Kittler-Illingworth)</h4>
            <p className="description">
              Minimalizuje błąd klasyfikacji przy założeniu, że rozkłady intensywności w obu klasach są gaussowskie.
              Znajduje próg minimalizujący całkowity błąd klasyfikacji.
              <br />
              Obliczony próg: <strong>{calculatedThreshold}</strong>
            </p>
          </div>
        );

      case "fuzzyMinimumError":
        return (
          <div className="binarization-controls">
            <h4>Rozmyty błąd minimalny</h4>
            <p className="description">
              Rozszerzenie metody błędu minimalnego używające logiki rozmytej. Piksele mogą należeć do obu klas z
              różnymi stopniami przynależności.
              <br />
              Obliczony próg: <strong>{calculatedThreshold}</strong>
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  if (!loadedImage) {
    return (
      <div className="binarization-methods" style={{padding: "20px", background: "#f8f9fa", borderRadius: "8px"}}>
        <h3>Metody binaryzacji</h3>
        <p>Wczytaj obraz, aby rozpocząć.</p>
      </div>
    );
  }

  return (
    <div className="binarization-methods">
      <h3>Metody binaryzacji</h3>

      {/* Tab navigation */}
      <div className="tab-navigation">
        <button
          className={activeTab === "manual" ? "active required" : "required"}
          onClick={() => setActiveTab("manual")}
        >
          ✋ Ręczna
        </button>
        <button className={activeTab === "percentBlack" ? "active" : ""} onClick={() => setActiveTab("percentBlack")}>
          📊 Procent czarnego
        </button>
        <button className={activeTab === "meanIterative" ? "active" : ""} onClick={() => setActiveTab("meanIterative")}>
          🔄 Iteratywna średnia
        </button>
        <button className={activeTab === "entropy" ? "active" : ""} onClick={() => setActiveTab("entropy")}>
          📊 Entropia
        </button>
        <button className={activeTab === "minimumError" ? "active" : ""} onClick={() => setActiveTab("minimumError")}>
          📈 Błąd minimalny
        </button>
        <button
          className={activeTab === "fuzzyMinimumError" ? "active" : ""}
          onClick={() => setActiveTab("fuzzyMinimumError")}
        >
          🎯 Rozmyty błąd min.
        </button>
      </div>

      {/* Controls */}
      <div className="controls-section">
        {renderControls()}

        <div className="action-buttons">
          <button onClick={applyCurrentBinarization} disabled={isProcessing} className="apply-btn">
            {isProcessing ? "Przetwarzanie..." : "Potwierdź binaryzację"}
          </button>
          <button onClick={resetBinarization} disabled={isProcessing} className="reset-btn">
            Resetuj do oryginału
          </button>
        </div>
      </div>

      {/* Canvas for image preview */}
      <div className="image-preview">
        <h4>Podgląd binaryzacji</h4>
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
          {calculatedThreshold !== null && <span> | Próg: {calculatedThreshold}</span>}
        </p>
      </div>

      <style jsx>{`
        .binarization-methods {
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
          padding: 8px 12px;
          border: none;
          background: #e9ecef;
          cursor: pointer;
          border-radius: 4px 4px 0 0;
          transition: background-color 0.2s;
          font-size: 12px;
          white-space: nowrap;
        }

        .tab-navigation button:hover {
          background: #dee2e6;
        }

        .tab-navigation button.active {
          background: #007bff;
          color: white;
        }

        .tab-navigation button.required {
          border: 2px solid #28a745;
        }

        .tab-navigation button.required.active {
          background: #28a745;
        }

        .controls-section {
          background: white;
          padding: 20px;
          border-radius: 6px;
          margin-bottom: 20px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .binarization-controls h4 {
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
          min-width: 150px;
          font-weight: bold;
        }

        .control-group input[type="range"] {
          flex: 1;
          max-width: 200px;
        }

        .control-group span {
          min-width: 50px;
          text-align: right;
          font-weight: bold;
        }

        .description {
          font-size: 13px;
          color: #666;
          margin: 15px 0;
          padding: 12px;
          background: #f8f9fa;
          border-radius: 4px;
          border-left: 3px solid #007bff;
          line-height: 1.4;
        }

        .action-buttons {
          display: flex;
          gap: 10px;
          margin-top: 20px;
          flex-wrap: wrap;
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

export default BinarizationMethods;
