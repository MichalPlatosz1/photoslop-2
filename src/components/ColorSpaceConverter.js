import React, {useState, useEffect} from "react";

const ColorSpaceConverter = ({onColorChange, initialColor = "#000000"}) => {
  const [rgb, setRgb] = useState({r: 0, g: 0, b: 0});
  const [cmyk, setCmyk] = useState({c: 0, m: 0, y: 0, k: 100});

  const [activeMode, setActiveMode] = useState("RGB");

  const [rgbInputs, setRgbInputs] = useState({r: "0", g: "0", b: "0"});
  const [cmykInputs, setCmykInputs] = useState({c: "0", m: "0", y: "0", k: "100"});

  const rgbToCmyk = (r, g, b) => {
    // Normalizacja RGB do zakresu 0-1
    const rNorm = r / 255;
    const gNorm = g / 255;
    const bNorm = b / 255;

    // Obliczenie K (Key/Black)
    const k = 1 - Math.max(rNorm, Math.max(gNorm, bNorm));

    // Obliczenie C, M, Y
    let c, m, y;
    if (k === 1) {
      // Gdy kolor jest czarny
      c = m = y = 0;
    } else {
      c = (1 - rNorm - k) / (1 - k);
      m = (1 - gNorm - k) / (1 - k);
      y = (1 - bNorm - k) / (1 - k);
    }

    return {
      c: Math.round(c * 100),
      m: Math.round(m * 100),
      y: Math.round(y * 100),
      k: Math.round(k * 100),
    };
  };

  const cmykToRgb = (c, m, y, k) => {
    // Normalizacja CMYK do zakresu 0-1
    const cNorm = c / 100;
    const mNorm = m / 100;
    const yNorm = y / 100;
    const kNorm = k / 100;

    // Obliczenie RGB
    const r = 255 * (1 - cNorm) * (1 - kNorm);
    const g = 255 * (1 - mNorm) * (1 - kNorm);
    const b = 255 * (1 - yNorm) * (1 - kNorm);

    return {
      r: Math.round(Math.max(0, Math.min(255, r))),
      g: Math.round(Math.max(0, Math.min(255, g))),
      b: Math.round(Math.max(0, Math.min(255, b))),
    };
  };

  const rgbToHex = (r, g, b) => {
    const toHex = (n) => {
      const hex = Math.round(Math.max(0, Math.min(255, n))).toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : {r: 0, g: 0, b: 0};
  };

  useEffect(() => {
    const initialRgb = hexToRgb(initialColor);
    setRgb(initialRgb);
    setRgbInputs({r: initialRgb.r.toString(), g: initialRgb.g.toString(), b: initialRgb.b.toString()});

    const initialCmyk = rgbToCmyk(initialRgb.r, initialRgb.g, initialRgb.b);
    setCmyk(initialCmyk);
    setCmykInputs({
      c: initialCmyk.c.toString(),
      m: initialCmyk.m.toString(),
      y: initialCmyk.y.toString(),
      k: initialCmyk.k.toString(),
    });
  }, [initialColor]);

  const updateRgb = (newRgb) => {
    setRgb(newRgb);
    setRgbInputs({r: newRgb.r.toString(), g: newRgb.g.toString(), b: newRgb.b.toString()});

    const newCmyk = rgbToCmyk(newRgb.r, newRgb.g, newRgb.b);
    setCmyk(newCmyk);
    setCmykInputs({
      c: newCmyk.c.toString(),
      m: newCmyk.m.toString(),
      y: newCmyk.y.toString(),
      k: newCmyk.k.toString(),
    });

    if (onColorChange) {
      onColorChange(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
    }
  };

  const updateCmyk = (newCmyk) => {
    setCmyk(newCmyk);
    setCmykInputs({
      c: newCmyk.c.toString(),
      m: newCmyk.m.toString(),
      y: newCmyk.y.toString(),
      k: newCmyk.k.toString(),
    });

    const newRgb = cmykToRgb(newCmyk.c, newCmyk.m, newCmyk.y, newCmyk.k);
    setRgb(newRgb);
    setRgbInputs({r: newRgb.r.toString(), g: newRgb.g.toString(), b: newRgb.b.toString()});

    if (onColorChange) {
      onColorChange(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
    }
  };

  const handleRgbSliderChange = (component, value) => {
    const newValue = parseInt(value);
    const newRgb = {...rgb, [component]: newValue};
    updateRgb(newRgb);
  };

  const handleRgbInputChange = (component, value) => {
    setRgbInputs({...rgbInputs, [component]: value});

    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 255) {
      const newRgb = {...rgb, [component]: numValue};
      updateRgb(newRgb);
    }
  };

  const handleCmykSliderChange = (component, value) => {
    const newValue = parseInt(value);
    const newCmyk = {...cmyk, [component]: newValue};
    updateCmyk(newCmyk);
  };

  const handleCmykInputChange = (component, value) => {
    setCmykInputs({...cmykInputs, [component]: value});

    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
      const newCmyk = {...cmyk, [component]: numValue};
      updateCmyk(newCmyk);
    }
  };

  const currentColor = rgbToHex(rgb.r, rgb.g, rgb.b);

  return (
    <div
      style={{
        padding: "20px",
        border: "1px solid #ccc",
        borderRadius: "8px",
        backgroundColor: "#f9f9f9",
        maxWidth: "500px",
        margin: "10px",
      }}
    >
      <h3 style={{marginTop: 0, textAlign: "center", color: "#333"}}>Konwerter Przestrzeni Barw RGB ↔ CMYK</h3>

      {/* Mode */}
      <div style={{textAlign: "center", marginBottom: "20px"}}>
        <button
          onClick={() => setActiveMode("RGB")}
          style={{
            padding: "8px 16px",
            marginRight: "10px",
            backgroundColor: activeMode === "RGB" ? "#007bff" : "#e9ecef",
            color: activeMode === "RGB" ? "white" : "#333",
            border: "1px solid #ccc",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Tryb RGB
        </button>
        <button
          onClick={() => setActiveMode("CMYK")}
          style={{
            padding: "8px 16px",
            backgroundColor: activeMode === "CMYK" ? "#007bff" : "#e9ecef",
            color: activeMode === "CMYK" ? "white" : "#333",
            border: "1px solid #ccc",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Tryb CMYK
        </button>
      </div>

      {/* Preview */}
      <div style={{textAlign: "center", marginBottom: "20px"}}>
        <div
          style={{
            width: "100px",
            height: "100px",
            backgroundColor: currentColor,
            border: "2px solid #333",
            borderRadius: "8px",
            margin: "0 auto 10px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
          }}
        />
        <div style={{fontSize: "14px", fontWeight: "bold", color: "#333"}}>{currentColor.toUpperCase()}</div>
      </div>

      {/*RGB */}
      <div
        style={{
          marginBottom: "20px",
          padding: "15px",
          border: "1px solid #ddd",
          borderRadius: "6px",
          backgroundColor: activeMode === "RGB" ? "#fff" : "#f5f5f5",
        }}
      >
        <h4 style={{margin: "0 0 15px 0", color: "#333"}}>RGB (Red, Green, Blue)</h4>

        {/* Red */}
        <div style={{marginBottom: "10px"}}>
          <label style={{display: "block", marginBottom: "5px", fontSize: "12px", fontWeight: "bold"}}>
            Red (0-255): {rgb.r}
          </label>
          <div style={{display: "flex", alignItems: "center", gap: "10px"}}>
            <input
              type="range"
              min="0"
              max="255"
              value={rgb.r}
              onChange={(e) => handleRgbSliderChange("r", e.target.value)}
              disabled={activeMode !== "RGB"}
              style={{
                flex: 1,
                accentColor: "#ff0000",
                opacity: activeMode === "RGB" ? 1 : 0.6,
              }}
            />
            <input
              type="number"
              min="0"
              max="255"
              value={rgbInputs.r}
              onChange={(e) => handleRgbInputChange("r", e.target.value)}
              disabled={activeMode !== "RGB"}
              style={{
                width: "60px",
                padding: "4px",
                border: "1px solid #ccc",
                borderRadius: "3px",
                opacity: activeMode === "RGB" ? 1 : 0.6,
              }}
            />
          </div>
        </div>

        {/* Green */}
        <div style={{marginBottom: "10px"}}>
          <label style={{display: "block", marginBottom: "5px", fontSize: "12px", fontWeight: "bold"}}>
            Green (0-255): {rgb.g}
          </label>
          <div style={{display: "flex", alignItems: "center", gap: "10px"}}>
            <input
              type="range"
              min="0"
              max="255"
              value={rgb.g}
              onChange={(e) => handleRgbSliderChange("g", e.target.value)}
              disabled={activeMode !== "RGB"}
              style={{
                flex: 1,
                accentColor: "#00ff00",
                opacity: activeMode === "RGB" ? 1 : 0.6,
              }}
            />
            <input
              type="number"
              min="0"
              max="255"
              value={rgbInputs.g}
              onChange={(e) => handleRgbInputChange("g", e.target.value)}
              disabled={activeMode !== "RGB"}
              style={{
                width: "60px",
                padding: "4px",
                border: "1px solid #ccc",
                borderRadius: "3px",
                opacity: activeMode === "RGB" ? 1 : 0.6,
              }}
            />
          </div>
        </div>

        {/* Blue */}
        <div style={{marginBottom: "10px"}}>
          <label style={{display: "block", marginBottom: "5px", fontSize: "12px", fontWeight: "bold"}}>
            Blue (0-255): {rgb.b}
          </label>
          <div style={{display: "flex", alignItems: "center", gap: "10px"}}>
            <input
              type="range"
              min="0"
              max="255"
              value={rgb.b}
              onChange={(e) => handleRgbSliderChange("b", e.target.value)}
              disabled={activeMode !== "RGB"}
              style={{
                flex: 1,
                accentColor: "#0000ff",
                opacity: activeMode === "RGB" ? 1 : 0.6,
              }}
            />
            <input
              type="number"
              min="0"
              max="255"
              value={rgbInputs.b}
              onChange={(e) => handleRgbInputChange("b", e.target.value)}
              disabled={activeMode !== "RGB"}
              style={{
                width: "60px",
                padding: "4px",
                border: "1px solid #ccc",
                borderRadius: "3px",
                opacity: activeMode === "RGB" ? 1 : 0.6,
              }}
            />
          </div>
        </div>
      </div>

      {/* CMYK */}
      <div
        style={{
          marginBottom: "20px",
          padding: "15px",
          border: "1px solid #ddd",
          borderRadius: "6px",
          backgroundColor: activeMode === "CMYK" ? "#fff" : "#f5f5f5",
        }}
      >
        <h4 style={{margin: "0 0 15px 0", color: "#333"}}>CMYK (Cyan, Magenta, Yellow, Key/Black)</h4>

        {/* Cyan */}
        <div style={{marginBottom: "10px"}}>
          <label style={{display: "block", marginBottom: "5px", fontSize: "12px", fontWeight: "bold"}}>
            Cyan (0-100%): {cmyk.c}%
          </label>
          <div style={{display: "flex", alignItems: "center", gap: "10px"}}>
            <input
              type="range"
              min="0"
              max="100"
              value={cmyk.c}
              onChange={(e) => handleCmykSliderChange("c", e.target.value)}
              disabled={activeMode !== "CMYK"}
              style={{
                flex: 1,
                accentColor: "#00ffff",
                opacity: activeMode === "CMYK" ? 1 : 0.6,
              }}
            />
            <input
              type="number"
              min="0"
              max="100"
              value={cmykInputs.c}
              onChange={(e) => handleCmykInputChange("c", e.target.value)}
              disabled={activeMode !== "CMYK"}
              style={{
                width: "60px",
                padding: "4px",
                border: "1px solid #ccc",
                borderRadius: "3px",
                opacity: activeMode === "CMYK" ? 1 : 0.6,
              }}
            />
          </div>
        </div>

        {/* Magenta */}
        <div style={{marginBottom: "10px"}}>
          <label style={{display: "block", marginBottom: "5px", fontSize: "12px", fontWeight: "bold"}}>
            Magenta (0-100%): {cmyk.m}%
          </label>
          <div style={{display: "flex", alignItems: "center", gap: "10px"}}>
            <input
              type="range"
              min="0"
              max="100"
              value={cmyk.m}
              onChange={(e) => handleCmykSliderChange("m", e.target.value)}
              disabled={activeMode !== "CMYK"}
              style={{
                flex: 1,
                accentColor: "#ff00ff",
                opacity: activeMode === "CMYK" ? 1 : 0.6,
              }}
            />
            <input
              type="number"
              min="0"
              max="100"
              value={cmykInputs.m}
              onChange={(e) => handleCmykInputChange("m", e.target.value)}
              disabled={activeMode !== "CMYK"}
              style={{
                width: "60px",
                padding: "4px",
                border: "1px solid #ccc",
                borderRadius: "3px",
                opacity: activeMode === "CMYK" ? 1 : 0.6,
              }}
            />
          </div>
        </div>

        {/* Yellow */}
        <div style={{marginBottom: "10px"}}>
          <label style={{display: "block", marginBottom: "5px", fontSize: "12px", fontWeight: "bold"}}>
            Yellow (0-100%): {cmyk.y}%
          </label>
          <div style={{display: "flex", alignItems: "center", gap: "10px"}}>
            <input
              type="range"
              min="0"
              max="100"
              value={cmyk.y}
              onChange={(e) => handleCmykSliderChange("y", e.target.value)}
              disabled={activeMode !== "CMYK"}
              style={{
                flex: 1,
                accentColor: "#ffff00",
                opacity: activeMode === "CMYK" ? 1 : 0.6,
              }}
            />
            <input
              type="number"
              min="0"
              max="100"
              value={cmykInputs.y}
              onChange={(e) => handleCmykInputChange("y", e.target.value)}
              disabled={activeMode !== "CMYK"}
              style={{
                width: "60px",
                padding: "4px",
                border: "1px solid #ccc",
                borderRadius: "3px",
                opacity: activeMode === "CMYK" ? 1 : 0.6,
              }}
            />
          </div>
        </div>

        {/* Key/Black */}
        <div style={{marginBottom: "10px"}}>
          <label style={{display: "block", marginBottom: "5px", fontSize: "12px", fontWeight: "bold"}}>
            Key/Black (0-100%): {cmyk.k}%
          </label>
          <div style={{display: "flex", alignItems: "center", gap: "10px"}}>
            <input
              type="range"
              min="0"
              max="100"
              value={cmyk.k}
              onChange={(e) => handleCmykSliderChange("k", e.target.value)}
              disabled={activeMode !== "CMYK"}
              style={{
                flex: 1,
                accentColor: "#000000",
                opacity: activeMode === "CMYK" ? 1 : 0.6,
              }}
            />
            <input
              type="number"
              min="0"
              max="100"
              value={cmykInputs.k}
              onChange={(e) => handleCmykInputChange("k", e.target.value)}
              disabled={activeMode !== "CMYK"}
              style={{
                width: "60px",
                padding: "4px",
                border: "1px solid #ccc",
                borderRadius: "3px",
                opacity: activeMode === "CMYK" ? 1 : 0.6,
              }}
            />
          </div>
        </div>
      </div>

      {/* Displaying values of colors */}
      <div
        style={{
          padding: "10px",
          backgroundColor: "#e9ecef",
          borderRadius: "4px",
          fontSize: "12px",
          fontFamily: "monospace",
        }}
      >
        <div style={{marginBottom: "5px"}}>
          <strong>RGB:</strong> R={rgb.r}, G={rgb.g}, B={rgb.b} | <strong>HEX:</strong> {currentColor}
        </div>
        <div>
          <strong>CMYK:</strong> C={cmyk.c}%, M={cmyk.m}%, Y={cmyk.y}%, K={cmyk.k}%
        </div>
      </div>
    </div>
  );
};

export default ColorSpaceConverter;
