import React, { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "react-router";
import Waveform from "../components/Waveform";
import SideBar from "../components/SideBar";
import Stage from "../components/Stage";
import useFormationController from "../components/FormationController";
import "../styles/WaveformPage.scss";

const MARKER_COLORS = ["#FF5500", "#00AAFF", "#22CCAA", "#FFAA00", "#FF00AA"];

const WaveformPage = () => {
  const location = useLocation();
  const { audioFile, bpm, beatTimestamps = [] } = location.state || {};
  const wavesurferRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.25);

  const [groupSize, setGroupSize] = useState(8);
  const [markerOffset, setMarkerOffset] = useState(0);
  const [subdivisionFactor, setSubdivisionFactor] = useState(1);
  const [customGroups, setCustomGroups] = useState(
    location.state?.customGroups || []
  );
  const [newGroupColor, setNewGroupColor] = useState(MARKER_COLORS[0]);
  const [groupLengthInput, setGroupLengthInput] = useState("");
  const [initialGroupStart, setInitialGroupStart] = useState("1");
  const [activeGroupIndex, setActiveGroupIndex] = useState(null);

  const [dancers, setDancers] = useState([]);
  const [formations, setFormations] = useState([]);

  const [pathMode, setPathMode] = useState("auto");
  const [selectedDancerIds, setSelectedDancerIds] = useState(new Set());

  useEffect(() => {
    setFormations((prevFormations) => {
      const targetLength = customGroups.length;
      const newFormations = prevFormations.slice(0, targetLength);
      while (newFormations.length < targetLength) {
        const newFormationEntry = {};
        dancers.forEach((dancer) => {
          newFormationEntry[dancer.id] = {
            rawStagePath: null,
            pathMetadata: { kind: "hold" },
          };
        });
        newFormations.push(newFormationEntry);
      }
      return newFormations;
    });
  }, [customGroups.length, dancers]);

  const handleUpdateFormation = useCallback(
    (groupIndex, updatedFormationDataFromHook) => {
      if (groupIndex === null || groupIndex < 0) return;
      setFormations((prevFormations) => {
        const newFormations = [...prevFormations];
        if (groupIndex >= newFormations.length) {
          while (newFormations.length <= groupIndex) {
            newFormations.push({});
          }
        }
        if (
          typeof updatedFormationDataFromHook === "object" &&
          updatedFormationDataFromHook !== null &&
          !Array.isArray(updatedFormationDataFromHook)
        ) {
          newFormations[groupIndex] = updatedFormationDataFromHook;
        } else {
          newFormations[groupIndex] = prevFormations[groupIndex] || {};
        }
        return newFormations;
      });
    },
    []
  );

  const [initialPositions, setInitialPositions] = useState({});
  useEffect(() => {
    const newInitialPositions = dancers.reduce((acc, dancer) => {
      acc[dancer.id] = { x: dancer.initialX || 200, y: dancer.initialY || 200 };
      return acc;
    }, {});
    setInitialPositions(newInitialPositions);
  }, [dancers]);

  const formationController = useFormationController({
    dancers,
    formations,
    customGroups,
    beatTimestamps,
    currentTime,
    activeGroupIndex,
    onUpdateFormation: handleUpdateFormation,
    initialPositions: initialPositions,
  });

  const handleDancersSelected = useCallback((newlySelectedIdsSet) => {
    setSelectedDancerIds(newlySelectedIdsSet);
  }, []);

  const handlePathApplication = useCallback(
    (
      initiatingDancerId,
      gesturePoints,
      processedPathKind,
      processedPathSubKind
    ) => {
      if (activeGroupIndex === null) return;

      if (gesturePoints === null && initiatingDancerId) {
        formationController.addDancerPath(initiatingDancerId, null, "hold"); // Cleared path is a "hold"
        return;
      }
      if (!gesturePoints || gesturePoints.length === 0) {
        return;
      }

      const currentSelectedIds = selectedDancerIds;

      if (
        currentSelectedIds &&
        currentSelectedIds.size > 0 &&
        !(
          currentSelectedIds.size === 1 &&
          currentSelectedIds.has(initiatingDancerId)
        )
      ) {
        const gestureStartPoint = gesturePoints[0];
        if (
          !gestureStartPoint ||
          typeof gestureStartPoint.x !== "number" ||
          typeof gestureStartPoint.y !== "number"
        ) {
          return;
        }
        currentSelectedIds.forEach((selectedDancerId) => {
          const dancerActualStart =
            formationController.getActualStartForFormation(
              selectedDancerId,
              activeGroupIndex
            );
          if (
            !dancerActualStart ||
            typeof dancerActualStart.x !== "number" ||
            typeof dancerActualStart.y !== "number"
          ) {
            return;
          }
          const deltaX = dancerActualStart.x - gestureStartPoint.x;
          const deltaY = dancerActualStart.y - gestureStartPoint.y;
          const individualPath = gesturePoints.map((p) => ({
            x: p.x + deltaX,
            y: p.y + deltaY,
          }));
          formationController.addDancerPath(
            selectedDancerId,
            individualPath,
            processedPathKind,
            processedPathSubKind
          );
        });
      } else if (initiatingDancerId) {
        formationController.addDancerPath(
          initiatingDancerId,
          gesturePoints,
          processedPathKind,
          processedPathSubKind
        );
      }
    },
    [activeGroupIndex, selectedDancerIds, formationController]
  );

  const handlePathModeChange = useCallback((newMode) => {
    setPathMode(newMode);
  }, []);

  const updateWavesurfer = useCallback((callback) => {
    if (wavesurferRef.current) callback(wavesurferRef.current);
  }, []);
  const togglePlayPause = useCallback(() => {
    updateWavesurfer((ws) => {
      ws.playPause();
      setIsPlaying(ws.isPlaying());
    });
  }, [updateWavesurfer]);
  const handleVolumeChange = useCallback(
    (newVolume) => {
      setVolume(newVolume);
      updateWavesurfer((ws) => {
        ws.setVolume(newVolume);
      });
    },
    [updateWavesurfer]
  );
  const handleGroupSizeChange = useCallback((event) => {
    setGroupSize(parseInt(event.target.value, 10));
  }, []);
  const handleOffsetChange = useCallback((value) => {
    setMarkerOffset(value);
  }, []);
  const handleSubdivisionChange = useCallback((event) => {
    setSubdivisionFactor(parseInt(event.target.value, 10));
  }, []);

  const handleAddGroup = useCallback(
    (newGroupData) => {
      const groupLength = Math.max(
        1,
        parseInt(newGroupData.groupLength, 10) || 8
      );
      const startBeat = parseInt(newGroupData.startBeat, 10) || 0;
      const defaultTransitionStartBeat = startBeat;
      const defaultTransitionLength = Math.max(0, groupLength - 1);
      const addedGroup = {
        ...newGroupData,
        startBeat: startBeat,
        groupLength: groupLength,
        transitionStartBeat:
          newGroupData.transitionStartBeat ?? defaultTransitionStartBeat,
        transitionLength:
          newGroupData.transitionLength ?? defaultTransitionLength,
      };
      const newGroupIndex = customGroups.length;
      setCustomGroups((prevGroups) => [...prevGroups, addedGroup]);
      setActiveGroupIndex(newGroupIndex);
    },
    [customGroups.length]
  );

  const handleUpdateGroup = useCallback(
    (index, updatedGroup) => {
      if (index < 0 || index >= customGroups.length) return;
      setCustomGroups((prev) => {
        const ng = [...prev];
        ng[index] = updatedGroup;
        return ng;
      });
    },
    [customGroups.length]
  );

  const handleRemoveGroup = useCallback(
    (indexToRemove) => {
      setCustomGroups((prev) => prev.filter((_, idx) => idx !== indexToRemove));
      if (activeGroupIndex === indexToRemove) setActiveGroupIndex(null);
      else if (activeGroupIndex !== null && activeGroupIndex > indexToRemove)
        setActiveGroupIndex(activeGroupIndex - 1);
    },
    [activeGroupIndex]
  );

  const handleClearCustomGroups = useCallback(() => {
    setCustomGroups([]);
    setActiveGroupIndex(null);
    setSelectedDancerIds(new Set());
  }, []);

  const handleNewGroupColorChange = useCallback((event) => {
    setNewGroupColor(event.target.value);
  }, []);
  const handleTimeUpdate = useCallback((time) => {
    setCurrentTime(time);
  }, []);
  const setWavesurferRef = useCallback((instance) => {
    wavesurferRef.current = instance;
  }, []);

  const handleJumpToPosition = useCallback((timestamp, index) => {
    if (!wavesurferRef.current || typeof timestamp !== "number") return;
    const duration = wavesurferRef.current.getDuration();
    if (duration > 0) wavesurferRef.current.seekTo(timestamp / duration);
    setActiveGroupIndex(index);
  }, []);

  const handleAddDancer = useCallback((newDancerData) => {
    const dancerWithId = {
      ...newDancerData,
      id: newDancerData.id || `dancer-${Date.now()}`,
      initialX: newDancerData.initialX || 200,
      initialY: newDancerData.initialY || 200,
    };
    setDancers((prevDancers) => [...prevDancers, dancerWithId]);
  }, []);

  const handleRemoveDancer = useCallback((dancerIdToRemove) => {
    setDancers((prevDancers) =>
      prevDancers.filter((d) => d.id !== dancerIdToRemove)
    );
    setFormations((prevFormations) =>
      prevFormations.map((fo) => {
        const newFo = { ...fo };
        delete newFo[dancerIdToRemove];
        return newFo;
      })
    );
    setSelectedDancerIds((prevSelected) => {
      const newSelected = new Set(prevSelected);
      newSelected.delete(dancerIdToRemove);
      return newSelected;
    });
  }, []);

  const handleSetDancerStaticHold = useCallback(
    (dancerId, x, y, groupIndex) => {
      if (groupIndex === null || groupIndex < 0) return;
      formationController.addDancerPath(dancerId, null, "hold");
    },
    [formationController]
  );

  const handleSelectFormation = (index) => {
    setActiveGroupIndex(index);
    if (
      index !== null &&
      customGroups[index] &&
      beatTimestamps.length > 0 &&
      customGroups[index].startBeat >= 0 &&
      customGroups[index].startBeat < beatTimestamps.length
    ) {
      const group = customGroups[index];
      const beatIndex = group.startBeat;
      const timestamp = beatTimestamps[beatIndex];
      handleJumpToPosition(timestamp, index);
    }
    setSelectedDancerIds(new Set());
  };

  if (!audioFile || !beatTimestamps || beatTimestamps.length === 0) {
    return (
      <div className="waveform-page empty-state">
        <h2>No audio file loaded or beat timestamps missing</h2>
        <p>Please upload an audio file and ensure beat data is processed.</p>
      </div>
    );
  }

  return (
    <div className="waveform-page">
      <div className="main-content">
        <div className="sidebar">
          <SideBar
            volume={volume}
            onVolumeChange={handleVolumeChange}
            groupSize={groupSize}
            onGroupSizeChange={handleGroupSizeChange}
            markerOffset={markerOffset}
            onOffsetChange={handleOffsetChange}
            subdivisionFactor={subdivisionFactor}
            onSubdivisionChange={handleSubdivisionChange}
            customGroups={customGroups}
            onAddGroup={handleAddGroup}
            onUpdateGroup={handleUpdateGroup}
            onRemoveGroup={handleRemoveGroup}
            onClearGroups={handleClearCustomGroups}
            newGroupColor={newGroupColor}
            onNewGroupColorChange={handleNewGroupColorChange}
            groupLengthInput={groupLengthInput}
            onGroupLengthChange={setGroupLengthInput}
            initialGroupStart={initialGroupStart}
            onInitialGroupStartChange={setInitialGroupStart}
            markerColors={MARKER_COLORS}
            currentTime={currentTime}
            bpm={bpm}
            beatTimestamps={beatTimestamps}
            onJumpToPosition={handleJumpToPosition}
            activeGroupIndex={activeGroupIndex}
            dancers={dancers}
            onAddDancer={handleAddDancer}
            onRemoveDancer={handleRemoveDancer}
            formations={formations}
            currentPathMode={pathMode}
            onPathModeChange={handlePathModeChange}
            onAddDancerPathForSidebar={handlePathApplication}
            selectedDancerIds={selectedDancerIds}
            onDancersSelected={handleDancersSelected}
          />
        </div>
        <Stage
          dancers={dancers}
          activeGroupIndex={activeGroupIndex}
          customGroups={customGroups}
          currentTimelineState={formationController.currentTimelineState}
          getDancerPosition={formationController.getDancerPosition}
          onSetDancerPosition={handleSetDancerStaticHold}
          onSavePath={handlePathApplication}
          pathMode={pathMode}
          isStageInPathDrawingMode={activeGroupIndex !== null}
          selectedDancerIds={selectedDancerIds}
          onDancersSelected={handleDancersSelected}
          getActualStartForFormation={
            formationController.getActualStartForFormation
          }
          getActualEndForFormation={
            formationController.getActualEndForFormation
          }
          formations={formations}
        />
      </div>
      <div className="waveform-container">
        <Waveform
          audioFile={audioFile}
          beatTimestamps={beatTimestamps}
          onPlayPause={togglePlayPause}
          isPlaying={isPlaying}
          bpm={bpm}
          groupSize={groupSize}
          onTimeUpdate={handleTimeUpdate}
          onWavesurferInit={setWavesurferRef}
          markerOffset={markerOffset}
          subdivisionFactor={subdivisionFactor}
          customGroups={customGroups}
          onUpdateGroup={handleUpdateGroup}
          onAddGroup={handleAddGroup}
          onSelectGroup={handleSelectFormation}
          currentTime={currentTime}
          volume={volume}
          activeGroupIndex={activeGroupIndex}
        />
      </div>
    </div>
  );
};

export default WaveformPage;
