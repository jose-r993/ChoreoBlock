import React, { useState } from "react";
import { useNavigate } from "react-router";
import "../styles/UploadPage.scss";

const UploadPage = () => {
  const [audioFile, setAudioFile] = useState(null);
  const [bpm, setBpm] = useState(null);
  const [beatTimestamps, setBeatTimestamps] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setIsLoading(true);
      setError(null);
      setAudioFile(file);

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("http://localhost:8000/analyze-bpm/", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error(
          `API returned ${response.status} ${response.statusText}`
        );
      }
      const data = await response.json();
      console.log("BPM Analysis:", data);
      setBpm(data.bpm);
      setBeatTimestamps(data.beat_timestamps);

      navigate("/waveform", {
        state: {
          audioFile: file,
          bpm: data.bpm,
          beatTimestamps: data.beat_timestamps,
        },
      });
    } catch (err) {
      console.error("Error analyzing audio file:", err);
      setError(err.message || "Failed to analyze audio file");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="upload-page">
      <header className="upload-header">
        <h1>Ballet Folklorico Blocking Tool</h1>
        <p>Upload audio to analyze beats and create choreography sections</p>
      </header>
      <div className="upload-container">
        <label htmlFor="audio-upload" className="upload-label">
          <div className="upload-icon">&#x266B;</div>
          <span>Upload Music File</span>
          <input
            type="file"
            id="audio-upload"
            accept="audio/*"
            onChange={handleFileUpload}
            disabled={isLoading}
          />
        </label>
        {isLoading && <div className="loading-spinner">Analyzing...</div>}
        {error && <div className="error-message">{error}</div>}
      </div>
      {audioFile && (
        <div className="file-info">
          <div className="file-name">{audioFile.name}</div>
          {bpm && <div className="file-bpm">Detected BPM: {bpm}</div>}
          {beatTimestamps.length > 0 && (
            <div className="file-beats">
              {beatTimestamps.length} beats detected
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UploadPage;
