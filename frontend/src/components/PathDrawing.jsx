import React, { useState, useEffect } from "react";
import "../styles/PathDrawing.scss";

const PathDrawing = ({
  dancers,
  activeGroupIndex,
  formations,
  onAddDancerPathForSidebar,
  onPathModeChange,
  currentPathMode,
}) => {
  const [selectedDancerForClear, setSelectedDancerForClear] = useState(null);
  const [showAdvancedHints, setShowAdvancedHints] = useState(false);

  useEffect(() => {
    setSelectedDancerForClear(null);
  }, [activeGroupIndex]);

  const renderDancerShape = (dancer) => {
    switch (dancer.shape) {
      case "circle":
        return <circle cx="10" cy="10" r="10" fill={dancer.color} />;
      case "triangle":
        return <polygon points="10,0 20,20 0,20" fill={dancer.color} />;
      case "square":
        return <rect x="0" y="0" width="20" height="20" fill={dancer.color} />;
      default:
        return (
          <circle cx="10" cy="10" r="10" fill={dancer.color || "#cccccc"} />
        );
    }
  };

  const renderInstructions = () => {
    if (activeGroupIndex === null) {
      return (
        <div className="instructions warning">
          <p>Select a Formation on the timeline to draw paths.</p>
        </div>
      );
    }
    return (
      <div className="instructions highlight">
        <p>Path drawing active for Formation {activeGroupIndex + 1}.</p>
        <div className="drawing-tips">
          <h5>Drawing Tips:</h5>
          <ul>
            <li>
              <strong>Click & drag</strong> any dancer to set their path
            </li>
            <li>
              <strong>Draw straight</strong> for linear movement
            </li>
            <li>
              <strong>Draw curved</strong> for custom paths
            </li>
            <li>
              <strong>Hold Shift</strong> to lock to horizontal/vertical
            </li>
            <li>
              <strong>Select multiple</strong> dancers to move together
            </li>
          </ul>
        </div>
      </div>
    );
  };

  const dancerHasRawPath = (dancerId) => {
    if (
      activeGroupIndex === null ||
      !formations ||
      activeGroupIndex >= formations.length ||
      !formations[activeGroupIndex]
    ) {
      return false;
    }
    const formationForGroup = formations[activeGroupIndex];
    if (
      typeof formationForGroup !== "object" ||
      formationForGroup === null ||
      Array.isArray(formationForGroup)
    ) {
      return false;
    }
    const dancerData = formationForGroup[dancerId];
    return !!dancerData?.rawStagePath && dancerData.rawStagePath.length > 0;
  };

  const getPathTypeForDancer = (dancerId) => {
    if (
      activeGroupIndex === null ||
      !formations ||
      activeGroupIndex >= formations.length ||
      !formations[activeGroupIndex]
    ) {
      return null;
    }
    const formationForGroup = formations[activeGroupIndex];
    const dancerData = formationForGroup[dancerId];
    return dancerData?.pathMetadata?.pathKind || "unknown";
  };

  const clearDancerPath = (dancerId) => {
    console.log(
      "PATH_DRAWING_DEBUG: Clearing path for dancer:",
      dancerId,
      "in group:",
      activeGroupIndex
    );
    if (activeGroupIndex !== null && onAddDancerPathForSidebar) {
      onAddDancerPathForSidebar(dancerId, null, "direct");
      setSelectedDancerForClear(null);
    }
  };

  return (
    <div className="path-drawing">
      <h3>Draw Movement Paths</h3>
      {renderInstructions()}

      {showAdvancedHints && (
        <div className="path-mode-hints">
          <h4>Drawing Preference (Optional):</h4>
          <div className="hint-modes">
            <button
              className={`hint-mode-btn ${
                currentPathMode === "auto" ? "active" : ""
              }`}
              onClick={() => onPathModeChange?.("auto")}
              title="Let the system detect your intent"
            >
              Auto-Detect
              <span className="description">Smart detection</span>
            </button>
            <button
              className={`hint-mode-btn ${
                currentPathMode === "direct" ? "active" : ""
              }`}
              onClick={() => onPathModeChange?.("direct")}
              title="Force all paths to be straight lines"
            >
              Prefer Linear
              <span className="description">Straight paths</span>
            </button>
            <button
              className={`hint-mode-btn ${
                currentPathMode === "curved" ? "active" : ""
              }`}
              onClick={() => onPathModeChange?.("curved")}
              title="Keep all paths as curves"
            >
              Prefer Curved
              <span className="description">Smooth curves</span>
            </button>
          </div>
        </div>
      )}

      <button
        className="toggle-advanced-btn"
        onClick={() => setShowAdvancedHints(!showAdvancedHints)}
      >
        {showAdvancedHints ? "Hide" : "Show"} Advanced Options
      </button>

      <div className="dancers-list-for-clear">
        <h4>
          Manage Paths (Formation{" "}
          {activeGroupIndex !== null ? activeGroupIndex + 1 : "N/A"}):
        </h4>
        {activeGroupIndex === null ? (
          <div className="empty-list">Select a formation to manage paths.</div>
        ) : dancers.length === 0 ? (
          <div className="empty-list">No dancers added yet.</div>
        ) : (
          <div className="dancer-items">
            {dancers.map((dancer) => {
              const pathType = getPathTypeForDancer(dancer.id);
              return (
                <div
                  key={dancer.id}
                  className={`dancer-item-manage ${
                    selectedDancerForClear?.id === dancer.id
                      ? "selected-for-info"
                      : ""
                  }`}
                  onClick={() => setSelectedDancerForClear(dancer)}
                >
                  <div className="dancer-info">
                    <svg width="16" height="16" viewBox="0 0 20 20">
                      {renderDancerShape(dancer)}
                    </svg>
                    <span className="dancer-name">{dancer.name}</span>
                  </div>
                  {dancerHasRawPath(dancer.id) ? (
                    <div className="path-controls">
                      <span className={`path-type-indicator ${pathType}`}>
                        {pathType === "straight"
                          ? "↗"
                          : pathType === "curve"
                          ? "〰️"
                          : pathType === "hold"
                          ? "⏸"
                          : "?"}
                      </span>
                      <button
                        className="clear-path-btn-small"
                        onClick={(e) => {
                          e.stopPropagation();
                          clearDancerPath(dancer.id);
                        }}
                        title={`Clear path for ${dancer.name}`}
                      >
                        Clear
                      </button>
                    </div>
                  ) : (
                    <span className="path-status-small">No path set</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PathDrawing;
