import React, { useState, useEffect } from "react";
import "../styles/PathDrawing.scss";

const PathDrawing = ({
  dancers,
  activeGroupIndex,
  formations,
  onAddDancerPath,
  onPathModeChange,
  pathMode: parentPathMode,
}) => {
  const [selectedDancer, setSelectedDancer] = useState(null);
  const [drawingInstructions, setDrawingInstructions] = useState("default");

  useEffect(() => {
    setSelectedDancer(null);
    setDrawingInstructions("default");
  }, [activeGroupIndex]);

  const handleDancerSelect = (dancer) => {
    setSelectedDancer(dancer);
    setDrawingInstructions("ready");
  };

  const changePathMode = (mode) => {
    onPathModeChange(mode);
  };

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
    if (activeGroupIndex === null || activeGroupIndex === 0) {
      return (
        <div className="instructions warning">
          <p>
            Select a formation (after the first one) to draw the transition path
            into it.
          </p>
        </div>
      );
    }

    if (!selectedDancer) {
      return (
        <div className="instructions">
          <p>
            Select a dancer below to define their path for entering Formation{" "}
            {activeGroupIndex + 1}.
          </p>
        </div>
      );
    }

    if (drawingInstructions === "ready") {
      return (
        <div className="instructions highlight">
          <p>
            Ready to draw path for <strong>{selectedDancer?.name}</strong> into
            Formation {activeGroupIndex + 1}:
          </p>
          <p>
            <span className="step">1.</span> Go to the stage area.
          </p>
          <p>
            <span className="step">2.</span> Click the "Draw Path" button.
          </p>
          <p>
            <span className="step">3.</span> Click and drag{" "}
            <strong>{selectedDancer?.name}</strong> to draw their path.
          </p>
          <p>
            <span className="step">4.</span> Release the mouse to save.
          </p>
        </div>
      );
    }

    return null;
  };

  const dancerHasPath = (dancerId) => {
    if (
      activeGroupIndex === null ||
      !formations ||
      !formations[activeGroupIndex]
    ) {
      return false;
    }
    const dancerData = formations[activeGroupIndex][dancerId];
    return !!dancerData?.path && dancerData.path.length > 0;
  };

  const clearDancerPath = (dancerId) => {
    if (activeGroupIndex !== null) {
      onAddDancerPath(dancerId, null, activeGroupIndex);
    }
  };

  return (
    <div className="path-drawing">
      <h3>Draw Movement Paths</h3>

      {renderInstructions()}

      <div className="path-mode-selector">
        <h4>Path Style:</h4>
        <div className="path-modes">
          <button
            className={`path-mode-btn ${
              parentPathMode === "direct" ? "active" : ""
            }`}
            onClick={() => changePathMode("direct")}
            title="Linear path between start and end"
          >
            Direct
            <div className="preview-line direct"></div>
          </button>

          <button
            className={`path-mode-btn ${
              parentPathMode === "curved" ? "active" : ""
            }`}
            onClick={() => changePathMode("curved")}
            title="Smoothed path using controller logic"
          >
            Curved
            <div className="preview-line curved"></div>
          </button>

          <button
            className={`path-mode-btn ${
              parentPathMode === "cardinal" ? "active" : ""
            }`}
            onClick={() => changePathMode("cardinal")}
            title="Smoothed path using controller logic"
          >
            Smooth
            <div className="preview-line cardinal"></div>
          </button>
        </div>
      </div>

      <div className="dancers-list">
        <h4>Select Dancer for Path:</h4>

        {dancers.length === 0 ? (
          <div className="empty-list">No dancers added yet</div>
        ) : (
          <div className="dancer-items">
            {dancers.map((dancer) => (
              <div
                key={dancer.id}
                className={`dancer-item ${
                  selectedDancer?.id === dancer.id ? "selected" : ""
                }`}
                onClick={() => handleDancerSelect(dancer)}
                title={`Define path for ${dancer.name}`}
              >
                <div className="dancer-info">
                  <svg width="16" height="16" viewBox="0 0 20 20">
                    {renderDancerShape(dancer)}
                  </svg>
                  <span className="dancer-name">{dancer.name}</span>
                </div>

                {dancerHasPath(dancer.id) ? (
                  <button
                    className="clear-path-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearDancerPath(dancer.id);
                    }}
                    title={`Clear path for ${dancer.name} into Formation ${
                      activeGroupIndex !== null ? activeGroupIndex + 1 : ""
                    }`}
                  >
                    Clear Path
                  </button>
                ) : (
                  <span className="path-status">
                    {selectedDancer?.id === dancer.id
                      ? activeGroupIndex !== null && activeGroupIndex > 0
                        ? "Ready"
                        : "Select Group"
                      : "No path defined"}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PathDrawing;
