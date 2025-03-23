import React, { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "react-router";
import Waveform from "../components/Waveform";
import SideBar from "../components/SideBar";
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

  const handleAddGroup = useCallback(() => {
    const length = parseInt(groupLengthInput);
    if (isNaN(length) || length <= 0) return;

    let startBeat;
    if (customGroups.length === 0) {
      startBeat = parseInt(initialGroupStart) - 1;
      if (isNaN(startBeat) || startBeat < 0) startBeat = 0;
    } else {
      const lastGroup = customGroups[customGroups.length - 1];
      startBeat = lastGroup.startBeat + lastGroup.groupLength;
    }

    const newGroup = { startBeat, groupLength: length, color: newGroupColor };
    setCustomGroups((prev) => [...prev, newGroup]);
    setGroupLengthInput("");
  }, [customGroups, groupLengthInput, initialGroupStart, newGroupColor]);

  const handleRemoveGroup = useCallback((indexToRemove) => {
    setCustomGroups((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  }, []);

  const handleClearCustomGroups = useCallback(() => {
    setCustomGroups([]);
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
            isPlaying={isPlaying}
            onPlayPause={togglePlayPause}
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
            onGroupLengthChange={setGroupLengthInput}
            initialGroupStart={initialGroupStart}
            onInitialGroupStartChange={setInitialGroupStart}
            markerColors={MARKER_COLORS}
            currentTime={currentTime}
            bpm={bpm}
            beatTimestamps={beatTimestamps}
          />
        </div>

        <div className="stage-area">
          <div className="stage-placeholder">
            <h2>Choreography Stage</h2>
            <p>This is where dancers will be positioned</p>
          </div>
        </div>
      </div>

      <div className="waveform-container">
        <Waveform
          audioFile={audioFile}
          beatTimestamps={beatTimestamps}
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
