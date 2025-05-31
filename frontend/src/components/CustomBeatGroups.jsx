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
            {customGroups.map(
              (group, idx) => (
                console.log(group),
                (
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
                )
              )
            )}
          </div>
        </section>
      )}
    </div>
  );
};

export default CustomBeatGroups;
