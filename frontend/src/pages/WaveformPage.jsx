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
  const [formations, setFormations] = useState([]);
  const [pathMode, setPathMode] = useState("curved");

  const handleUpdateFormation = useCallback(
    (groupIndex, updatedFormationData) => {
      if (groupIndex === null || groupIndex < 0) return;
      setFormations((prev) => {
        const newFormations = [...prev];
        while (newFormations.length <= groupIndex) {
          newFormations.push({});
        }
        newFormations[groupIndex] = updatedFormationData;
        console.log(
          `WAVEFORMPAGE: Updated formation state for index ${groupIndex}`,
          newFormations
        );
        return newFormations;
      });
    },
    []
  );

  const formationController = useFormationController({
    dancers,
    formations,
    customGroups,
    beatTimestamps,
    currentTime,
    onUpdateFormation: handleUpdateFormation,
  });

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

      setCustomGroups((prevGroups) => [...prevGroups, addedGroup]);

      const groupIndex = customGroups.length;
      setFormations((prevFormations) => {
        const newFormations = [...prevFormations];
        newFormations[groupIndex] = {};

        const prevGroupIndex = groupIndex - 1;
        if (prevGroupIndex >= 0 && prevFormations[prevGroupIndex]) {
          Object.keys(prevFormations[prevGroupIndex]).forEach((dancerId) => {
            if (prevFormations[prevGroupIndex][dancerId]) {
              newFormations[groupIndex][dancerId] = {
                x: prevFormations[prevGroupIndex][dancerId].x,
                y: prevFormations[prevGroupIndex][dancerId].y,
                path: null,
              };
            }
          });
        }
        return newFormations;
      });

      setActiveGroupIndex(groupIndex);
    },
    [customGroups.length]
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
        newFormations.splice(indexToRemove, 1);
        return newFormations;
      });
      if (activeGroupIndex === indexToRemove) {
        setActiveGroupIndex(null);
      } else if (activeGroupIndex > indexToRemove) {
        setActiveGroupIndex(activeGroupIndex - 1);
      }
    },
    [activeGroupIndex]
  );

  const handleClearCustomGroups = useCallback(() => {
    setCustomGroups([]);
    setFormations([]);
    setActiveGroupIndex(null);
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

  const handleAddDancer = useCallback((newDancer) => {
    setDancers((prev) => [...prev, newDancer]);
    setFormations((prev) => {
      const updatedFormations = [...prev];
      updatedFormations.forEach((_, index) => {
        if (!updatedFormations[index][newDancer.id]) {
          updatedFormations[index] = {
            ...updatedFormations[index],
            [newDancer.id]: { x: 200, y: 200, path: null },
          };
        }
      });
      return updatedFormations;
    });
  }, []);

  const handleRemoveDancer = useCallback((dancerId) => {
    setDancers((prev) => prev.filter((dancer) => dancer.id !== dancerId));
    setFormations((prev) => {
      return prev.map((formation) => {
        const newFormation = { ...formation };
        delete newFormation[dancerId];
        return newFormation;
      });
    });
  }, []);

  const handleSetDancerPosition = useCallback(
    (dancerId, x, y, groupIndex) => {
      if (groupIndex === null) return;
      console.log(
        `WAVEFORMPAGE: handleSetDancerPosition called for dancer ${dancerId}, group ${groupIndex}`
      );
      handleUpdateFormation(groupIndex, {
        ...(formations[groupIndex] || {}),
        [dancerId]: {
          ...(formations[groupIndex]?.[dancerId] || {
            x: 200,
            y: 200,
            path: null,
          }),
          x,
          y,
        },
      });
    },
    [handleUpdateFormation, formations]
  );

  const handleSavePath = useCallback(
    (dancerId, path, groupIndex) => {
      if (groupIndex === null) return;
      console.log(
        `WAVEFORMPAGE: handleSavePath called for dancer ${dancerId}, group ${groupIndex}`
      );
      const endPos = path && path.length > 0 ? path[path.length - 1] : null;
      const dataToUpdate = { path };
      if (endPos) {
        dataToUpdate.x = endPos.x;
        dataToUpdate.y = endPos.y;
      }
      handleUpdateFormation(groupIndex, {
        ...(formations[groupIndex] || {}),
        [dancerId]: {
          ...(formations[groupIndex]?.[dancerId] || {
            x: 200,
            y: 200,
            path: null,
          }),
          ...dataToUpdate,
        },
      });
    },
    [handleUpdateFormation, formations]
  );

  const handlePathModeChange = useCallback((mode) => {
    setPathMode(mode);
  }, []);

  const handleSelectFormation = (index) => {
    setActiveGroupIndex(index);
    if (index !== null && customGroups[index] && beatTimestamps.length > 0) {
      const group = customGroups[index];
      const beatIndex = group.startBeat;
      if (beatIndex >= 0 && beatIndex < beatTimestamps.length) {
        const timestamp = beatTimestamps[beatIndex];
        handleJumpToPosition(timestamp, index);
      }
    }
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
            onAddDancerPath={handleSavePath}
            onPathModeChange={handlePathModeChange}
            pathMode={pathMode}
          />
        </div>
        <Stage
          dancers={dancers}
          activeGroupIndex={activeGroupIndex}
          customGroups={customGroups}
          currentTimelineState={formationController.currentTimelineState}
          getDancerPosition={formationController.getDancerPosition}
          onSetDancerPosition={handleSetDancerPosition}
          onSavePath={handleSavePath}
          pathMode={pathMode}
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
