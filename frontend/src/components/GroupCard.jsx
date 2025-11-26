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

  const handleJumpToGroup = (startTime, index) => {
    onJumpToPosition(startTime, index);
  };

  // Group level transition settings
  const handleTransitionStartChange = (e) => {
    if (activeGroupIndex === null) return;

    const value = parseFloat(e.target.value);
    if (isNaN(value) || value < 0) return;

    const group = customGroups[activeGroupIndex];
    if (!group) return;

    // Make sure transition start is within group bounds
    const validValue = Math.max(group.startTime, Math.min(value, group.endTime - 0.1));

    // Keep transition duration the same
    const currentDuration = group.transitionEndTime - group.transitionStartTime;
    let newTransitionEndTime = validValue + currentDuration;

    // Ensure transition end doesn't exceed group end
    if (newTransitionEndTime > group.endTime) {
      newTransitionEndTime = group.endTime;
    }

    const updatedGroup = {
      ...group,
      transitionStartTime: validValue,
      transitionEndTime: newTransitionEndTime,
    };

    onUpdateGroup(activeGroupIndex, updatedGroup);
  };

  const handleTransitionDurationChange = (e) => {
    if (activeGroupIndex === null) return;

    const value = parseFloat(e.target.value);
    if (isNaN(value) || value <= 0) return;

    const group = customGroups[activeGroupIndex];
    if (!group) return;

    // Calculate new end time based on duration
    let newTransitionEndTime = group.transitionStartTime + value;

    // Ensure transition doesn't exceed group bounds
    if (newTransitionEndTime > group.endTime) {
      newTransitionEndTime = group.endTime;
    }

    const updatedGroup = {
      ...group,
      transitionEndTime: newTransitionEndTime,
    };

    onUpdateGroup(activeGroupIndex, updatedGroup);
  };

  return (
    <div
      key={idx}
      className={`group-item ${activeGroupIndex === idx ? "active" : ""}`}
      onClick={() => handleJumpToGroup(group.startTime, idx)}
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
          <span className="detail-label">Start Time:</span>
          <span className="detail-value">{group.startTime?.toFixed(2)}s</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">Duration:</span>
          <span className="detail-value">{(group.endTime - group.startTime)?.toFixed(2)}s</span>
        </div>
      </div>
      {collapsedGroup && (
        <div className="group-transition-controls">
          <h4>Transition Settings</h4>
          <div className="transition-settings">
            <div className="setting-group">
              <label>Transition Start Time (seconds):</label>
              <div className="input-with-help">
                <input
                  type="number"
                  step="0.1"
                  value={group.transitionStartTime?.toFixed(2)}
                  onChange={handleTransitionStartChange}
                  min={group.startTime}
                  max={group.endTime - 0.1}
                />
                <span className="help-text">Seconds from group start</span>
              </div>
            </div>

            <div className="setting-group">
              <label>Transition Duration (seconds):</label>
              <div className="input-with-help">
                <input
                  type="number"
                  step="0.1"
                  value={(group.transitionEndTime - group.transitionStartTime)?.toFixed(2)}
                  onChange={handleTransitionDurationChange}
                  min="0.1"
                  max={(group.endTime - group.transitionStartTime)?.toFixed(2)}
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
                    ((group.transitionStartTime - group.startTime) /
                      (group.endTime - group.startTime || 1)) *
                    100
                  }%`,
                  width: `${
                    ((group.transitionEndTime - group.transitionStartTime) /
                      (group.endTime - group.startTime || 1)) *
                    100
                  }%`,
                }}
              >
                <span>Transition</span>
              </div>
              <div className="time-indicators">
                <span className="start">{group.startTime?.toFixed(1)}s</span>
                <span className="end">
                  {group.endTime?.toFixed(1)}s
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
