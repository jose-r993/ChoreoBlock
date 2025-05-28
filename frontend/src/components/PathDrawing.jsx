import React, { useState, useEffect } from "react";
import "../styles/PathDrawing.scss";

const PathDrawing = ({
  dancers,
  activeGroupIndex,
  formations,
  onAddDancerPathForSidebar,
  onPathModeChange,
  currentPathMode,
  selectedDancerIds,
  onDancersSelected,
}) => {
  const [selectedDancerForClear, setSelectedDancerForClear] = useState(null);

  useEffect(() => {
    setSelectedDancerForClear(null);
  }, [activeGroupIndex]);

  useEffect(() => {
    console.log("PATH_DRAWING_DEBUG: Received props", {
      currentPathMode,
      onPathModeChangeExists: !!onPathModeChange,
      selectedDancerIds: selectedDancerIds ? Array.from(selectedDancerIds) : [],
    });
  }, [currentPathMode, onPathModeChange, selectedDancerIds]);

  const changePathMode = (mode) => {
    console.log("PATH_DRAWING_DEBUG: Attempting to change path mode to:", mode);
    if (onPathModeChange) {
      onPathModeChange(mode);
    } else {
      console.error("PATH_DRAWING_DEBUG: onPathModeChange is not a function!");
    }
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
    if (activeGroupIndex === null) {
      return (
        <div className="instructions warning">
          <p>Select a Formation on the timeline to draw paths.</p>
        </div>
      );
    }

    const selectedCount = selectedDancerIds ? selectedDancerIds.size : 0;

    return (
      <div className="instructions highlight">
        <p>Path drawing active for Formation {activeGroupIndex + 1}.</p>
        {selectedCount > 0 && (
          <p className="selection-info">
            {selectedCount} dancer{selectedCount > 1 ? "s" : ""} selected
          </p>
        )}
        <p>Select dancers, then click and drag to draw paths.</p>
        {currentPathMode === "direct" && (
          <p>
            <b>Linear Mode:</b> Drag dancer to their new end point.
          </p>
        )}
        {currentPathMode === "curved" && (
          <p>
            <b>Custom Mode:</b> Drag dancer along the desired route.
          </p>
        )}
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

  const clearDancerPath = (dancerId) => {
    console.log(
      "PATH_DRAWING_DEBUG: Clearing path for dancer:",
      dancerId,
      "in group:",
      activeGroupIndex,
      "with mode:",
      currentPathMode
    );
    if (activeGroupIndex !== null && onAddDancerPathForSidebar) {
      onAddDancerPathForSidebar(dancerId, null, currentPathMode || "direct");
      setSelectedDancerForClear(null);
    } else {
      console.error("PATH_DRAWING_DEBUG: Could not clear path.", {
        activeGroupIndex,
        onAddDancerPathForSidebarExists: !!onAddDancerPathForSidebar,
      });
    }
  };

  const handleDancerClick = (dancer) => {
    if (onDancersSelected) {
      onDancersSelected(new Set([dancer.id]));
    }
    setSelectedDancerForClear(dancer);
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
              currentPathMode === "direct" ? "active" : ""
            }`}
            onClick={() => changePathMode("direct")}
            title="Create a straight line path by dragging dancer to end point"
          >
            Linear
            <div className="preview-line direct"></div>
          </button>
          <button
            className={`path-mode-btn ${
              currentPathMode === "curved" ? "active" : ""
            }`}
            onClick={() => changePathMode("curved")}
            title="Draw a freehand custom path (smoothed by default)"
          >
            Custom
            <div className="preview-line curved"></div>
          </button>
        </div>
      </div>
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
              const isSelected =
                selectedDancerIds && selectedDancerIds.has(dancer.id);
              return (
                <div
                  key={dancer.id}
                  className={`dancer-item-manage ${
                    isSelected ? "selected" : ""
                  }`}
                  onClick={() => handleDancerClick(dancer)}
                >
                  <div className="dancer-info">
                    <svg width="16" height="16" viewBox="0 0 20 20">
                      {renderDancerShape(dancer)}
                    </svg>
                    <span className="dancer-name">{dancer.name}</span>
                  </div>
                  {dancerHasRawPath(dancer.id) ? (
                    <button
                      className="clear-path-btn-small"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearDancerPath(dancer.id);
                      }}
                      title={`Clear path for ${dancer.name}`}
                    >
                      Clear Path
                    </button>
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
