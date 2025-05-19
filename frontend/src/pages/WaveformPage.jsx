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
  const [customGroups, setCustomGroups] = useState([]);
  const [newGroupColor, setNewGroupColor] = useState(MARKER_COLORS[0]);
  const [groupLengthInput, setGroupLengthInput] = useState("");
  const [initialGroupStart, setInitialGroupStart] = useState("1");
  const [activeGroupIndex, setActiveGroupIndex] = useState(null);

  const [dancers, setDancers] = useState([]);
  const [formations, setFormations] = useState(() =>
    customGroups.map(() => ({}))
  );
  const [pathMode, setPathMode] = useState("curved");
  const [selectedDancerIds, setSelectedDancerIds] = useState(new Set());

  useEffect(() => {
    setFormations((prevFormations) => {
      const currentLength = prevFormations.length;
      const targetLength = customGroups.length;
      if (currentLength < targetLength) {
        const newEntries = Array(targetLength - currentLength)
          .fill(null)
          .map(() => ({}));
        return [...prevFormations, ...newEntries];
      } else if (currentLength > targetLength) {
        return prevFormations.slice(0, targetLength);
      }
      return prevFormations;
    });
  }, [customGroups.length]);

  const handleUpdateFormation = useCallback(
    (groupIndex, updatedFormationDataFromHook) => {
      if (groupIndex === null || groupIndex < 0) return;
      setFormations((prevFormations) => {
        const newFormations = [...prevFormations];
        while (newFormations.length <= groupIndex) {
          newFormations.push({});
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

  const initialPositionsRef = useRef({});
  useEffect(() => {
    const newInitialPositions = dancers.reduce((acc, dancer) => {
      acc[dancer.id] = { x: dancer.initialX || 200, y: dancer.initialY || 200 };
      return acc;
    }, {});
    initialPositionsRef.current = newInitialPositions;
  }, [dancers]);

  const formationController = useFormationController({
    dancers,
    formations,
    customGroups,
    beatTimestamps,
    currentTime,
    activeGroupIndex,
    onUpdateFormation: handleUpdateFormation,
    initialPositions: initialPositionsRef.current,
  });

  const handleDancersSelected = useCallback((newlySelectedIdsSet) => {
    setSelectedDancerIds(newlySelectedIdsSet);
  }, []);

  const handlePathApplication = useCallback(
    (initiatingDancerId, gesturePath, currentPathMode) => {
      console.log("WAVEFORMPAGE: handlePathApplication called.");
      console.log(
        "WAVEFORMPAGE: initiatingDancerId (dancer who started the gesture):",
        initiatingDancerId
      );
      console.log(
        "WAVEFORMPAGE: current selectedDancerIds:",
        selectedDancerIds
      );
      console.log(
        "WAVEFORMPAGE: gesturePath length:",
        gesturePath ? gesturePath.length : "N/A"
      );
      console.log("WAVEFORMPAGE: activeGroupIndex:", activeGroupIndex);

      if (
        activeGroupIndex === null ||
        !gesturePath ||
        gesturePath.length === 0
      ) {
        console.warn(
          "WAVEFORMPAGE: Path application aborted - no active group or empty gesture path."
        );
        return;
      }

      if (selectedDancerIds && selectedDancerIds.size > 0) {
        console.log(
          `WAVEFORMPAGE: Applying path to GROUP of ${selectedDancerIds.size} dancers.`
        );
        const gestureStartPoint = gesturePath[0];

        if (
          !gestureStartPoint ||
          typeof gestureStartPoint.x !== "number" ||
          typeof gestureStartPoint.y !== "number"
        ) {
          console.error(
            "WAVEFORMPAGE: Invalid gestureStartPoint in master path.",
            gestureStartPoint
          );
          return;
        }

        selectedDancerIds.forEach((selectedDancerId) => {
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
            console.warn(
              `WAVEFORMPAGE: Could not get actual start for selected dancer ${selectedDancerId}. Skipping.`
            );
            return;
          }

          const deltaX = dancerActualStart.x - gestureStartPoint.x;
          const deltaY = dancerActualStart.y - gestureStartPoint.y;

          const individualPath = gesturePath.map((p) => ({
            x: p.x + deltaX,
            y: p.y + deltaY,
          }));

          console.log(
            `WAVEFORMPAGE: Applying translated path to ${selectedDancerId}. Original gestureStart: ${JSON.stringify(
              gestureStartPoint
            )}, DancerActualStart: ${JSON.stringify(
              dancerActualStart
            )}, First point of individualPath: ${JSON.stringify(
              individualPath[0]
            )}`
          );
          formationController.addDancerPath(
            selectedDancerId,
            individualPath,
            currentPathMode
          );
        });
      } else if (initiatingDancerId) {
        console.log(
          `WAVEFORMPAGE: Applying path to SINGLE dancer: ${initiatingDancerId}`
        );
        formationController.addDancerPath(
          initiatingDancerId,
          gesturePath,
          currentPathMode
        );
      } else {
        console.warn(
          "WAVEFORMPAGE: No target for path application (no selected group and no initiating dancer)."
        );
      }
    },
    [activeGroupIndex, selectedDancerIds, formationController]
  );

  const updateWavesurfer = useCallback((callback) => {
    if (wavesurferRef.current) {
      callback(wavesurferRef.current);
    }
  }, []);

  const togglePlayPause = useCallback(() => {
    updateWavesurfer((wavesurfer) => {
      wavesurfer.playPause();
      setIsPlaying(wavesurfer.isPlaying());
    });
  }, [updateWavesurfer]);

  const handleVolumeChange = useCallback(
    (newVolume) => {
      setVolume(newVolume);
      updateWavesurfer((wavesurfer) => {
        wavesurfer.setVolume(newVolume);
      });
    },
    [updateWavesurfer]
  );

  const handleGroupSizeChange = useCallback((event) => {
    const newSize = parseInt(event.target.value, 10);
    setGroupSize(newSize);
  }, []);

  const handleOffsetChange = useCallback((value) => {
    setMarkerOffset(value);
  }, []);

  const handleSubdivisionChange = useCallback((event) => {
    const newFactor = parseInt(event.target.value, 10);
    setSubdivisionFactor(newFactor);
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

      setFormations((prevFormations) => {
        const newFormations = [...prevFormations];
        const newFormationEntry = {};
        dancers.forEach((dancer) => {
          newFormationEntry[dancer.id] = { rawStagePath: null };
        });
        while (newFormations.length <= newGroupIndex) {
          newFormations.push({});
        }
        newFormations[newGroupIndex] = newFormationEntry;
        return newFormations;
      });
      setActiveGroupIndex(newGroupIndex);
    },
    [customGroups.length, dancers]
  );

  const handleUpdateGroup = useCallback(
    (index, updatedGroup) => {
      if (index < 0 || index >= customGroups.length) return;
      setCustomGroups((prev) => {
        const newGroups = [...prev];
        newGroups[index] = updatedGroup;
        return newGroups;
      });
    },
    [customGroups.length]
  );

  const handleRemoveGroup = useCallback(
    (indexToRemove) => {
      setCustomGroups((prev) => prev.filter((_, idx) => idx !== indexToRemove));
      setFormations((prev) => {
        const newFormations = [...prev];
        if (indexToRemove < newFormations.length) {
          newFormations.splice(indexToRemove, 1);
        }
        return newFormations;
      });
      if (activeGroupIndex === indexToRemove) {
        setActiveGroupIndex(null);
      } else if (
        activeGroupIndex !== null &&
        activeGroupIndex > indexToRemove
      ) {
        setActiveGroupIndex(activeGroupIndex - 1);
      }
    },
    [activeGroupIndex]
  );

  const handleClearCustomGroups = useCallback(() => {
    setCustomGroups([]);
    setFormations([]);
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
    if (duration > 0) {
      wavesurferRef.current.seekTo(timestamp / duration);
    }
    setActiveGroupIndex(index);
  }, []);

  const handleAddDancer = useCallback(
    (newDancerData) => {
      const dancerWithId = {
        ...newDancerData,
        id: newDancerData.id || `dancer-${Date.now()}`,
      };
      setDancers((prevDancers) => [...prevDancers, dancerWithId]);

      initialPositionsRef.current = {
        ...initialPositionsRef.current,
        [dancerWithId.id]: {
          x: newDancerData.initialX || 200,
          y: newDancerData.initialY || 200,
        },
      };

      setFormations((prevFormations) => {
        if (prevFormations.length === 0 && customGroups.length > 0) {
          const initialFormations = Array(customGroups.length)
            .fill(null)
            .map(() => ({}));
          return initialFormations.map((formationObject) => ({
            ...formationObject,
            [dancerWithId.id]: { rawStagePath: null },
          }));
        }
        return prevFormations.map((formationObject) => ({
          ...formationObject,
          [dancerWithId.id]: { rawStagePath: null },
        }));
      });
    },
    [customGroups.length]
  );

  const handleRemoveDancer = useCallback((dancerIdToRemove) => {
    setDancers((prevDancers) =>
      prevDancers.filter((dancer) => dancer.id !== dancerIdToRemove)
    );
    setFormations((prevFormations) => {
      return prevFormations.map((formationObject) => {
        const newFormation = { ...formationObject };
        delete newFormation[dancerIdToRemove];
        return newFormation;
      });
    });
    setSelectedDancerIds((prevSelected) => {
      const newSelected = new Set(prevSelected);
      newSelected.delete(dancerIdToRemove);
      return newSelected;
    });
  }, []);

  const handleSetDancerStaticHold = useCallback(
    (dancerId, x, y, groupIndex) => {
      if (groupIndex === null || groupIndex < 0) return;
      formationController.addDancerPath(dancerId, null, "direct");
    },
    [formationController]
  );

  const handlePathModeChange = useCallback((mode) => {
    setPathMode(mode);
  }, []);

  const handleSelectFormation = (index) => {
    setActiveGroupIndex(index);
    if (
      index !== null &&
      customGroups[index] &&
      beatTimestamps.length > 0 &&
      customGroups[index].startBeat < beatTimestamps.length
    ) {
      const group = customGroups[index];
      const beatIndex = group.startBeat;
      if (beatIndex >= 0) {
        const timestamp = beatTimestamps[beatIndex];
        handleJumpToPosition(timestamp, index);
      }
    }
    setSelectedDancerIds(new Set());
  };

  if (!audioFile || !beatTimestamps.length) {
    return (
      <div className="waveform-page empty-state">
        <h2>No audio file loaded</h2>
        <p>Please upload an audio file from the upload page first.</p>
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
            onAddDancerPath={handlePathApplication}
            onPathModeChange={handlePathModeChange}
            pathMode={pathMode}
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
          selectedDancerIds={selectedDancerIds}
          onDancersSelected={handleDancersSelected}
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
