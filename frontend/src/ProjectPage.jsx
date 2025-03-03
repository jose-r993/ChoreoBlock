import React, { useState } from "react";
import BeatSyncWaveform from "./components/BeatSyncWaveform";
import "./styles/ProjectPage.scss";

const ProjectPage = () => {
  const [audioFile, setAudioFile] = useState(null);
  const [bpm, setBpm] = useState(null);
  const [beatTimestamps, setBeatTimestamps] = useState([]);
  const [groupSize, setGroupSize] = useState(8);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form state for adding sections
  const [sectionData, setSectionData] = useState({
    name: "",
    startBeat: 0,
    endBeat: 8,
  });

  // Reference to the BeatSyncWaveform component
  const waveformRef = React.useRef(null);

  // Handle file upload
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setIsLoading(true);
      setError(null);
      setAudioFile(file);

      // Create form data for API request
      const formData = new FormData();
      formData.append("file", file);

      // Send to your FastAPI backend
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

      // Update state with analysis results
      setBpm(data.bpm);
      setBeatTimestamps(data.beat_timestamps);

      // Reset section form to default values
      setSectionData({
        name: "",
        startBeat: 0,
        endBeat: Math.min(7, data.beat_timestamps.length - 1),
      });
    } catch (err) {
      console.error("Error analyzing audio file:", err);
      setError(err.message || "Failed to analyze audio file");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle group size change
  const handleGroupSizeChange = (e) => {
    const size = parseInt(e.target.value, 10);
    setGroupSize(size);
  };

  // Handle section form input changes
  const handleSectionInputChange = (e) => {
    const { name, value } = e.target;
    setSectionData((prev) => ({
      ...prev,
      [name]: name === "name" ? value : parseInt(value, 10),
    }));
  };

  // Handle section form submission
  const handleSectionSubmit = (e) => {
    e.preventDefault();

    // Call the addChoreographySection method via ref
    if (
      waveformRef.current &&
      typeof waveformRef.current.addChoreographySection === "function"
    ) {
      waveformRef.current.addChoreographySection(
        sectionData.startBeat,
        sectionData.endBeat,
        sectionData.name || `Section ${Math.floor(Math.random() * 1000)}`
      );

      // Clear form or prepare for next section
      setSectionData((prev) => ({
        ...prev,
        name: "",
      }));
    }
  };

  return (
    <div className="project-page">
      <div className="project-header">
        <h1>Ballet Folklorico Blocking Tool</h1>
        <p>Upload audio to analyze beats and create choreography sections</p>
      </div>

      <div className="project-content">
        <section className="upload-section">
          <div className="upload-container">
            <label htmlFor="audio-upload" className="upload-label">
              <div className="upload-icon">
                <i className="fas fa-music"></i>
              </div>
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
        </section>
      </div>
      {audioFile && beatTimestamps.length > 0 && (
        <section className="waveform-section">
          {beatTimestamps.length > 0 && (
            <div className="group-size-selector">
              <label htmlFor="group-size">Group Size:</label>
              <select
                id="group-size"
                value={groupSize}
                onChange={handleGroupSizeChange}
              >
                <option value="4">4 Beats</option>
                <option value="8">8 Beats</option>
                <option value="12">12 Beats</option>
                <option value="16">16 Beats</option>
              </select>
            </div>
          )}
          <BeatSyncWaveform
            ref={waveformRef}
            audioFile={audioFile}
            beatTimestamps={beatTimestamps}
            bpm={bpm}
            groupSize={groupSize}
          />
        </section>
      )}
    </div>
  );
};

export default ProjectPage;
