import React from "react";
import "../styles/WaveformControls.scss";
import playIcon from "../assets/playIcon.svg";
import pauseIcon from "../assets/pauseIcon.svg";

const WaveformControls = ({
  isPlaying,
  onPlayPause,
  currentTime,
  timeRemaining,
  bpm,
  songName,
}) => {
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const formatTimeRemaining = () => {
    if (!timeRemaining || isNaN(timeRemaining) || timeRemaining <= 0)
      return "-0:00";
    const minutes = Math.floor(timeRemaining / 60);
    const secs = Math.floor(timeRemaining % 60);
    return `-${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="waveform-controls-container">
      <div className="waveform-controls">
        <div className="song-information">
          <p className="song-name">{songName || "Untitled Song"}</p>
          {bpm && <p className="bpm-display">BPM: {bpm.toFixed(1)}</p>}
        </div>
        <div className="time-display">{formatTime(currentTime)}</div>
        <button
          className={`play-button ${isPlaying ? "playing" : ""}`}
          onClick={onPlayPause}
        >
          <img src={isPlaying ? pauseIcon : playIcon} alt="Play/Pause Button" />
        </button>
        <div className="time-remaining time-display">
          {formatTimeRemaining()}
        </div>
      </div>
    </div>
  );
};

export default WaveformControls;
