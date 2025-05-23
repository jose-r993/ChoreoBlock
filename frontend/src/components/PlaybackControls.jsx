import React from "react";
import "../styles/PlaybackControls.scss";

const PlaybackControls = ({
  currentZoom,
  onZoomChange,
  volume,
  onVolumeChange,
  groupSize,
  onGroupSizeChange,
  markerOffset,
  onOffsetChange,
  subdivisionFactor,
  onSubdivisionChange,
  beatTimestamps = [],
}) => {
  const handleVolumeChange = (e) => onVolumeChange(parseFloat(e.target.value));
  const handleDecreaseOffset = () => onOffsetChange(markerOffset - 1);
  const handleIncreaseOffset = () => onOffsetChange(markerOffset + 1);

  return (
    <div className="playback-controls">
      <section className="playback-section">
        <h3 className="section-title">Playback</h3>

        <div className="control-group">
          <label className="control-label">Volume</label>
          <div className="volume-control">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={handleVolumeChange}
            />
            <span className="volume-value">{Math.round(volume * 100)}%</span>
          </div>
        </div>
      </section>

      <section className="markers-section">
        <h3 className="section-title">Markers Presets</h3>

        {beatTimestamps.length > 0 && (
          <div className="control-group">
            <label className="control-label">Group Size</label>
            <select
              className="select-control"
              value={groupSize}
              onChange={onGroupSizeChange}
            >
              <option value="4">4 Beats</option>
              <option value="8">8 Beats</option>
              <option value="12">12 Beats</option>
              <option value="16">16 Beats</option>
            </select>
          </div>
        )}

        <div className="control-group">
          <label className="control-label">Display Density</label>
          <select
            className="select-control"
            value={subdivisionFactor}
            onChange={onSubdivisionChange}
          >
            <option value="1">Full (all markers)</option>
            <option value="2">Half (every other marker)</option>
            <option value="4">Quarter (every 4th marker)</option>
          </select>
        </div>

        {/* <div className="control-group">
          <label className="control-label">Beat Offset</label>
          <div className="offset-controls">
            <button onClick={handleDecreaseOffset} className="offset-button">
              −
            </button>
            <span className="offset-value">{markerOffset}</span>
            <button onClick={handleIncreaseOffset} className="offset-button">
              +
            </button>
          </div>
        </div> */}
      </section>
    </div>
  );
};

export default PlaybackControls;
