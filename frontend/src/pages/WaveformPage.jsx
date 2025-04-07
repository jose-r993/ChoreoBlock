import React, { useState, useRef, useCallback } from "react";
import { useLocation } from "react-router";
import Waveform from "../components/Waveform";
import SideBar from "../components/SideBar";
import Stage from "../components/Stage";
import "../styles/WaveformPage.scss";

const MARKER_COLORS = ["#FF5500", "#00AAFF", "#22CCAA", "#FFAA00", "#FF00AA"];

const WaveformPage = () => {
  const location = useLocation();
  const { audioFile, bpm, beatTimestamps = [] } = location.state || {};
  const wavesurferRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentZoom, setCurrentZoom] = useState(100);
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

  const handleZoomChange = useCallback(
    (newZoom) => {
      setCurrentZoom(newZoom);
      updateWavesurfer((wavesurfer) => {
        wavesurfer.zoom(newZoom);
      });
    },
    [updateWavesurfer]
  );

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

  const handleAddGroup = useCallback((newGroup) => {
    setCustomGroups((prevGroups) => {
      const newGroups = [
        ...prevGroups,
        {
          ...newGroup,
          groupLength: parseInt(newGroup.groupLength, 10),
          startBeat: parseInt(newGroup.startBeat, 10),
        },
      ];

      setFormations((prevFormations) => {
        const newFormations = [...prevFormations];
        // Create empty object for the new formation - will be populated with dancers' positions
        newFormations[newGroups.length - 1] = {};
        return newFormations;
      });

      return newGroups;
    });

    setGroupLengthInput("");
  }, []);

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

  const handleJumpToPosition = useCallback(
    (timestamp, index) => {
      if (!timestamp || typeof timestamp !== "number") return;

      setActiveGroupIndex(index);

      updateWavesurfer((wavesurfer) => {
        wavesurfer.seekTo(timestamp / wavesurfer.getDuration());
      });
    },
    [updateWavesurfer]
  );

  const handleAddDancer = useCallback((newDancer) => {
    setDancers((prev) => [...prev, newDancer]);

    // Initialize this dancer's position in all existing formations
    setFormations((prev) => {
      const updatedFormations = [...prev];

      updatedFormations.forEach((formation, index) => {
        if (!formation[newDancer.id]) {
          updatedFormations[index] = {
            ...formation,
            [newDancer.id]: { x: 200, y: 200 },
          };
        }
      });

      return updatedFormations;
    });
  }, []);

  const handleRemoveDancer = useCallback((dancerId) => {
    setDancers((prev) => prev.filter((dancer) => dancer.id !== dancerId));

    // Remove dancer from all formations
    setFormations((prev) => {
      return prev.map((formation) => {
        const newFormation = { ...formation };
        delete newFormation[dancerId];
        return newFormation;
      });
    });
  }, []);

  const handleUpdateFormation = useCallback(
    (groupIndex, updatedFormation) => {
      if (
        groupIndex === null ||
        groupIndex < 0 ||
        groupIndex >= formations.length
      )
        return;

      setFormations((prev) => {
        const newFormations = [...prev];
        newFormations[groupIndex] = updatedFormation;
        return newFormations;
      });
    },
    [formations.length]
  );

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
            currentZoom={currentZoom}
            onZoomChange={handleZoomChange}
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
            onRemoveGroup={handleRemoveGroup}
            onClearGroups={handleClearCustomGroups}
            newGroupColor={newGroupColor}
            onNewGroupColorChange={handleNewGroupColorChange}
            groupLengthInput={groupLengthInput}
            onGroupLengthChange={(value) => setGroupLengthInput(value)}
            initialGroupStart={initialGroupStart}
            onInitialGroupStartChange={(value) => setInitialGroupStart(value)}
            markerColors={MARKER_COLORS}
            currentTime={currentTime}
            bpm={bpm}
            beatTimestamps={beatTimestamps}
            onJumpToPosition={handleJumpToPosition}
            activeGroupIndex={activeGroupIndex}
            dancers={dancers}
            onAddDancer={handleAddDancer}
            onRemoveDancer={handleRemoveDancer}
          />
        </div>
        <Stage
          dancers={dancers}
          activeGroupIndex={activeGroupIndex}
          formations={formations}
          onUpdateFormation={handleUpdateFormation}
          currentTime={currentTime}
          beatTimestamps={beatTimestamps}
          customGroups={customGroups}
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
          volume={volume}
          currentZoom={currentZoom}
        />
      </div>
    </div>
  );
};

export default WaveformPage;
