import React, { useState, useRef, useEffect, useCallback } from 'react';

const BezierCurve = () => {
  const canvasRef = useRef(null);
  const [degree, setDegree] = useState(3); // Domyślnie krzywa kubiczna
  const [controlPoints, setControlPoints] = useState([]);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [curveResolution, setCurveResolution] = useState(100);
  const [showControlPolygon, setShowControlPolygon] = useState(true);
  const [showControlPoints, setShowControlPoints] = useState(true);

  const POINT_RADIUS = 8;
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;

  // Inicjalizacja punktów kontrolnych gdy zmienia się stopień
  useEffect(() => {
    const newPoints = [];
    const numPoints = degree + 1;
    
    for (let i = 0; i < numPoints; i++) {
      const x = (CANVAS_WIDTH / (numPoints + 1)) * (i + 1);
      const y = CANVAS_HEIGHT / 2 + Math.sin((i / (numPoints - 1)) * Math.PI) * 100;
      newPoints.push({ x: Math.round(x), y: Math.round(y) });
    }
    
    setControlPoints(newPoints);
  }, [degree]);

  // Oblicz wartość krzywej Béziera dla parametru t
  const calculateBezierPoint = useCallback((t, points) => {
    const n = points.length - 1;
    let x = 0;
    let y = 0;

    for (let i = 0; i <= n; i++) {
      const binomial = binomialCoefficient(n, i);
      const bernstein = binomial * Math.pow(1 - t, n - i) * Math.pow(t, i);
      x += bernstein * points[i].x;
      y += bernstein * points[i].y;
    }

    return { x, y };
  }, []);

  // Oblicz współczynnik dwumianowy
  const binomialCoefficient = (n, k) => {
    if (k > n) return 0;
    if (k === 0 || k === n) return 1;

    let result = 1;
    for (let i = 0; i < Math.min(k, n - k); i++) {
      result = (result * (n - i)) / (i + 1);
    }
    return result;
  };

  // Znajdź najbliższy punkt kontrolny do pozycji myszy
  const findNearestControlPoint = useCallback((mouseX, mouseY) => {
    for (let i = 0; i < controlPoints.length; i++) {
      const point = controlPoints[i];
      const distance = Math.sqrt((mouseX - point.x) ** 2 + (mouseY - point.y) ** 2);
      if (distance <= POINT_RADIUS) {
        return i;
      }
    }
    return null;
  }, [controlPoints]);

  // Rysuj krzywą Béziera
  const drawBezierCurve = useCallback((ctx) => {
    if (controlPoints.length < 2) return;

    ctx.strokeStyle = '#007bff';
    ctx.lineWidth = 3;
    ctx.beginPath();

    const firstPoint = calculateBezierPoint(0, controlPoints);
    ctx.moveTo(firstPoint.x, firstPoint.y);

    for (let i = 1; i <= curveResolution; i++) {
      const t = i / curveResolution;
      const point = calculateBezierPoint(t, controlPoints);
      ctx.lineTo(point.x, point.y);
    }

    ctx.stroke();
  }, [controlPoints, curveResolution, calculateBezierPoint]);

  // Rysuj wielokąt kontrolny
  const drawControlPolygon = useCallback((ctx) => {
    if (!showControlPolygon || controlPoints.length < 2) return;

    ctx.strokeStyle = '#6c757d';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();

    ctx.moveTo(controlPoints[0].x, controlPoints[0].y);
    for (let i = 1; i < controlPoints.length; i++) {
      ctx.lineTo(controlPoints[i].x, controlPoints[i].y);
    }

    ctx.stroke();
    ctx.setLineDash([]);
  }, [controlPoints, showControlPolygon]);

  // Rysuj punkty kontrolne
  const drawControlPoints = useCallback((ctx) => {
    if (!showControlPoints) return;

    controlPoints.forEach((point, index) => {
      // Punkt
      ctx.fillStyle = selectedPoint === index ? '#ff6b6b' : '#28a745';
      ctx.beginPath();
      ctx.arc(point.x, point.y, POINT_RADIUS, 0, 2 * Math.PI);
      ctx.fill();

      // Obramowanie
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Numer punktu
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(index.toString(), point.x, point.y);
    });
  }, [controlPoints, selectedPoint, showControlPoints]);

  // Główna funkcja rysowania
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    // Wyczyść canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Tło
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Siatka
    ctx.strokeStyle = '#e9ecef';
    ctx.lineWidth = 1;
    const gridSize = 50;
    
    for (let x = 0; x <= CANVAS_WIDTH; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    
    for (let y = 0; y <= CANVAS_HEIGHT; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }

    // Rysuj elementy krzywej
    drawControlPolygon(ctx);
    drawBezierCurve(ctx);
    drawControlPoints(ctx);
  }, [drawControlPolygon, drawBezierCurve, drawControlPoints]);

  // Efekt rysowania
  useEffect(() => {
    draw();
  }, [draw]);

  // Obsługa myszy - rozpoczęcie przeciągania
  const handleMouseDown = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const pointIndex = findNearestControlPoint(mouseX, mouseY);
    
    if (pointIndex !== null) {
      setSelectedPoint(pointIndex);
      setIsDragging(true);
      canvas.style.cursor = 'grabbing';
    }
  };

  // Obsługa myszy - przeciąganie
  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (isDragging && selectedPoint !== null) {
      // Aktualizuj pozycję punktu w czasie rzeczywistym
      const newPoints = [...controlPoints];
      newPoints[selectedPoint] = {
        x: Math.max(0, Math.min(CANVAS_WIDTH, mouseX)),
        y: Math.max(0, Math.min(CANVAS_HEIGHT, mouseY))
      };
      setControlPoints(newPoints);
    } else {
      // Zmień kursor gdy najeżdżamy na punkt
      const pointIndex = findNearestControlPoint(mouseX, mouseY);
      canvas.style.cursor = pointIndex !== null ? 'grab' : 'default';
    }
  };

  // Obsługa myszy - zakończenie przeciągania
  const handleMouseUp = () => {
    setIsDragging(false);
    setSelectedPoint(null);
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.cursor = 'default';
    }
  };

  // Zmiana stopnia krzywej
  const handleDegreeChange = (newDegree) => {
    if (newDegree >= 1 && newDegree <= 10) {
      setDegree(newDegree);
    }
  };

  // Aktualizacja punktu przez pole tekstowe
  const updatePointCoordinate = (pointIndex, coordinate, value) => {
    const numValue = parseInt(value) || 0;
    const newPoints = [...controlPoints];
    
    if (coordinate === 'x') {
      newPoints[pointIndex].x = Math.max(0, Math.min(CANVAS_WIDTH, numValue));
    } else {
      newPoints[pointIndex].y = Math.max(0, Math.min(CANVAS_HEIGHT, numValue));
    }
    
    setControlPoints(newPoints);
  };

  // Resetuj punkty kontrolne
  const resetControlPoints = () => {
    const newPoints = [];
    const numPoints = degree + 1;
    
    for (let i = 0; i < numPoints; i++) {
      const x = (CANVAS_WIDTH / (numPoints + 1)) * (i + 1);
      const y = CANVAS_HEIGHT / 2 + Math.sin((i / (numPoints - 1)) * Math.PI) * 100;
      newPoints.push({ x: Math.round(x), y: Math.round(y) });
    }
    
    setControlPoints(newPoints);
  };

  return (
    <div className="bezier-curve">
      <h3>Krzywa Béziera</h3>
      
      {/* Kontrolki */}
      <div className="controls-section">
        <div className="curve-settings">
          <h4>Ustawienia krzywej</h4>
          
          <div className="control-group">
            <label>Stopień krzywej:</label>
            <input
              type="number"
              min="1"
              max="10"
              value={degree}
              onChange={(e) => handleDegreeChange(parseInt(e.target.value))}
            />
            <span className="info">({degree + 1} punktów kontrolnych)</span>
          </div>

          <div className="control-group">
            <label>Rozdzielczość krzywej:</label>
            <input
              type="range"
              min="20"
              max="200"
              value={curveResolution}
              onChange={(e) => setCurveResolution(parseInt(e.target.value))}
            />
            <span>{curveResolution} segmentów</span>
          </div>

          <div className="checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={showControlPolygon}
                onChange={(e) => setShowControlPolygon(e.target.checked)}
              />
              Pokaż wielokąt kontrolny
            </label>
          </div>

          <div className="checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={showControlPoints}
                onChange={(e) => setShowControlPoints(e.target.checked)}
              />
              Pokaż punkty kontrolne
            </label>
          </div>

          <button onClick={resetControlPoints} className="reset-btn">
            Zresetuj punkty
          </button>
        </div>

        {/* Punkty kontrolne */}
        <div className="control-points-section">
          <h4>Punkty kontrolne</h4>
          <div className="points-grid">
            {controlPoints.map((point, index) => (
              <div key={index} className="point-editor">
                <strong>P{index}:</strong>
                <div className="coordinate-inputs">
                  <label>X:</label>
                  <input
                    type="number"
                    min="0"
                    max={CANVAS_WIDTH}
                    value={Math.round(point.x)}
                    onChange={(e) => updatePointCoordinate(index, 'x', e.target.value)}
                  />
                  <label>Y:</label>
                  <input
                    type="number"
                    min="0"
                    max={CANVAS_HEIGHT}
                    value={Math.round(point.y)}
                    onChange={(e) => updatePointCoordinate(index, 'y', e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="canvas-section">
        <h4>Krzywa Béziera stopnia {degree}</h4>
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            border: '2px solid #007bff',
            borderRadius: '8px',
            cursor: 'default',
            display: 'block',
            margin: '0 auto'
          }}
        />
        <div className="canvas-info">
          <p>
            <strong>Instrukcja:</strong> Kliknij i przeciągnij punkty kontrolne aby modyfikować krzywą w czasie rzeczywistym.
            Możesz także edytować współrzędne punktów w polach powyżej.
          </p>
        </div>
      </div>

      <style jsx>{`
        .bezier-curve {
          padding: 20px;
          background: #f8f9fa;
          border-radius: 8px;
          margin: 20px 0;
        }

        .controls-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 30px;
        }

        .curve-settings,
        .control-points-section {
          background: white;
          padding: 20px;
          border-radius: 6px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .curve-settings h4,
        .control-points-section h4 {
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
          min-width: 140px;
          font-weight: bold;
        }

        .control-group input[type="number"] {
          width: 80px;
          padding: 5px;
          border: 1px solid #ccc;
          border-radius: 4px;
        }

        .control-group input[type="range"] {
          flex: 1;
          max-width: 150px;
        }

        .info {
          font-size: 12px;
          color: #666;
        }

        .checkbox-group {
          margin-bottom: 10px;
        }

        .checkbox-group label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: normal;
          cursor: pointer;
        }

        .reset-btn {
          background: #6c757d;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
          margin-top: 10px;
        }

        .reset-btn:hover {
          background: #545b62;
        }

        .points-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
        }

        .point-editor {
          padding: 10px;
          background: #f8f9fa;
          border-radius: 4px;
          border: 1px solid #dee2e6;
        }

        .coordinate-inputs {
          display: grid;
          grid-template-columns: auto 1fr auto 1fr;
          gap: 5px;
          align-items: center;
          margin-top: 5px;
        }

        .coordinate-inputs label {
          font-size: 12px;
          font-weight: bold;
        }

        .coordinate-inputs input {
          width: 100%;
          padding: 4px;
          border: 1px solid #ccc;
          border-radius: 3px;
          font-size: 12px;
        }

        .canvas-section {
          background: white;
          padding: 20px;
          border-radius: 6px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          text-align: center;
        }

        .canvas-section h4 {
          margin-top: 0;
          color: #333;
          border-bottom: 2px solid #007bff;
          padding-bottom: 8px;
        }

        .canvas-info {
          margin-top: 15px;
          padding: 10px;
          background: #e7f3ff;
          border-radius: 4px;
          border-left: 4px solid #007bff;
        }

        .canvas-info p {
          margin: 0;
          font-size: 14px;
          color: #333;
        }

        @media (max-width: 768px) {
          .controls-section {
            grid-template-columns: 1fr;
          }
          
          .points-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default BezierCurve;