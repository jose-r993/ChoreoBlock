import React from "react";
import "../styles/DancerTransitionEditor.scss";

const transitionTypes = [
  { id: "linear", name: "Linear", description: "Constant speed movement" },
  {
    id: "easeInOut",
    name: "Smooth",
    description: "Gradually accelerate then decelerate",
  },
  { id: "delayed", name: "Delayed", description: "Wait then move quickly" },
  { id: "early", name: "Early", description: "Move quickly then wait" },
  {
    id: "bounce",
    name: "Bounce",
    description: "Slight overshoot with bounce back",
  },
];

const DancerTransitionEditor = ({
  dancers,
  activeFormation,
  onUpdateFormation,
}) => {
  // Exit early if no active formation
  if (!activeFormation) {
    return (
      <div className="dancer-transition-editor">
        <div className="editor-empty-state">
          Select a formation to edit transitions
        </div>
      </div>
    );
  }

  // Update a dancer's transition type
  const updateDancerTransition = (dancerId, transitionType) => {
    // Create updated dancer positions
    const updatedDancerPositions = {
      ...activeFormation.dancerPositions,
    };

    // Ensure this dancer has a position entry
    if (!updatedDancerPositions[dancerId]) {
      updatedDancerPositions[dancerId] = { x: 200, y: 200 };
    }

    // Update transition type
    updatedDancerPositions[dancerId] = {
      ...updatedDancerPositions[dancerId],
      transitionType,
    };

    // Create updated formation
    const updatedFormation = {
      ...activeFormation,
      dancerPositions: updatedDancerPositions,
    };

    // Call parent update function
    onUpdateFormation(activeFormation.id, updatedFormation);
  };

  // Clear a dancer's custom path
  const clearDancerPath = (dancerId) => {
    const dancerData = activeFormation.dancerPositions[dancerId];
    if (!dancerData || !dancerData.path) return;

    // Create updated dancer positions without the path
    const { path, ...dancerWithoutPath } = dancerData;

    const updatedDancerPositions = {
      ...activeFormation.dancerPositions,
      [dancerId]: dancerWithoutPath,
    };

    // Create updated formation
    const updatedFormation = {
      ...activeFormation,
      dancerPositions: updatedDancerPositions,
    };

    // Call parent update function
    onUpdateFormation(activeFormation.id, updatedFormation);
  };

  // Determine if a dancer has a custom path
  const hasCustomPath = (dancerId) => {
    const dancerData = activeFormation.dancerPositions[dancerId];
    return dancerData && dancerData.path && dancerData.path.length > 1;
  };

  // Get dancer's current transition type
  const getDancerTransitionType = (dancerId) => {
    const dancerData = activeFormation.dancerPositions[dancerId];
    return dancerData?.transitionType || "linear";
  };

  return (
    <div className="dancer-transition-editor">
      <h3 className="section-title">Dancer Transitions</h3>
      <p className="section-description">
        Configure how each dancer moves during formation transitions
      </p>

      <div className="dancers-transition-list">
        {dancers.map((dancer) => (
          <div key={dancer.id} className="dancer-transition-item">
            <div className="dancer-info">
              <div
                className="dancer-color"
                style={{ backgroundColor: dancer.color }}
              ></div>
              <div className="dancer-name">{dancer.name}</div>
            </div>

            <div className="dancer-transition-controls">
              <select
                value={getDancerTransitionType(dancer.id)}
                onChange={(e) =>
                  updateDancerTransition(dancer.id, e.target.value)
                }
                className="transition-type-select"
              >
                {transitionTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>

              {hasCustomPath(dancer.id) && (
                <button
                  className="clear-path-button"
                  onClick={() => clearDancerPath(dancer.id)}
                  title="Clear custom path"
                >
                  Clear Path
                </button>
              )}
            </div>

            <div className="transition-description">
              {
                transitionTypes.find(
                  (t) => t.id === getDancerTransitionType(dancer.id)
                )?.description
              }
              {hasCustomPath(dancer.id) && (
                <span className="custom-path-indicator"> (Custom path)</span>
              )}
            </div>
          </div>
        ))}

        {dancers.length === 0 && (
          <div className="empty-list">
            No dancers added yet. Add dancers in the Dancer Management tab.
          </div>
        )}
      </div>

      <div className="transition-preview">
        <h4>Transition Types Preview</h4>
        <div className="transition-preview-grid">
          {transitionTypes.map((type) => (
            <div key={type.id} className="transition-preview-item">
              <div className="preview-header">{type.name}</div>
              <div className="preview-animation">
                <div className={`animation-dot ${type.id}`}></div>
              </div>
              <div className="preview-description">{type.description}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DancerTransitionEditor;
