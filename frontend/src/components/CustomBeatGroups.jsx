import React from "react";
import "../styles/CustomBeatGroups.scss";

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
}) => {
  // New state for the group name input
  const [groupNameInput, setGroupNameInput] = React.useState("");

  // Modified onAddGroup handler to include the group name
  const handleAddGroup = () => {
    const newGroup = {
      groupName: groupNameInput || `Group ${customGroups.length + 1}`,
      groupLength: groupLengthInput,
      color: newGroupColor,
      startBeat:
        customGroups.length === 0
          ? initialGroupStart - 1
          : customGroups[customGroups.length - 1].startBeat +
            customGroups[customGroups.length - 1].groupLength,
    };

    onAddGroup(newGroup);
    setGroupNameInput(""); // Reset the name input after adding
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
            <div className="color-selector">
              <select
                className="select-control"
                value={newGroupColor}
                onChange={onNewGroupColorChange}
              >
                {markerColors.map((col, idx) => (
                  <option key={idx} value={col}>
                    Color {idx + 1}
                  </option>
                ))}
              </select>
              <span
                className="color-preview"
                style={{ backgroundColor: newGroupColor }}
              ></span>
            </div>
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
              <div key={idx} className="group-item">
                <div className="group-item-header">
                  <span
                    className="group-color"
                    style={{ backgroundColor: group.color }}
                  ></span>
                  <span className="group-name">
                    {group.groupName || `Group ${idx + 1}`}
                  </span>
                  <button
                    onClick={() => onRemoveGroup(idx)}
                    className="remove-button"
                  >
                    ×
                  </button>
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
