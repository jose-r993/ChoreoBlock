import React, { useState } from "react";
import "../styles/PathDrawing.scss";

const PathDrawing = ({
  dancers,
  activeGroupIndex,
  formations,
  onAddDancerPath,
}) => {
  const [selectedDancer, setSelectedDancer] = useState(null);
  const [pathMode, setPathMode] = useState("curved");
  const [drawingInstructions, setDrawingInstructions] = useState("default");

  const handleDancerSelect = (dancer) => {
    setSelectedDancer(dancer);
    setDrawingInstructions("ready");
  };

  const changePathMode = (mode) => {
    setPathMode(mode);
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
        return null;
    }
  };

  const renderInstructions = () => {
    if (activeGroupIndex === null) {
      return (
        <div className="instructions warning">
          <p>Please select a beat group to draw paths</p>
        </div>
      );
    }

    if (drawingInstructions === "default") {
      return (
        <div className="instructions">
          <p>
            Select a dancer from the list, then go to the stage and draw their
            movement path
          </p>
        </div>
      );
    }

    if (drawingInstructions === "ready") {
      return (
        <div className="instructions highlight">
          <p>
            <span className="step">1.</span> Go to the stage area
          </p>
          <p>
            <span className="step">2.</span> Click on {selectedDancer?.name} and
            drag to draw their path
          </p>
          <p>
            <span className="step">3.</span> The path will automatically be
            added when you finish drawing
          </p>
        </div>
      );
    }

    return null;
  };

  const dancerHasPath = (dancerId) => {
    if (activeGroupIndex === null || !formations[activeGroupIndex])
      return false;

    const dancerData = formations[activeGroupIndex][dancerId];
    return dancerData?.path && dancerData.path.length > 1;
  };

  const clearDancerPath = (dancerId) => {
    onAddDancerPath(dancerId, null);
  };

  return (
    <div className="path-drawing">
      <h3>Draw Movement Paths</h3>

      {renderInstructions()}

      <div className="path-mode-selector">
        <h4>Path Style:</h4>
        <div className="path-modes">
          <button
            className={`path-mode-btn ${pathMode === "direct" ? "active" : ""}`}
            onClick={() => changePathMode("direct")}
          >
            Direct
            <div className="preview-line direct"></div>
          </button>

          <button
            className={`path-mode-btn ${pathMode === "curved" ? "active" : ""}`}
            onClick={() => changePathMode("curved")}
          >
            Curved
            <div className="preview-line curved"></div>
          </button>

          <button
            className={`path-mode-btn ${
              pathMode === "cardinal" ? "active" : ""
            }`}
            onClick={() => changePathMode("cardinal")}
          >
            Smooth
            <div className="preview-line cardinal"></div>
          </button>
        </div>
      </div>

      <div className="dancers-list">
        <h4>Select a Dancer:</h4>

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
                    title="Clear path"
                  >
                    Clear Path
                  </button>
                ) : (
                  <span className="path-status">
                    {selectedDancer?.id === dancer.id
                      ? "Ready to draw"
                      : "No path"}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="path-tips">
        <h4>Tips:</h4>
        <ul>
          <li>Paths show how dancers move during transitions</li>
          <li>
            <strong>Direct</strong>: Straight lines between points
          </li>
          <li>
            <strong>Curved</strong>: Smooth curves through control points
          </li>
          <li>
            <strong>Smooth</strong>: Very smooth path through all points
          </li>
          <li>Draw more points for more precise control</li>
        </ul>
      </div>
    </div>
  );
};

export default PathDrawing;
