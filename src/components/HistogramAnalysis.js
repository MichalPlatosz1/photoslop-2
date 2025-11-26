import React, {useState, useRef, useEffect, useCallback} from "react";

const HistogramAnalysis = ({loadedImage, onImageTransformed}) => {
  const canvasRef = useRef(null);
  const histogramCanvasRef = useRef(null);
  const originalImageRef = useRef(null);

  const [activeTab, setActiveTab] = useState("histogram");
  const [isProcessing, setIsProcessing] = useState(false);
  const [histogramData, setHistogramData] = useState(null);

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

  // Draw histogram on canvas
  const drawHistogram = useCallback(
    (histogram) => {
      const canvas = histogramCanvasRef.current;
      if (!canvas || !histogram) return;

      const ctx = canvas.getContext("2d");
      const width = 640; // 2.5 pixels per intensity level
      const height = 280;
      const padding = {top: 20, right: 30, bottom: 40, left: 50};
      const chartWidth = width - padding.left - padding.right;
      const chartHeight = height - padding.top - padding.bottom;

      canvas.width = width;
      canvas.height = height;

      // Create gradient background
      const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
      bgGradient.addColorStop(0, "#f8f9fa");
      bgGradient.addColorStop(1, "#e9ecef");
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      // Draw grid
      ctx.strokeStyle = "#dee2e6";
      ctx.lineWidth = 0.5;
      ctx.globalAlpha = 0.8;

      // Vertical grid lines (every 32 intensity levels)
      for (let i = 0; i <= 8; i++) {
        const x = padding.left + (i * chartWidth) / 8;
        ctx.beginPath();
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, padding.top + chartHeight);
        ctx.stroke();
      }

      // Horizontal grid lines
      for (let i = 0; i <= 4; i++) {
        const y = padding.top + (i * chartHeight) / 4;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + chartWidth, y);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;

      // Find maximum value for scaling
      const maxRed = Math.max(...histogram.red);
      const maxGreen = Math.max(...histogram.green);
      const maxBlue = Math.max(...histogram.blue);
      const maxGray = Math.max(...histogram.gray);
      const maxValue = Math.max(maxRed, maxGreen, maxBlue, maxGray);

      if (maxValue === 0) return;

      // Logarithmiczna funkcja skalowania
      const logScale = (value) => {
        if (value === 0) return 0;
        // Użyj logarytmu naturalnego z offsetem dla lepszej wizualizacji
        return Math.log(value + 1) / Math.log(maxValue + 1);
      };

      // Draw histograms with smooth curves
      const drawChannel = (channelData, color, gradientColor, alpha = 0.8) => {
        ctx.globalAlpha = alpha;

        // Create gradient for fill
        const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
        gradient.addColorStop(0, gradientColor);
        gradient.addColorStop(1, color + "20"); // Add transparency

        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top + chartHeight);

        // Draw smooth histogram curve - z logarytmiczną skalą
        for (let i = 0; i < 256; i++) {
          const frequency = channelData[i]; // liczba pikseli o intensywności i
          const logHeight = logScale(frequency) * chartHeight; // logarytmiczna wysokość
          const x = padding.left + (i / 255) * chartWidth; // pozycja X = intensywność
          const y = padding.top + chartHeight - logHeight; // pozycja Y = częstość (odwrócona)

          if (i === 0) {
            ctx.lineTo(x, y);
          } else {
            // Smooth curve using quadratic curves
            const prevX = padding.left + ((i - 1) / 255) * chartWidth;
            const prevFrequency = channelData[i - 1];
            const prevLogHeight = logScale(prevFrequency) * chartHeight;
            const prevY = padding.top + chartHeight - prevLogHeight;
            const cpX = (prevX + x) / 2;

            ctx.quadraticCurveTo(cpX, prevY, x, y);
          }
        }

        ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
        ctx.closePath();

        // Fill with gradient
        ctx.fillStyle = gradient;
        ctx.fill();

        // Draw outline
        ctx.globalAlpha = alpha + 0.2;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();

        const firstFreq = channelData[0];
        const firstLogHeight = logScale(firstFreq) * chartHeight;
        ctx.moveTo(padding.left, padding.top + chartHeight - firstLogHeight);

        for (let i = 1; i < 256; i++) {
          const frequency = channelData[i];
          const logHeight = logScale(frequency) * chartHeight;
          const x = padding.left + (i / 255) * chartWidth;
          const y = padding.top + chartHeight - logHeight;
          ctx.lineTo(x, y);
        }

        ctx.stroke();
      };

      // Draw RGB channels or grayscale
      if (activeTab === "histogram") {
        drawChannel(histogram.blue, "#0066ff", "#0066ff80", 0.6);
        drawChannel(histogram.green, "#00cc44", "#00cc4480", 0.6);
        drawChannel(histogram.red, "#ff3333", "#ff333380", 0.6);
      } else {
        drawChannel(histogram.gray, "#333333", "#33333380", 0.8);
      }

      // Draw chart border
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "#495057";
      ctx.lineWidth = 2;
      ctx.strokeRect(padding.left, padding.top, chartWidth, chartHeight);

      // Draw axes labels and values
      ctx.fillStyle = "#495057";
      ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = "center";

      // X-axis labels (intensity values)
      const xLabels = [0, 64, 128, 192, 255];
      xLabels.forEach((value) => {
        const x = padding.left + (value / 255) * chartWidth;
        ctx.fillText(value.toString(), x, height - 15);

        // Draw tick marks
        ctx.beginPath();
        ctx.moveTo(x, padding.top + chartHeight);
        ctx.lineTo(x, padding.top + chartHeight + 5);
        ctx.stroke();
      });

      // Y-axis labels (logarithmic frequency)
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      for (let i = 0; i <= 4; i++) {
        const logPosition = i / 4; // pozycja względna na osi
        // Odwrotność funkcji logarytmicznej dla etykiet
        const actualValue = Math.round(Math.pow(maxValue + 1, logPosition) - 1);
        const y = padding.top + ((4 - i) * chartHeight) / 4;

        if (actualValue >= 0) {
          // Formatowanie etykiet dla lepszej czytelności
          let label;
          if (actualValue >= 10000) {
            label = (actualValue / 1000).toFixed(0) + "k";
          } else if (actualValue >= 1000) {
            label = (actualValue / 1000).toFixed(1) + "k";
          } else {
            label = actualValue.toString();
          }

          ctx.fillText(label, padding.left - 8, y);
        }

        // Draw tick marks
        ctx.beginPath();
        ctx.moveTo(padding.left - 5, y);
        ctx.lineTo(padding.left, y);
        ctx.stroke();
      }

      // Draw axis titles
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText("Intensywność", width / 2, height - 3);

      // Y-axis title (rotated) - z informacją o skali logarytmicznej
      ctx.save();
      ctx.translate(15, height / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText("Liczba pikseli (log)", 0, 0);
      ctx.restore();

      // Reset text alignment
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
    },
    [activeTab]
  );

  // Calculate histogram data
  const calculateHistogram = useCallback(
    (imageData) => {
      const {data} = imageData;
      const histogram = {
        red: new Array(256).fill(0),
        green: new Array(256).fill(0),
        blue: new Array(256).fill(0),
        gray: new Array(256).fill(0),
      };

      // Sprawdź rzeczywiste wartości w obrazie
      let minR = 255,
        maxR = 0,
        minG = 255,
        maxG = 0,
        minB = 255,
        maxB = 0;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

        // Sprawdź min/max dla debug
        minR = Math.min(minR, r);
        maxR = Math.max(maxR, r);
        minG = Math.min(minG, g);
        maxG = Math.max(maxG, g);
        minB = Math.min(minB, b);
        maxB = Math.max(maxB, b);

        // Upewnij się że wartości są w zakresie 0-255
        if (r >= 0 && r <= 255) histogram.red[r]++;
        if (g >= 0 && g <= 255) histogram.green[g]++;
        if (b >= 0 && b <= 255) histogram.blue[b]++;
        if (gray >= 0 && gray <= 255) histogram.gray[gray]++;
      }

      setHistogramData(histogram);

      // Debug: wyświetl rzeczywiste zakresy wartości
      console.log("Rzeczywiste zakresy kolorów w obrazie:");
      console.log(`Czerwony: ${minR} - ${maxR}`);
      console.log(`Zielony: ${minG} - ${maxG}`);
      console.log(`Niebieski: ${minB} - ${maxB}`);
      console.log("Histogram peaks:");
      console.log(
        "Max Red:",
        Math.max(...histogram.red),
        "at intensity:",
        histogram.red.indexOf(Math.max(...histogram.red))
      );
      console.log(
        "Max Green:",
        Math.max(...histogram.green),
        "at intensity:",
        histogram.green.indexOf(Math.max(...histogram.green))
      );
      console.log(
        "Max Blue:",
        Math.max(...histogram.blue),
        "at intensity:",
        histogram.blue.indexOf(Math.max(...histogram.blue))
      );

      // Sprawdź czy są niezerowe wartości przy 255 dla zielonego
      if (histogram.green[255] > 0) {
        console.log("OSTRZEŻENIE: Znaleziono", histogram.green[255], "pikseli z zielonym = 255");
      }

      drawHistogram(histogram);
    },
    [drawHistogram]
  );

  // Store original image data when component loads or image changes
  useEffect(() => {
    if (loadedImage) {
      originalImageRef.current = {
        data: new Uint8ClampedArray(loadedImage.data),
        width: loadedImage.width,
        height: loadedImage.height,
      };
      displayImage(loadedImage);
      calculateHistogram(loadedImage);
    }
  }, [loadedImage, displayImage, calculateHistogram]);

  // Histogram stretching (normalization)
  const applyHistogramStretching = useCallback((imageData) => {
    const {data} = imageData;
    const result = new Uint8ClampedArray(data);

    // Find min and max values for each channel
    let minR = 255,
      maxR = 0;
    let minG = 255,
      maxG = 0;
    let minB = 255,
      maxB = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      minR = Math.min(minR, r);
      maxR = Math.max(maxR, r);
      minG = Math.min(minG, g);
      maxG = Math.max(maxG, g);
      minB = Math.min(minB, b);
      maxB = Math.max(maxB, b);
    }

    // Apply stretching
    for (let i = 0; i < data.length; i += 4) {
      if (maxR > minR) {
        result[i] = Math.round(((data[i] - minR) / (maxR - minR)) * 255);
      }
      if (maxG > minG) {
        result[i + 1] = Math.round(((data[i + 1] - minG) / (maxG - minG)) * 255);
      }
      if (maxB > minB) {
        result[i + 2] = Math.round(((data[i + 2] - minB) / (maxB - minB)) * 255);
      }
      // Alpha remains unchanged
    }

    return {...imageData, data: result};
  }, []);

  // Histogram equalization
  const applyHistogramEqualization = useCallback((imageData) => {
    const {width, height, data} = imageData;
    const result = new Uint8ClampedArray(data);
    const totalPixels = width * height;

    // Calculate histogram for grayscale
    const histogram = new Array(256).fill(0);
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      histogram[gray]++;
    }

    // Calculate cumulative distribution function (CDF)
    const cdf = new Array(256);
    cdf[0] = histogram[0];
    for (let i = 1; i < 256; i++) {
      cdf[i] = cdf[i - 1] + histogram[i];
    }

    // Normalize CDF
    const cdfMin = cdf.find((val) => val > 0);
    const equalizedLUT = new Array(256);
    for (let i = 0; i < 256; i++) {
      equalizedLUT[i] = Math.round(((cdf[i] - cdfMin) / (totalPixels - cdfMin)) * 255);
    }

    // Apply equalization
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      const newValue = equalizedLUT[gray];

      // Maintain color ratios
      const factor = gray > 0 ? newValue / gray : 1;
      result[i] = Math.min(255, Math.round(data[i] * factor));
      result[i + 1] = Math.min(255, Math.round(data[i + 1] * factor));
      result[i + 2] = Math.min(255, Math.round(data[i + 2] * factor));
      // Alpha remains unchanged
    }

    return {...imageData, data: result};
  }, []);

  // Apply current operation
  const applyCurrentOperation = () => {
    if (!originalImageRef.current) return;

    setIsProcessing(true);

    try {
      let processedImage = {
        data: new Uint8ClampedArray(originalImageRef.current.data),
        width: originalImageRef.current.width,
        height: originalImageRef.current.height,
      };

      switch (activeTab) {
        case "stretching":
          processedImage = applyHistogramStretching(processedImage);
          break;
        case "equalization":
          processedImage = applyHistogramEqualization(processedImage);
          break;
        default:
          // Just display original for histogram view
          break;
      }

      displayImage(processedImage);
      calculateHistogram(processedImage);

      if (onImageTransformed && activeTab !== "histogram") {
        onImageTransformed(processedImage);
      }
    } catch (error) {
      console.error("Error applying histogram operation:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset to original image
  const resetToOriginal = () => {
    if (originalImageRef.current) {
      const originalData = {
        data: new Uint8ClampedArray(originalImageRef.current.data),
        width: originalImageRef.current.width,
        height: originalImageRef.current.height,
      };
      displayImage(originalData);
      calculateHistogram(originalData);

      if (onImageTransformed) {
        onImageTransformed(originalData);
      }
    }
  };

  // Auto-apply when tab changes
  useEffect(() => {
    if (originalImageRef.current) {
      applyCurrentOperation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Redraw histogram when tab changes
  useEffect(() => {
    if (histogramData) {
      drawHistogram(histogramData);
    }
  }, [activeTab, histogramData, drawHistogram]);

  if (!loadedImage) {
    return (
      <div className="histogram-analysis" style={{padding: "20px", background: "#f8f9fa", borderRadius: "8px"}}>
        <h3>Analiza histogramu</h3>
        <p>Wczytaj obraz, aby rozpocząć.</p>
      </div>
    );
  }

  return (
    <div className="histogram-analysis">
      <h3>Analiza histogramu</h3>

      {/* Tab navigation */}
      <div className="tab-navigation">
        <button className={activeTab === "histogram" ? "active" : ""} onClick={() => setActiveTab("histogram")}>
          📊 Histogram RGB
        </button>
        <button className={activeTab === "stretching" ? "active" : ""} onClick={() => setActiveTab("stretching")}>
          📈 Rozciągnięcie
        </button>
        <button className={activeTab === "equalization" ? "active" : ""} onClick={() => setActiveTab("equalization")}>
          ⚖️ Wyrównanie
        </button>
      </div>

      {/* Controls */}
      <div className="controls-section">
        <div className="histogram-info">
          {activeTab === "histogram" && (
            <div>
              <h4>Histogram RGB</h4>
              <p className="description">
                Wyświetla rozkład intensywności pikseli dla każdego kanału kolorów (czerwony, zielony, niebieski).
                <br />
                <strong>Uwaga:</strong> Oś Y używa skali logarytmicznej dla lepszego zobrazowania dominujących barw.
              </p>
            </div>
          )}

          {activeTab === "stretching" && (
            <div>
              <h4>Rozciągnięcie histogramu</h4>
              <p className="description">
                Normalizuje kontrast poprzez rozciągnięcie histogramu na pełny zakres 0-255. Poprawia kontrast w
                obrazach o niskim zakresie tonalnym.
              </p>
            </div>
          )}

          {activeTab === "equalization" && (
            <div>
              <h4>Wyrównanie histogramu</h4>
              <p className="description">
                Redystrybuuje intensywności pikseli dla uzyskania bardziej równomiernego histogramu. Szczególnie
                skuteczne dla obrazów o słabym kontrastie.
              </p>
            </div>
          )}
        </div>

        <div className="action-buttons">
          <button
            onClick={applyCurrentOperation}
            disabled={isProcessing || activeTab === "histogram"}
            className="apply-btn"
          >
            {isProcessing ? "Przetwarzanie..." : "Potwierdź operację"}
          </button>
          <button onClick={resetToOriginal} disabled={isProcessing} className="reset-btn">
            Resetuj do oryginału
          </button>
        </div>
      </div>

      {/* Histogram Display */}
      <div className="histogram-display">
        <h4>Histogram {activeTab === "histogram" ? "RGB" : "po operacji"}</h4>
        <canvas
          ref={histogramCanvasRef}
          style={{
            border: "1px solid #ccc",
            backgroundColor: "#fff",
          }}
        />
        <div className="histogram-legend">
          {activeTab === "histogram" ? (
            <div className="legend-rgb">
              <div className="legend-item legend-red">
                <div className="legend-color legend-color-red"></div>
                <span>Czerwony</span>
              </div>
              <div className="legend-item legend-green">
                <div className="legend-color legend-color-green"></div>
                <span>Zielony</span>
              </div>
              <div className="legend-item legend-blue">
                <div className="legend-color legend-color-blue"></div>
                <span>Niebieski</span>
              </div>
            </div>
          ) : (
            <div className="legend-gray">
              <div className="legend-item">
                <div className="legend-color legend-color-gray"></div>
                <span>Skala szarości</span>
              </div>
            </div>
          )}
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
        .histogram-analysis {
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
          padding: 10px 15px;
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

        .controls-section {
          background: white;
          padding: 20px;
          border-radius: 6px;
          margin-bottom: 20px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .histogram-info h4 {
          margin-top: 0;
          color: #333;
          border-bottom: 2px solid #007bff;
          padding-bottom: 8px;
        }

        .description {
          font-size: 14px;
          color: #666;
          margin: 10px 0;
          padding: 10px;
          background: #f8f9fa;
          border-radius: 4px;
          border-left: 3px solid #007bff;
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

        .histogram-display,
        .image-preview {
          background: white;
          padding: 20px;
          border-radius: 6px;
          margin-bottom: 20px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .histogram-display h4,
        .image-preview h4 {
          margin-top: 0;
          color: #333;
        }

        .histogram-display canvas {
          display: block;
          margin: 15px auto;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          border: 2px solid #e9ecef;
          background: #fff;
        }

        .image-preview canvas {
          display: block;
          margin: 10px auto;
        }

        .histogram-legend {
          margin-top: 15px;
          padding: 10px;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border-radius: 8px;
          border: 1px solid #dee2e6;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .legend-rgb {
          display: flex;
          justify-content: center;
          gap: 20px;
          flex-wrap: wrap;
        }

        .legend-gray {
          display: flex;
          justify-content: center;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 5px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          transition: all 0.2s ease;
          cursor: default;
        }

        .legend-item:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .legend-red {
          background: linear-gradient(135deg, #ff333320 0%, #ff333310 100%);
          color: #cc0000;
          border: 1px solid #ff333340;
        }

        .legend-green {
          background: linear-gradient(135deg, #00cc4420 0%, #00cc4410 100%);
          color: #008833;
          border: 1px solid #00cc4440;
        }

        .legend-blue {
          background: linear-gradient(135deg, #0066ff20 0%, #0066ff10 100%);
          color: #0044cc;
          border: 1px solid #0066ff40;
        }

        .legend-color {
          width: 16px;
          height: 16px;
          border-radius: 4px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .legend-color-red {
          background: linear-gradient(135deg, #ff3333 0%, #cc0000 100%);
        }

        .legend-color-green {
          background: linear-gradient(135deg, #00cc44 0%, #008833 100%);
        }

        .legend-color-blue {
          background: linear-gradient(135deg, #0066ff 0%, #0044cc 100%);
        }

        .legend-color-gray {
          background: linear-gradient(135deg, #666666 0%, #333333 100%);
        }
      `}</style>
    </div>
  );
};

export default HistogramAnalysis;
