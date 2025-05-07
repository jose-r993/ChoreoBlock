import React, { useState } from "react";
import "../styles/TransitionControls.scss";

const TransitionControls = ({
  activeGroupIndex,
  customGroups,
  formations,
  dancers,
  onUpdateGroup,
  onUpdateFormation,
  setDancerTransitionType,
}) => {
  const [selectedTransitionView, setSelectedTransitionView] = useState("group");

  // Group level transition settings
  const handleTransitionStartChange = (e) => {
    if (activeGroupIndex === null) return;

    const value = parseInt(e.target.value, 10);
    if (isNaN(value) || value < 0) return;

    const group = customGroups[activeGroupIndex];
    if (!group) return;

    // Make sure transition start is within group length
    const validValue = Math.min(value, group.groupLength - 1);

    const updatedGroup = {
      ...group,
      transitionStartBeat: validValue,
    };

    onUpdateGroup(activeGroupIndex, updatedGroup);
  };

  const handleTransitionLengthChange = (e) => {
    if (activeGroupIndex === null) return;

    const value = parseInt(e.target.value, 10);
    if (isNaN(value) || value <= 0) return;

    const group = customGroups[activeGroupIndex];
    if (!group) return;

    // Ensure transition doesn't exceed group length
    const transitionStart = group.transitionStartBeat || 0;
    const maxLength = group.groupLength - transitionStart;
    const validValue = Math.min(value, maxLength);

    const updatedGroup = {
      ...group,
      transitionLength: validValue,
    };

    onUpdateGroup(activeGroupIndex, updatedGroup);
  };

  // Dancer level transition settings
  const handleDancerTransitionChange = (dancerId, type) => {
    setDancerTransitionType(dancerId, type);
  };

  // Get transition settings from active group
  const getActiveGroupTransitionSettings = () => {
    if (activeGroupIndex === null || !customGroups[activeGroupIndex]) {
      return {
        transitionStartBeat: 0,
        transitionLength: 4,
      };
    }

    const group = customGroups[activeGroupIndex];
    return {
      transitionStartBeat: group.transitionStartBeat || 0,
      transitionLength: group.transitionLength || 4,
    };
  };

  // Get a dancer's transition type
  const getDancerTransitionType = (dancerId) => {
    if (activeGroupIndex === null || !formations[activeGroupIndex])
      return "linear";

    const dancerData = formations[activeGroupIndex][dancerId];
    return dancerData?.transitionType || "linear";
  };

  // Check if a dancer has a custom path
  const dancerHasPath = (dancerId) => {
    if (activeGroupIndex === null || !formations[activeGroupIndex])
      return false;

    const dancerData = formations[activeGroupIndex][dancerId];
    return dancerData?.path && dancerData.path.length > 1;
  };

  // Render transition controls
  const renderGroupTransitionControls = () => {
    if (activeGroupIndex === null) {
      return (
        <div className="empty-state">
          <p>Select a beat group to edit its transition settings</p>
        </div>
      );
    }

    const settings = getActiveGroupTransitionSettings();
    const groupName =
      customGroups[activeGroupIndex]?.groupName ||
      `Group ${activeGroupIndex + 1}`;

    return (
      <div className="group-transition-controls">
        <h4>Transition Settings for "{groupName}"</h4>

        <div className="transition-settings">
          <div className="setting-group">
            <label>Transition Start Beat:</label>
            <div className="input-with-help">
              <input
                type="number"
                value={settings.transitionStartBeat}
                onChange={handleTransitionStartChange}
                min="0"
                max={customGroups[activeGroupIndex]?.groupLength - 1 || 0}
              />
              <span className="help-text">Beats after group start</span>
            </div>
          </div>

          <div className="setting-group">
            <label>Transition Length (beats):</label>
            <div className="input-with-help">
              <input
                type="number"
                value={settings.transitionLength}
                onChange={handleTransitionLengthChange}
                min="1"
                max={
                  (customGroups[activeGroupIndex]?.groupLength || 0) -
                  (settings.transitionStartBeat || 0)
                }
              />
              <span className="help-text">How long the transition takes</span>
            </div>
          </div>
        </div>

        <div className="timing-visualization">
          <div className="group-timeline">
            <div
              className="transition-region"
              style={{
                left: `${
                  (settings.transitionStartBeat /
                    (customGroups[activeGroupIndex]?.groupLength || 1)) *
                  100
                }%`,
                width: `${
                  (settings.transitionLength /
                    (customGroups[activeGroupIndex]?.groupLength || 1)) *
                  100
                }%`,
              }}
            >
              <span>Transition</span>
            </div>
            <div className="time-indicators">
              <span className="start">0</span>
              <span className="end">
                {customGroups[activeGroupIndex]?.groupLength || 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDancerTransitionControls = () => {
    if (activeGroupIndex === null) {
      return (
        <div className="empty-state">
          <p>Select a beat group to edit dancer transitions</p>
        </div>
      );
    }

    if (!dancers.length) {
      return (
        <div className="empty-state">
          <p>No dancers added yet</p>
        </div>
      );
    }

    const transitionTypes = [
      { id: "linear", label: "Linear" },
      { id: "easeInOut", label: "Smooth" },
      { id: "easeIn", label: "Accelerate" },
      { id: "easeOut", label: "Decelerate" },
      { id: "delayed", label: "Delayed" },
      { id: "early", label: "Early" },
      { id: "bounce", label: "Bounce" },
    ];

    return (
      <div className="dancer-transition-controls">
        <h4>Dancer Transition Types</h4>
        <div className="dancers-grid">
          {dancers.map((dancer) => (
            <div key={dancer.id} className="dancer-transition-item">
              <div className="dancer-info">
                <div
                  className="dancer-color"
                  style={{ backgroundColor: dancer.color }}
                ></div>
                <span className="dancer-name">{dancer.name}</span>
              </div>

              <div className="dancer-transition-setting">
                <select
                  value={getDancerTransitionType(dancer.id)}
                  onChange={(e) =>
                    handleDancerTransitionChange(dancer.id, e.target.value)
                  }
                >
                  {transitionTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.label}
                    </option>
                  ))}
                </select>

                {dancerHasPath(dancer.id) && (
                  <span className="has-path-label">Has custom path</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="transition-controls">
      <div className="view-selector">
        <button
          className={selectedTransitionView === "group" ? "active" : ""}
          onClick={() => setSelectedTransitionView("group")}
        >
          Group Timing
        </button>
        <button
          className={selectedTransitionView === "dancers" ? "active" : ""}
          onClick={() => setSelectedTransitionView("dancers")}
        >
          Dancer Settings
        </button>
      </div>

      <div className="transition-content-sideBar">
        {selectedTransitionView === "group"
          ? renderGroupTransitionControls()
          : renderDancerTransitionControls()}
      </div>
    </div>
  );
};

export default TransitionControls;
