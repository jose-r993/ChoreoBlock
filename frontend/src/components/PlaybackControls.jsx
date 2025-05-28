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
  return (
    <div className="playback-controls">
      <section className="playback-section">
        <h3 className="section-title">Playback</h3>
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
      </section>
    </div>
  );
};

export default PlaybackControls;
