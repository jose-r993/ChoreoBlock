import React from "react";
import { Routes, Route } from "react-router";
import UploadPage from "./pages/UploadPage.jsx";
import WaveformPage from "./pages/WaveformPage.jsx";
import "./App.css";

function App() {
  return (
    <Routes>
      <Route path="/" element={<UploadPage />} />
      <Route path="/waveform" element={<WaveformPage />} />
    </Routes>
  );
}

export default App;
