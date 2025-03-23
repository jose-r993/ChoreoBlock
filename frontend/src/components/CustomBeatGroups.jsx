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
              onClick={onAddGroup}
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
                  <span className="group-name">Group {idx + 1}</span>
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
