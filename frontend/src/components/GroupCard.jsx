import React, { useState } from "react";
import chevronRight from "../assets/rightArrow.svg";
import chrevronDown from "../assets/downArrow.svg";

const GroupCard = ({
  customGroups,
  group,
  idx,
  activeGroupIndex,
  onUpdateGroup,
  onRemoveGroup,
  beatTimestamps = [],
  onJumpToPosition,
}) => {
  const [collapsedGroup, setCollapsedGroup] = useState(null);

  const handleJumpToGroup = (startBeat, index) => {
    if (beatTimestamps && beatTimestamps.length > startBeat) {
      const timestamp = beatTimestamps[startBeat];
      onJumpToPosition(timestamp, index);
    }
  };

  // Group level transition settings
  const handleTransitionStartChange = (e) => {
    if (activeGroupIndex === null) return;

    const value = parseInt(e.target.value, 10);
    if (isNaN(value) || value < 0) return;

    const group = customGroups[activeGroupIndex];
    if (!group) return;

    // Make sure transition start is within group length
    const maxTransitionStart = group.groupLength + group.startBeat - 1;
    const validValue = Math.min(value, maxTransitionStart);

    const updatedGroup = {
      ...group,
      transitionStartBeat:
        validValue >= group.startBeat ? validValue : group.startBeat,
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
    const maxLength =
      group.transitionStartBeat + group.groupLength - transitionStart;
    const validValue = Math.min(value, maxLength);

    const updatedGroup = {
      ...group,
      transitionLength: validValue,
    };

    onUpdateGroup(activeGroupIndex, updatedGroup);
  };

  return (
    <div
      key={idx}
      className={`group-item ${activeGroupIndex === idx ? "active" : ""}`}
      onClick={() => handleJumpToGroup(group.startBeat, idx)}
    >
      <div className="group-item-header">
        <span
          className="group-color"
          style={{ backgroundColor: group.color }}
        ></span>
        <button
          className="group-name"
          onClick={(e) => {
            setCollapsedGroup(!collapsedGroup);
          }}
        >
          {collapsedGroup ? (
            <img
              className="group-name--chevron"
              src={chrevronDown}
              alt="dropdown arrow"
            />
          ) : (
            <img
              className="group-name--chevron"
              src={chevronRight}
              alt="dropdown arrow"
            />
          )}
          <span className="group-name--text">
            {group.groupName || group.groupNameInput || `Group ${idx + 1}`}
          </span>
        </button>
        <div className="group-controls">
          {group.formation && Object.keys(group.formation).length > 0 && (
            <span className="dancer-count">
              {Object.keys(group.formation).length}
              <span className="dancer-icon">👤</span>
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemoveGroup(idx);
            }}
            className="remove-button"
          >
            ×
          </button>
        </div>
      </div>
      <div className="group-details">
        <div className="detail-item">
          <span className="detail-label">Start Beat:</span>
          <span className="detail-value">{group.startBeat + 1}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">Length:</span>
          <span className="detail-value">{group.groupLength}</span>
        </div>
      </div>
      {collapsedGroup && (
        <div className="group-transition-controls">
          <h4>Transition Settings</h4>
          <div className="transition-settings">
            <div className="setting-group">
              <label>Transition Start Beat:</label>
              <div className="input-with-help">
                <input
                  type="number"
                  value={group.transitionStartBeat}
                  onChange={handleTransitionStartChange}
                  min="0"
                  max={
                    customGroups[activeGroupIndex]?.groupLength +
                      group.transitionStartBeat -
                      1 || 0
                  }
                />
                <span className="help-text">Beats after group start</span>
              </div>
            </div>

            <div className="setting-group">
              <label>Transition Length (beats):</label>
              <div className="input-with-help">
                <input
                  type="number"
                  value={group.transitionLength}
                  onChange={handleTransitionLengthChange}
                  min="1"
                  max={
                    (customGroups[activeGroupIndex]?.groupLength || 0) -
                    (group.transitionStartBeat - group.startBeat || 0)
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
                    (group.transitionStartBeat /
                      (customGroups[activeGroupIndex]?.groupLength || 1)) *
                    100
                  }%`,
                  width: `${
                    (group.transitionLength /
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
      )}
    </div>
  );
};

export default GroupCard;
