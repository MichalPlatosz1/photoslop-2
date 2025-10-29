import React from "react";
import {createRoot} from "react-dom/client";
import Canvas from "./canvas/Canvas";
import "./styles/main.css";

const App = () => {
  return (
    <div className="app">
      <Canvas />
    </div>
  );
};

const container = document.getElementById("root");
const root = createRoot(container);
root.render(<App />);
