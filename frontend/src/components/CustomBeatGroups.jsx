import { useState } from "react";
import "../styles/CustomBeatGroups.scss";
import ColorPicker from "./ColorPicker";

const CustomBeatGroups = ({
  customGroups,
  onAddGroup,
  onRemoveGroup,
  onClearGroups,
  newGroupColor,
  onNewGroupColorChange,
  groupLengthInput,
  onGroupLengthChange,
  initialGroupStart,
  onInitialGroupStartChange,
  markerColors,
  beatTimestamps = [],
  onJumpToPosition,
  activeGroupIndex,
}) => {
  const [groupNameInput, setGroupNameInput] = useState("");

  const handleAddGroup = () => {
    const newGroup = {
      groupName: groupNameInput || `Group ${customGroups.length + 1}`,
      groupLength: parseInt(groupLengthInput, 10),
      color: newGroupColor,
      startBeat:
        customGroups.length === 0
          ? parseInt(initialGroupStart, 10) - 1
          : customGroups[customGroups.length - 1].startBeat +
            parseInt(customGroups[customGroups.length - 1].groupLength, 10),
      formation: {},
    };

    onAddGroup(newGroup);
    setGroupNameInput("");
  };

  const handleJumpToGroup = (startBeat, index) => {
    if (beatTimestamps && beatTimestamps.length > startBeat) {
      const timestamp = beatTimestamps[startBeat];
      onJumpToPosition(timestamp, index);
    }
  };

  return (
    <div className="custom-beat-groups">
      <section className="control-section">
        <h3 className="section-title">Create Beat Groups</h3>

        <div className="group-creator">
          {customGroups.length === 0 && (
            <div className="control-group">
              <label className="control-label">First Beat</label>
              <input
                type="number"
                className="number-input"
                value={initialGroupStart}
                onChange={onInitialGroupStartChange}
                min="1"
              />
              <div className="input-description">
                Start position for the first group
              </div>
            </div>
          )}

          <div className="control-group">
            <label className="control-label">Group Name</label>
            <input
              type="text"
              className="text-input"
              value={groupNameInput}
              onChange={(e) => setGroupNameInput(e.target.value)}
              placeholder={`Group ${customGroups.length + 1}`}
            />
            <div className="input-description">
              Optional name for this group (e.g., "Descanso")
            </div>
          </div>

          <div className="control-group">
            <label className="control-label">Group Length</label>
            <input
              type="number"
              className="number-input"
              value={groupLengthInput}
              onChange={onGroupLengthChange}
              min="1"
            />
            <div className="input-description">
              Number of beats in this group
            </div>
          </div>

          <div className="control-group">
            <label className="control-label">Group Color</label>
            <ColorPicker
              colors={markerColors}
              selectedColor={newGroupColor}
              onColorChange={(color) => {
                const event = { target: { value: color } };
                onNewGroupColorChange(event);
              }}
            />
          </div>

          <div className="actions-group">
            <button
              onClick={handleAddGroup}
              className="action-button add-button"
              disabled={!groupLengthInput}
            >
              Add Group
            </button>

            {customGroups.length > 0 && (
              <button
                onClick={onClearGroups}
                className="action-button clear-button"
              >
                Clear All
              </button>
            )}
          </div>
        </div>
      </section>

      {customGroups.length > 0 && (
        <section className="control-section">
          <h3 className="section-title">Defined Groups</h3>
          <div className="groups-list">
            {customGroups.map((group, idx) => (
              <div
                key={idx}
                className={`group-item ${
                  activeGroupIndex === idx ? "active" : ""
                }`}
                onClick={() => handleJumpToGroup(group.startBeat, idx)}
              >
                <div className="group-item-header">
                  <span
                    className="group-color"
                    style={{ backgroundColor: group.color }}
                  ></span>
                  <span className="group-name">
                    {group.groupName ||
                      group.groupNameInput ||
                      `Group ${idx + 1}`}
                  </span>
                  <div className="group-controls">
                    {group.formation &&
                      Object.keys(group.formation).length > 0 && (
                        <span className="dancer-count">
                          {Object.keys(group.formation).length}
                          <span className="dancer-icon">👤</span>
                        </span>
                      )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent triggering the group click
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
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default CustomBeatGroups;
