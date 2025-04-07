// Enhanced group and formation management
import React, { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid"; // For generating unique IDs

// Main component
const FormationManager = ({
  beatTimestamps,
  dancers,
  onUpdateFormations,
  currentTime,
}) => {
  // Data structures
  const [groups, setGroups] = useState([]);
  const [formations, setFormations] = useState([]);
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [activeFormationId, setActiveFormationId] = useState(null);

  // Form state
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupColor, setNewGroupColor] = useState("#FF5500");
  const [newGroupStartBeat, setNewGroupStartBeat] = useState(1);
  const [newGroupLength, setNewGroupLength] = useState(8);

  // Formation form state
  const [newFormationName, setNewFormationName] = useState("");
  const [newFormationTransitionBeats, setNewFormationTransitionBeats] =
    useState(4);
  const [newFormationStartBeatOffset, setNewFormationStartBeatOffset] =
    useState(0);

  // Create a new choreography group
  const handleAddGroup = () => {
    const groupId = uuidv4();
    const newGroup = {
      id: groupId,
      name: newGroupName || `Group ${groups.length + 1}`,
      color: newGroupColor,
      startBeat: parseInt(newGroupStartBeat, 10) - 1, // Convert to 0-indexed
      length: parseInt(newGroupLength, 10),
      // Reference to formations that belong to this group
      formationIds: [],
    };

    setGroups((prev) => [...prev, newGroup]);
    setNewGroupName("");

    // Automatically create an initial formation for this group
    handleAddFormation(groupId);
  };

  // Create a new formation within a group
  const handleAddFormation = (groupId) => {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;

    // Calculate where this formation starts based on group and offset
    const startBeat =
      group.startBeat + parseInt(newFormationStartBeatOffset, 10);
    const transitionBeats = parseInt(newFormationTransitionBeats, 10);

    // Create the formation
    const formationId = uuidv4();
    const newFormation = {
      id: formationId,
      groupId: groupId,
      name: newFormationName || `Formation ${formations.length + 1}`,
      startBeat: startBeat,
      transitionBeats: transitionBeats,
      dancerPositions: {},
      // Initialize with default positions from previous formation if any
      ...getInitialDancerPositions(groupId),
    };

    setFormations((prev) => [...prev, newFormation]);

    // Add reference to this formation in the parent group
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id === groupId) {
          return {
            ...g,
            formationIds: [...g.formationIds, formationId],
          };
        }
        return g;
      })
    );

    setNewFormationName("");
    setActiveFormationId(formationId);
  };

  // Get initial dancer positions from the latest formation in the same group
  const getInitialDancerPositions = (groupId) => {
    const groupFormations = formations.filter((f) => f.groupId === groupId);

    if (groupFormations.length === 0) {
      // No previous formations in this group, use default positions
      const defaultPositions = {};
      dancers.forEach((dancer) => {
        defaultPositions[dancer.id] = { x: 200, y: 200 };
      });
      return { dancerPositions: defaultPositions };
    }

    // Use positions from the latest formation
    const latestFormation = groupFormations[groupFormations.length - 1];
    return { dancerPositions: { ...latestFormation.dancerPositions } };
  };

  // Update dancer position in a formation
  const updateDancerPosition = (formationId, dancerId, position) => {
    setFormations((prev) =>
      prev.map((formation) => {
        if (formation.id === formationId) {
          return {
            ...formation,
            dancerPositions: {
              ...formation.dancerPositions,
              [dancerId]: position,
            },
          };
        }
        return formation;
      })
    );
  };

  // Find the active formation based on current time
  useEffect(() => {
    if (!beatTimestamps.length || !formations.length) return;

    for (const formation of formations) {
      const startBeatIndex = formation.startBeat;
      const endBeatIndex = getFormationEndBeat(formation);

      if (startBeatIndex >= beatTimestamps.length) continue;

      const startTime = beatTimestamps[startBeatIndex];
      const endTime =
        endBeatIndex < beatTimestamps.length
          ? beatTimestamps[endBeatIndex]
          : beatTimestamps[beatTimestamps.length - 1] + 1;

      if (currentTime >= startTime && currentTime < endTime) {
        setActiveFormationId(formation.id);
        setActiveGroupId(formation.groupId);
        break;
      }
    }
  }, [currentTime, beatTimestamps, formations]);

  // Find where a formation ends (the start of the next formation in the group, or end of group)
  const getFormationEndBeat = (formation) => {
    // Get all formations in this group
    const groupFormations = formations
      .filter((f) => f.groupId === formation.groupId)
      .sort((a, b) => a.startBeat - b.startBeat);

    const currentIndex = groupFormations.findIndex(
      (f) => f.id === formation.id
    );

    // If there's a next formation in this group, use its start as our end
    if (currentIndex < groupFormations.length - 1) {
      return groupFormations[currentIndex + 1].startBeat;
    }

    // Otherwise, use the group's end
    const group = groups.find((g) => g.id === formation.groupId);
    if (group) {
      return group.startBeat + group.length;
    }

    // Fallback
    return formation.startBeat + 8;
  };

  // Calculate transition progress for a given formation and current time
  const getTransitionProgress = (formationId) => {
    const formation = formations.find((f) => f.id === formationId);
    if (!formation || !beatTimestamps.length) return 1; // Fully transitioned

    const startBeatIndex = formation.startBeat;
    const startTime = beatTimestamps[startBeatIndex] || 0;

    const transitionEndBeatIndex = Math.min(
      startBeatIndex + formation.transitionBeats,
      beatTimestamps.length - 1
    );

    const transitionEndTime = beatTimestamps[transitionEndBeatIndex] || 0;

    // Calculate progress (0 to 1)
    if (currentTime < startTime) return 0;
    if (currentTime >= transitionEndTime) return 1;

    return (currentTime - startTime) / (transitionEndTime - startTime);
  };

  // Render the UI
  return (
    <div className="formation-manager">
      <h3>Choreography Groups</h3>

      {/* Group creation form */}
      <div className="group-form">
        <input
          type="text"
          placeholder="Group Name"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
        />

        <div className="form-row">
          <label>
            Start Beat:
            <input
              type="number"
              min="1"
              value={newGroupStartBeat}
              onChange={(e) => setNewGroupStartBeat(e.target.value)}
            />
          </label>

          <label>
            Length (beats):
            <input
              type="number"
              min="1"
              value={newGroupLength}
              onChange={(e) => setNewGroupLength(e.target.value)}
            />
          </label>

          <label>
            Color:
            <input
              type="color"
              value={newGroupColor}
              onChange={(e) => setNewGroupColor(e.target.value)}
            />
          </label>
        </div>

        <button onClick={handleAddGroup}>Add Choreography Group</button>
      </div>

      {/* Group and formation list */}
      <div className="groups-list">
        {groups.map((group) => (
          <div
            key={group.id}
            className={`group-item ${
              activeGroupId === group.id ? "active" : ""
            }`}
            onClick={() => setActiveGroupId(group.id)}
          >
            <div
              className="group-header"
              style={{ backgroundColor: group.color }}
            >
              <h4>{group.name}</h4>
              <div className="beat-range">
                Beats {group.startBeat + 1} - {group.startBeat + group.length}
              </div>
            </div>

            {/* Formation list for this group */}
            <div className="formations-list">
              {formations
                .filter((f) => f.groupId === group.id)
                .map((formation) => (
                  <div
                    key={formation.id}
                    className={`formation-item ${
                      activeFormationId === formation.id ? "active" : ""
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveFormationId(formation.id);
                    }}
                  >
                    <div className="formation-name">{formation.name}</div>
                    <div className="formation-details">
                      Start: Beat {formation.startBeat + 1}, Transition:{" "}
                      {formation.transitionBeats} beats
                    </div>
                  </div>
                ))}

              {/* Add formation button */}
              {activeGroupId === group.id && (
                <div className="add-formation-form">
                  <input
                    type="text"
                    placeholder="Formation Name"
                    value={newFormationName}
                    onChange={(e) => setNewFormationName(e.target.value)}
                  />

                  <div className="form-row">
                    <label>
                      Offset:
                      <input
                        type="number"
                        value={newFormationStartBeatOffset}
                        onChange={(e) =>
                          setNewFormationStartBeatOffset(e.target.value)
                        }
                        title="Beats after group start"
                      />
                    </label>

                    <label>
                      Transition Beats:
                      <input
                        type="number"
                        min="1"
                        value={newFormationTransitionBeats}
                        onChange={(e) =>
                          setNewFormationTransitionBeats(e.target.value)
                        }
                      />
                    </label>
                  </div>

                  <button onClick={() => handleAddFormation(group.id)}>
                    Add Formation
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FormationManager;
