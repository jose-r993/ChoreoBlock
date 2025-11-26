import { useState } from "react";
import "../styles/CustomBeatGroups.scss";
import ColorPicker from "./ColorPicker";
import GroupCard from "./GroupCard";

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
  beatTimestamps,
  onJumpToPosition,
  activeGroupIndex,
  onUpdateGroup,
}) => {
  const [groupNameInput, setGroupNameInput] = useState("");

  const handleAddGroup = () => {
    // This component still uses beat-based inputs, but we convert to time-based
    // The parent's onAddGroup will handle setting proper startTime/endTime defaults
    const newGroup = {
      groupName: groupNameInput || `Group ${customGroups.length + 1}`,
      color: newGroupColor,
      formation: {},
      // Parent will set startTime, endTime, transitionStartTime, transitionEndTime
    };

    onAddGroup(newGroup);
    setGroupNameInput("");
  };

  return (
    <div className="custom-beat-groups">
      <section className="control-section">
        <h3 className="section-title">Create Beat Groups</h3>

        <div className="group-creator">
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
              <GroupCard
                key={idx}
                customGroups={customGroups}
                group={group}
                idx={idx}
                activeGroupIndex={activeGroupIndex}
                onUpdateGroup={onUpdateGroup}
                onRemoveGroup={onRemoveGroup}
                beatTimestamps={beatTimestamps}
                onJumpToPosition={onJumpToPosition}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default CustomBeatGroups;
