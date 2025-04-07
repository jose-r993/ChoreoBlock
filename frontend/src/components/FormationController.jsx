import React, { useState, useEffect, useCallback } from "react";

// Main controller for the formation system
const FormationController = ({
  audioFile,
  beatTimestamps,
  dancers,
  currentTime,
  onJumpToPosition,
}) => {
  // State for choreography data
  const [groups, setGroups] = useState([]);
  const [formations, setFormations] = useState([]);
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [activeFormationId, setActiveFormationId] = useState(null);

  // Keep track of which formation is active based on current playback time
  useEffect(() => {
    if (!beatTimestamps.length || !formations.length) return;

    // Find the formation that corresponds to current playback time
    let currentFormation = null;
    let currentGroup = null;

    for (const formation of formations) {
      // Get the start time of this formation
      const startBeatIndex = Math.min(
        formation.startBeat,
        beatTimestamps.length - 1
      );
      const startTime = beatTimestamps[startBeatIndex];

      // Get end time (either next formation start or group end)
      const group = groups.find((g) => g.id === formation.groupId);
      if (!group) continue;

      // Find next formation in the same group
      const nextFormation = formations
        .filter(
          (f) =>
            f.groupId === formation.groupId && f.startBeat > formation.startBeat
        )
        .sort((a, b) => a.startBeat - b.startBeat)[0];

      let endTime;
      if (nextFormation) {
        // End at the start of the next formation
        const endBeatIndex = Math.min(
          nextFormation.startBeat,
          beatTimestamps.length - 1
        );
        endTime = beatTimestamps[endBeatIndex];
      } else {
        // End at the end of the group
        const endBeatIndex = Math.min(
          group.startBeat + group.length,
          beatTimestamps.length - 1
        );
        endTime = beatTimestamps[endBeatIndex];
      }

      // Check if current time is within this formation
      if (currentTime >= startTime && currentTime < endTime) {
        currentFormation = formation;
        currentGroup = group;
        break;
      }
    }

    // Update the active formation and group if needed
    if (currentFormation && currentFormation.id !== activeFormationId) {
      setActiveFormationId(currentFormation.id);
    }

    if (currentGroup && currentGroup.id !== activeGroupId) {
      setActiveGroupId(currentGroup.id);
    }
  }, [
    currentTime,
    beatTimestamps,
    formations,
    groups,
    activeFormationId,
    activeGroupId,
  ]);

  // Add a new choreography group
  const addGroup = useCallback(
    (groupData) => {
      const newGroup = {
        id: `group-${Date.now()}`,
        name: groupData.name || `Group ${groups.length + 1}`,
        color: groupData.color || "#FF5500",
        startBeat: groupData.startBeat || 0,
        length: groupData.length || 8,
        formationIds: [],
      };

      setGroups((prev) => [...prev, newGroup]);

      // Automatically create initial formation for this group
      const initialFormation = {
        id: `formation-${Date.now()}`,
        groupId: newGroup.id,
        name: `${newGroup.name} - Initial`,
        startBeat: newGroup.startBeat,
        transitionBeats: 4,
        dancerPositions: {},
      };

      // Initialize with default positions for all dancers
      dancers.forEach((dancer) => {
        initialFormation.dancerPositions[dancer.id] = {
          x: 200 + Math.random() * 100 - 50, // Random initial position around center
          y: 200 + Math.random() * 100 - 50,
          transitionType: "linear", // Default transition type
        };
      });

      // Update formations state
      setFormations((prev) => [...prev, initialFormation]);

      // Link this formation to the group
      setGroups((prev) =>
        prev.map((g) => {
          if (g.id === newGroup.id) {
            return {
              ...g,
              formationIds: [initialFormation.id],
            };
          }
          return g;
        })
      );

      // Activate the new formation and group
      setActiveGroupId(newGroup.id);
      setActiveFormationId(initialFormation.id);

      return newGroup.id;
    },
    [groups, dancers]
  );

  // Add a new formation to an existing group
  const addFormation = useCallback(
    (groupId, formationData) => {
      const group = groups.find((g) => g.id === groupId);
      if (!group) return null;

      // Find latest formation in this group to use as reference
      const existingFormations = formations
        .filter((f) => f.groupId === groupId)
        .sort((a, b) => a.startBeat - b.startBeat);

      const latestFormation = existingFormations[existingFormations.length - 1];

      // Determine start beat for the new formation
      let startBeat;
      if (formationData && typeof formationData.startBeat === "number") {
        startBeat = formationData.startBeat;
      } else if (latestFormation) {
        // Default to 8 beats after the last formation
        startBeat = latestFormation.startBeat + 8;
      } else {
        startBeat = group.startBeat;
      }

      // Make sure we're still within the group
      if (startBeat >= group.startBeat + group.length) {
        // Extend the group if needed
        setGroups((prev) =>
          prev.map((g) => {
            if (g.id === groupId) {
              return {
                ...g,
                length: startBeat - g.startBeat + 8, // Add 8 beats for this formation
              };
            }
            return g;
          })
        );
      }

      // Create the new formation
      const newFormation = {
        id: `formation-${Date.now()}`,
        groupId: groupId,
        name: formationData?.name || `Formation ${formations.length + 1}`,
        startBeat: startBeat,
        transitionBeats: formationData?.transitionBeats || 4,
        dancerPositions: {},
      };

      // Copy dancer positions from previous formation if available
      if (latestFormation) {
        Object.entries(latestFormation.dancerPositions).forEach(
          ([dancerId, position]) => {
            // Copy position but not paths
            const { path, ...positionWithoutPath } = position;
            newFormation.dancerPositions[dancerId] = positionWithoutPath;
          }
        );
      } else {
        // Initialize with default positions
        dancers.forEach((dancer) => {
          newFormation.dancerPositions[dancer.id] = {
            x: 200 + Math.random() * 100 - 50,
            y: 200 + Math.random() * 100 - 50,
            transitionType: "linear",
          };
        });
      }

      // Update formations state
      setFormations((prev) => [...prev, newFormation]);

      // Link this formation to the group
      setGroups((prev) =>
        prev.map((g) => {
          if (g.id === groupId) {
            return {
              ...g,
              formationIds: [...g.formationIds, newFormation.id],
            };
          }
          return g;
        })
      );

      // Activate the new formation
      setActiveFormationId(newFormation.id);

      return newFormation.id;
    },
    [groups, formations, dancers]
  );

  // Update a formation
  const updateFormation = useCallback((formationId, updatedData) => {
    setFormations((prev) =>
      prev.map((formation) => {
        if (formation.id === formationId) {
          return {
            ...formation,
            ...updatedData,
          };
        }
        return formation;
      })
    );
  }, []);

  // Update dancer position in a formation
  const updateDancerPosition = useCallback(
    (formationId, dancerId, position) => {
      setFormations((prev) =>
        prev.map((formation) => {
          if (formation.id === formationId) {
            return {
              ...formation,
              dancerPositions: {
                ...formation.dancerPositions,
                [dancerId]: {
                  ...formation.dancerPositions[dancerId],
                  ...position,
                },
              },
            };
          }
          return formation;
        })
      );
    },
    []
  );

  // Update dancer transition type
  const updateDancerTransition = useCallback(
    (formationId, dancerId, transitionType) => {
      setFormations((prev) =>
        prev.map((formation) => {
          if (formation.id === formationId) {
            return {
              ...formation,
              dancerPositions: {
                ...formation.dancerPositions,
                [dancerId]: {
                  ...formation.dancerPositions[dancerId],
                  transitionType,
                },
              },
            };
          }
          return formation;
        })
      );
    },
    []
  );

  // Add path to dancer movement
  const addDancerPath = useCallback((formationId, dancerId, path) => {
    setFormations((prev) =>
      prev.map((formation) => {
        if (formation.id === formationId) {
          return {
            ...formation,
            dancerPositions: {
              ...formation.dancerPositions,
              [dancerId]: {
                ...formation.dancerPositions[dancerId],
                path,
              },
            },
          };
        }
        return formation;
      })
    );
  }, []);

  // Remove a formation
  const removeFormation = useCallback(
    (formationId) => {
      const formation = formations.find((f) => f.id === formationId);
      if (!formation) return;

      // Can't remove the only formation in a group
      const groupFormations = formations.filter(
        (f) => f.groupId === formation.groupId
      );
      if (groupFormations.length <= 1) return;

      // Remove the formation
      setFormations((prev) => prev.filter((f) => f.id !== formationId));

      // Update the group's formationIds
      setGroups((prev) =>
        prev.map((group) => {
          if (group.id === formation.groupId) {
            return {
              ...group,
              formationIds: group.formationIds.filter(
                (id) => id !== formationId
              ),
            };
          }
          return group;
        })
      );

      // Activate another formation if needed
      if (activeFormationId === formationId) {
        // Find the next earliest formation in the group
        const remainingFormations = formations
          .filter(
            (f) => f.id !== formationId && f.groupId === formation.groupId
          )
          .sort((a, b) => a.startBeat - b.startBeat);

        if (remainingFormations.length > 0) {
          setActiveFormationId(remainingFormations[0].id);
        } else {
          setActiveFormationId(null);
        }
      }
    },
    [formations, activeFormationId]
  );

  // Remove a group and all its formations
  const removeGroup = useCallback(
    (groupId) => {
      const group = groups.find((g) => g.id === groupId);
      if (!group) return;

      // Remove all formations belonging to this group
      setFormations((prev) => prev.filter((f) => f.groupId !== groupId));

      // Remove the group
      setGroups((prev) => prev.filter((g) => g.id !== groupId));

      // Update active references if needed
      if (activeGroupId === groupId) {
        setActiveGroupId(null);
        setActiveFormationId(null);
      }
    },
    [groups, activeGroupId]
  );

  // Jump to a specific formation in the timeline
  const jumpToFormation = useCallback(
    (formationId) => {
      const formation = formations.find((f) => f.id === formationId);
      if (!formation || !beatTimestamps.length) return;

      const beatIndex = Math.min(
        formation.startBeat,
        beatTimestamps.length - 1
      );
      const timestamp = beatTimestamps[beatIndex];

      setActiveFormationId(formationId);
      setActiveGroupId(formation.groupId);

      if (onJumpToPosition) {
        onJumpToPosition(timestamp);
      }
    },
    [formations, beatTimestamps, onJumpToPosition]
  );

  // Get the active formation
  const getActiveFormation = useCallback(() => {
    return formations.find((f) => f.id === activeFormationId);
  }, [formations, activeFormationId]);

  // Get the active group
  const getActiveGroup = useCallback(() => {
    return groups.find((g) => g.id === activeGroupId);
  }, [groups, activeGroupId]);

  // Calculate transition progress for given formation and time
  const getTransitionProgress = useCallback(
    (formationId, timeOverride = null) => {
      const formation = formations.find((f) => f.id === formationId);
      if (!formation || !beatTimestamps.length) return 1; // Fully transitioned

      // Use provided time or current time
      const time = timeOverride !== null ? timeOverride : currentTime;

      // Get start time
      const startBeatIndex = Math.min(
        formation.startBeat,
        beatTimestamps.length - 1
      );
      const startTime = beatTimestamps[startBeatIndex];

      // Get transition end time
      const transitionEndBeatIndex = Math.min(
        startBeatIndex + formation.transitionBeats,
        beatTimestamps.length - 1
      );
      const transitionEndTime = beatTimestamps[transitionEndBeatIndex];

      // Calculate progress (0 to 1)
      if (time < startTime) return 0;
      if (time >= transitionEndTime) return 1;

      return (time - startTime) / (transitionEndTime - startTime);
    },
    [formations, beatTimestamps, currentTime]
  );

  // Return the controller interface
  return {
    groups,
    formations,
    activeGroupId,
    activeFormationId,
    addGroup,
    addFormation,
    updateFormation,
    updateDancerPosition,
    updateDancerTransition,
    addDancerPath,
    removeFormation,
    removeGroup,
    jumpToFormation,
    getActiveFormation,
    getActiveGroup,
    getTransitionProgress,
    setActiveGroupId,
    setActiveFormationId,
  };
};

export default FormationController;
