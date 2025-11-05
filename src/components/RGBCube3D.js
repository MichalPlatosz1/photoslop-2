import React, {useState, useRef, useEffect} from "react";

const RGBCube3D = ({onColorSelect, initialColor = {r: 127, g: 127, b: 127}}) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  const [rotation, setRotation] = useState({x: 0.5, y: 0.5, z: 0});

  const [isDragging, setIsDragging] = useState(false);
  const [lastMouse, setLastMouse] = useState({x: 0, y: 0});

  const [crossSection, setCrossSection] = useState({
    enabled: false,
    axis: "z",
    value: 0.5,
    position: {x: 300, y: 200},
  });

  const cubeSize = 150;
  const centerX = 200;
  const centerY = 150;

  const rotateX = (angle) => [
    [1, 0, 0],
    [0, Math.cos(angle), -Math.sin(angle)],
    [0, Math.sin(angle), Math.cos(angle)],
  ];

  const rotateY = (angle) => [
    [Math.cos(angle), 0, Math.sin(angle)],
    [0, 1, 0],
    [-Math.sin(angle), 0, Math.cos(angle)],
  ];

  const rotateZ = (angle) => [
    [Math.cos(angle), -Math.sin(angle), 0],
    [Math.sin(angle), Math.cos(angle), 0],
    [0, 0, 1],
  ];

  const multiplyMatrix = (matrix, vector) => [
    matrix[0][0] * vector[0] + matrix[0][1] * vector[1] + matrix[0][2] * vector[2],
    matrix[1][0] * vector[0] + matrix[1][1] * vector[1] + matrix[1][2] * vector[2],
    matrix[2][0] * vector[0] + matrix[2][1] * vector[1] + matrix[2][2] * vector[2],
  ];

  const combineRotations = (rx, ry, rz) => {
    const matX = rotateX(rx);
    const matY = rotateY(ry);
    const matZ = rotateZ(rz);

    let temp = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];

    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        temp[i][j] = matY[i][0] * matX[0][j] + matY[i][1] * matX[1][j] + matY[i][2] * matX[2][j];
      }
    }

    let result = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];

    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        result[i][j] = matZ[i][0] * temp[0][j] + matZ[i][1] * temp[1][j] + matZ[i][2] * temp[2][j];
      }
    }

    return result;
  };

  const project3D = (x, y, z, distance = 400) => {
    const scale = distance / (distance + z);
    return {
      x: centerX + x * scale,
      y: centerY + y * scale,
      scale: scale,
    };
  };

  const transformPoint = (x, y, z) => {
    const matrix = combineRotations(rotation.x, rotation.y, rotation.z);
    const rotated = multiplyMatrix(matrix, [x, y, z]);
    return project3D(rotated[0], rotated[1], rotated[2]);
  };

  const getRGBColor = (x, y, z) => {
    const r = Math.round(((x + cubeSize / 2) / cubeSize) * 255);
    const g = Math.round(((y + cubeSize / 2) / cubeSize) * 255);
    const b = Math.round(((z + cubeSize / 2) / cubeSize) * 255);

    return {
      r: Math.max(0, Math.min(255, r)),
      g: Math.max(0, Math.min(255, g)),
      b: Math.max(0, Math.min(255, b)),
    };
  };

  const rgbToHex = (r, g, b) => {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  };

  const drawCube = (ctx) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    const vertices = [
      [-cubeSize / 2, -cubeSize / 2, -cubeSize / 2],
      [cubeSize / 2, -cubeSize / 2, -cubeSize / 2],
      [cubeSize / 2, cubeSize / 2, -cubeSize / 2],
      [-cubeSize / 2, cubeSize / 2, -cubeSize / 2],
      [-cubeSize / 2, -cubeSize / 2, cubeSize / 2],
      [cubeSize / 2, -cubeSize / 2, cubeSize / 2],
      [cubeSize / 2, cubeSize / 2, cubeSize / 2],
      [-cubeSize / 2, cubeSize / 2, cubeSize / 2],
    ];

    const transformedVertices = vertices.map((v) => transformPoint(v[0], v[1], v[2]));

    const faces = [
      {vertices: [4, 5, 6, 7], baseColor: {r: 0, g: 0, b: 255}},
      {vertices: [1, 0, 3, 2], baseColor: {r: 255, g: 255, b: 0}},
      {vertices: [1, 2, 6, 5], baseColor: {r: 255, g: 0, b: 0}},
      {vertices: [0, 4, 7, 3], baseColor: {r: 0, g: 255, b: 0}},
      {vertices: [3, 7, 6, 2], baseColor: {r: 0, g: 255, b: 0}},
      {vertices: [0, 1, 5, 4], baseColor: {r: 255, g: 0, b: 255}},
    ];

    const facesWithDepth = faces.map((face) => {
      const avgZ =
        face.vertices.reduce((sum, idx) => {
          const vertex = vertices[idx];
          const matrix = combineRotations(rotation.x, rotation.y, rotation.z);
          const rotated = multiplyMatrix(matrix, vertex);
          return sum + rotated[2];
        }, 0) / face.vertices.length;

      return {...face, depth: avgZ};
    });

    facesWithDepth.sort((a, b) => a.depth - b.depth);

    facesWithDepth.forEach((face) => {
      drawFaceWithGradient(ctx, face, vertices, transformedVertices);
    });

    drawWireframe(ctx, transformedVertices);

    if (crossSection.enabled) {
      drawCrossSection(ctx);
    }
  };

  const drawFaceWithGradient = (ctx, face, originalVertices, transformedVertices) => {
    ctx.beginPath();

    face.vertices.forEach((vertexIndex, i) => {
      const point = transformedVertices[vertexIndex];
      if (i === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });
    ctx.closePath();

    const vertex0 = originalVertices[face.vertices[0]];
    const vertex2 = originalVertices[face.vertices[2]];

    const point0 = transformedVertices[face.vertices[0]];
    const point2 = transformedVertices[face.vertices[2]];

    const gradient = ctx.createLinearGradient(point0.x, point0.y, point2.x, point2.y);

    const color0 = getRGBColor(vertex0[0], vertex0[1], vertex0[2]);
    const color2 = getRGBColor(vertex2[0], vertex2[1], vertex2[2]);

    gradient.addColorStop(0, rgbToHex(color0.r, color0.g, color0.b));
    gradient.addColorStop(1, rgbToHex(color2.r, color2.g, color2.b));

    ctx.fillStyle = gradient;
    ctx.fill();
  };

  const drawWireframe = (ctx, transformedVertices) => {
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1;

    const edges = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 4],
      [0, 4],
      [1, 5],
      [2, 6],
      [3, 7],
    ];

    edges.forEach((edge) => {
      const start = transformedVertices[edge[0]];
      const end = transformedVertices[edge[1]];

      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    });
  };

  const drawCrossSection = (ctx) => {
    const sectionSize = 120;
    const {x, y} = crossSection.position;

    ctx.fillStyle = "#f0f0f0";
    ctx.fillRect(x - 5, y - 5, sectionSize + 10, sectionSize + 10);
    ctx.strokeStyle = "#666";
    ctx.strokeRect(x - 5, y - 5, sectionSize + 10, sectionSize + 10);

    const resolution = 24;
    const pixelSize = sectionSize / resolution;

    for (let i = 0; i < resolution; i++) {
      for (let j = 0; j < resolution; j++) {
        let r, g, b;

        switch (crossSection.axis) {
          case "x":
            r = Math.round(crossSection.value * 255);
            g = Math.round((j / (resolution - 1)) * 255);
            b = Math.round(((resolution - 1 - i) / (resolution - 1)) * 255);
            break;
          case "y":
            r = Math.round((j / (resolution - 1)) * 255);
            g = Math.round(crossSection.value * 255);
            b = Math.round(((resolution - 1 - i) / (resolution - 1)) * 255);
            break;
          case "z":
            r = Math.round((j / (resolution - 1)) * 255);
            g = Math.round(((resolution - 1 - i) / (resolution - 1)) * 255);
            b = Math.round(crossSection.value * 255);
            break;
        }

        ctx.fillStyle = rgbToHex(r, g, b);
        ctx.fillRect(x + j * pixelSize, y + i * pixelSize, pixelSize, pixelSize);
      }
    }

    ctx.fillStyle = "#000";
    ctx.font = "12px Arial";
    ctx.fillText(`Przekrój ${crossSection.axis.toUpperCase()}: ${Math.round(crossSection.value * 255)}`, x, y - 10);
  };

  const handleCubeClick = (event) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const dx = mouseX - centerX;
    const dy = mouseY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < cubeSize) {
      const normalizedX = (mouseX - centerX) / cubeSize + 0.5;
      const normalizedY = (mouseY - centerY) / cubeSize + 0.5;
      const normalizedZ = 0.5;

      const selectedColor = {
        r: Math.round(Math.max(0, Math.min(1, normalizedX)) * 255),
        g: Math.round(Math.max(0, Math.min(1, 1 - normalizedY)) * 255),
        b: Math.round(Math.max(0, Math.min(1, normalizedZ)) * 255),
      };

      if (onColorSelect) {
        onColorSelect(selectedColor);
      }
    }
  };

  const handleMouseDown = (event) => {
    if (event.button === 0) {
      setIsDragging(true);
      setLastMouse({x: event.clientX, y: event.clientY});
    }
  };

  const handleMouseMove = (event) => {
    if (isDragging) {
      const deltaX = lastMouse.x - event.clientX;
      const deltaY = event.clientY - lastMouse.y;

      setRotation((prev) => ({
        x: prev.x + deltaY * 0.01,
        y: prev.y + deltaX * 0.01,
        z: prev.z,
      }));

      setLastMouse({x: event.clientX, y: event.clientY});
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    const animate = () => {
      drawCube(ctx);
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [rotation, crossSection]);

  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, lastMouse]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "20px",
        backgroundColor: "#f8f9fa",
        borderRadius: "8px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
      }}
    >
      <h3 style={{margin: "0 0 20px 0", color: "#333"}}>Kostka RGB 3D</h3>

      <canvas
        ref={canvasRef}
        width={500}
        height={400}
        style={{
          border: "1px solid #ddd",
          borderRadius: "4px",
          cursor: isDragging ? "grabbing" : "grab",
          backgroundColor: "#fff",
        }}
        onMouseDown={handleMouseDown}
        onClick={handleCubeClick}
      />

      <div
        style={{
          marginTop: "15px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          width: "100%",
          maxWidth: "400px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "14px",
          }}
        >
          <label style={{minWidth: "120px", fontWeight: "bold"}}>Pokaż przekrój:</label>
          <input
            type="checkbox"
            checked={crossSection.enabled}
            onChange={(e) =>
              setCrossSection((prev) => ({
                ...prev,
                enabled: e.target.checked,
              }))
            }
          />
        </div>

        {crossSection.enabled && (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "14px",
              }}
            >
              <label style={{minWidth: "120px", fontWeight: "bold"}}>Oś przekroju:</label>
              <select
                value={crossSection.axis}
                onChange={(e) =>
                  setCrossSection((prev) => ({
                    ...prev,
                    axis: e.target.value,
                  }))
                }
                style={{padding: "4px 8px", border: "1px solid #ddd", borderRadius: "4px"}}
              >
                <option value="x">X (Czerwony)</option>
                <option value="y">Y (Zielony)</option>
                <option value="z">Z (Niebieski)</option>
              </select>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "14px",
              }}
            >
              <label style={{minWidth: "120px", fontWeight: "bold"}}>
                Pozycja ({Math.round(crossSection.value * 255)}):
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={crossSection.value}
                onChange={(e) =>
                  setCrossSection((prev) => ({
                    ...prev,
                    value: parseFloat(e.target.value),
                  }))
                }
                style={{flex: 1}}
              />
            </div>
          </>
        )}

        <div
          style={{
            fontSize: "12px",
            color: "#666",
            textAlign: "center",
            marginTop: "10px",
            padding: "8px",
            backgroundColor: "#e9ecef",
            borderRadius: "4px",
          }}
        >
          💡 <strong>Instrukcja:</strong>
          <br />
          • Przeciągnij myszą aby obracać kostką
          <br />
          • Kliknij na kostce aby wybrać kolor
          <br />• Włącz przekrój aby zobaczyć wnętrze kostki
        </div>
      </div>
    </div>
  );
};

export default RGBCube3D;
