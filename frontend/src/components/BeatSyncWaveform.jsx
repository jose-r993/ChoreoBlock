import React, { useEffect, useRef, useState, useCallback } from "react";
import WaveSurfer from "wavesurfer.js";
// Import the ES module version of the Regions plugin
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";
import "../styles/BeatSyncWaveform.scss";

// Default marker colors for groups (used when no custom groups exist)
const MARKER_COLORS = ["#FF5500", "#00AAFF", "#22CCAA", "#FFAA00", "#FF00AA"];

const BeatSyncWaveform = ({
  audioFile,
  beatTimestamps = [],
  bpm,
  groupSize = 8, // fallback group size if no custom groups
  height = 128,
  waveColor = "#4F76A3",
  progressColor = "#86A8E7",
  cursorColor = "#FF5500",
}) => {
  const waveformRef = useRef(null);
  const wavesurfer = useRef(null);
  const regionsPluginRef = useRef(null);

  // Custom grouping states
  // initialGroupStart is 1-indexed from the user's perspective
  const [initialGroupStart, setInitialGroupStart] = useState("1");
  // newGroupLength is the length for a new group definition
  const [newGroupLength, setNewGroupLength] = useState("");
  // newGroupColor lets the user pick a color for the new group
  const [newGroupColor, setNewGroupColor] = useState(MARKER_COLORS[0]);
  // custom groups stored as objects: { startBeat (0-indexed), groupLength, color }
  const [customGroups, setCustomGroups] = useState([]);
  // marker offset (nudge groups left/right)
  const [markerOffset, setMarkerOffset] = useState(0);

  // groupDefinitions will be the custom groups if defined; otherwise, empty.
  const [groupDefinitions, setGroupDefinitions] = useState([]);

  // Other states
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(50);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);

  /* 
    1) Create WaveSurfer instance only when audioFile or styling props change.
       (Do not include zoom, offset, or group definitions here)
  */
  useEffect(() => {
    if (!waveformRef.current) return;

    if (wavesurfer.current) {
      try {
        Promise.resolve(wavesurfer.current.destroy()).catch((err) =>
          console.warn("Destroy error:", err)
        );
      } catch (err) {
        console.warn("Error during destroy:", err);
      }
    }

    regionsPluginRef.current = RegionsPlugin.create({});

    wavesurfer.current = WaveSurfer.create({
      container: waveformRef.current,
      waveColor,
      progressColor,
      cursorColor,
      height,
      normalize: true,
      minPxPerSec: 50,
      plugins: [regionsPluginRef.current],
    });

    wavesurfer.current.on("ready", () => {
      console.log("WaveSurfer is ready");
      setIsReady(true);
      wavesurfer.current.zoom(currentZoom);
      wavesurfer.current.setVolume(volume);
    });

    wavesurfer.current.on("play", () => setIsPlaying(true));
    wavesurfer.current.on("pause", () => setIsPlaying(false));
    wavesurfer.current.on("timeupdate", (time) => setCurrentTime(time));

    if (audioFile) {
      const objectUrl = URL.createObjectURL(audioFile);
      wavesurfer.current.load(objectUrl);
    }

    return () => {
      if (wavesurfer.current) {
        Promise.resolve(wavesurfer.current.destroy()).catch((err) =>
          console.warn("Destroy error:", err)
        );
      }
      if (audioFile) {
        URL.revokeObjectURL(audioFile);
      }
    };
  }, [audioFile, waveColor, progressColor, cursorColor, height]);

  /*
    2) Separate effect to update zoom (without re-creating WaveSurfer)
  */
  useEffect(() => {
    if (wavesurfer.current && isReady) {
      wavesurfer.current.zoom(currentZoom);
    }
  }, [currentZoom, isReady]);

  /*
    3) Effect to update volume when changed
  */
  useEffect(() => {
    if (wavesurfer.current && isReady) {
      wavesurfer.current.setVolume(volume);
    }
  }, [volume, isReady]);

  // Update groupDefinitions to be the custom groups if any exist.
  useEffect(() => {
    if (customGroups.length > 0) {
      setGroupDefinitions(customGroups);
    } else {
      setGroupDefinitions([]);
    }
  }, [customGroups]);

  // Clear existing markers (regions)
  const clearBeatMarkers = useCallback(() => {
    if (regionsPluginRef.current && regionsPluginRef.current.clearRegions) {
      regionsPluginRef.current.clearRegions();
    }
  }, []);

  /*
    4) Add beat markers using the Regions plugin.
       For each beat:
         - Compute effectiveIndex = index - markerOffset.
         - If custom group definitions exist, check if effectiveIndex falls in a group.
           • If yes, use that group's color and label.
           • Otherwise, use grey ("#888888").
         - If no custom groups exist, default grouping by groupSize is applied.
         - Markers are locked (drag: false, resize: false) and rendered slim.
  */
  const addBeatMarkers = useCallback(() => {
    if (!regionsPluginRef.current?.addRegion) {
      console.error("Regions plugin addRegion method is not available");
      return;
    }
    clearBeatMarkers();

    beatTimestamps.forEach((time, index) => {
      const effectiveIndex = index - markerOffset;
      let color,
        label = "";
      if (groupDefinitions.length > 0) {
        const group = groupDefinitions.find(
          (g) =>
            effectiveIndex >= g.startBeat &&
            effectiveIndex < g.startBeat + g.groupLength
        );
        if (group) {
          color = group.color;
          label = `${groupDefinitions.indexOf(group) + 1}`;
        } else {
          color = "#888888";
        }
      } else {
        const defaultGroupIndex = Math.floor(effectiveIndex / groupSize);
        color = MARKER_COLORS[defaultGroupIndex % MARKER_COLORS.length];
        label = `${defaultGroupIndex + 1}`;
      }

      const region = regionsPluginRef.current.addRegion({
        start: time,
        end: time + 0.05,
        color: color + "55",
        drag: false,
        resize: false,
      });

      if (label) {
        const labelEl = region.element?.querySelector(
          ".wavesurfer-region-label"
        );
        if (labelEl) {
          labelEl.innerHTML = `<span class="marker-label">${label}</span>`;
        }
      }

      region.on("click", () => {
        const duration = wavesurfer.current.getDuration();
        if (duration) {
          wavesurfer.current.seekTo(time / duration);
        }
      });
    });
  }, [
    beatTimestamps,
    groupSize,
    groupDefinitions,
    markerOffset,
    clearBeatMarkers,
  ]);

  // When ready, add markers
  useEffect(() => {
    if (isReady && beatTimestamps.length > 0) {
      addBeatMarkers();
    }
  }, [isReady, beatTimestamps, groupDefinitions, markerOffset, addBeatMarkers]);

  // Playback controls
  const togglePlay = useCallback(() => {
    wavesurfer.current?.playPause();
  }, []);

  const zoomIn = useCallback(() => {
    setCurrentZoom((z) => z + 10);
  }, []);

  const zoomOut = useCallback(() => {
    setCurrentZoom((z) => Math.max(30, z - 10));
  }, []);

  const handleVolumeChange = useCallback((e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
  }, []);

  // Marker offset controls
  const decreaseOffset = useCallback(() => {
    setMarkerOffset((offset) => offset - 1);
  }, []);

  const increaseOffset = useCallback(() => {
    setMarkerOffset((offset) => offset + 1);
  }, []);

  /*
    5) Custom Grouping Controls:
        - The user sets an initial start beat (1-indexed) and a group length for the first group.
        - Subsequent groups are automatically stacked.
        - Users can remove a specific group.
  */
  const [groupLengthInput, setGroupLengthInput] = useState("");
  const handleAddGroup = useCallback(() => {
    const length = parseInt(groupLengthInput);
    if (isNaN(length) || length <= 0) return;
    let startBeat;
    if (customGroups.length === 0) {
      // Convert initialGroupStart from 1-indexed to 0-indexed
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

  const handleNewGroupColorChange = useCallback((e) => {
    setNewGroupColor(e.target.value);
  }, []);

  // Format time display (MM:SS)
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="beat-sync-waveform">
      <div className="controls">
        <button
          className={`play-button ${isPlaying ? "playing" : ""}`}
          onClick={togglePlay}
        >
          {isPlaying ? "Pause" : "Play"}
        </button>

        <div className="zoom-controls">
          <button onClick={zoomOut}>- Zoom</button>
          <span>{currentZoom}x</span>
          <button onClick={zoomIn}>+ Zoom</button>
        </div>

        <div className="volume-control">
          <label>
            Volume:{" "}
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={handleVolumeChange}
            />
          </label>
        </div>

        <div className="offset-controls">
          <span>Marker Offset: {markerOffset}</span>
          <button onClick={decreaseOffset}>- Offset</button>
          <button onClick={increaseOffset}>+ Offset</button>
        </div>

        <div className="custom-grouping">
          <h4>Custom Grouping</h4>
          <div>
            <label>
              Initial Start Beat:{" "}
              <input
                type="number"
                value={initialGroupStart}
                onChange={(e) => setInitialGroupStart(e.target.value)}
                min="1"
              />
            </label>
          </div>
          <div>
            <label>
              Group Length:{" "}
              <input
                type="number"
                value={groupLengthInput}
                onChange={(e) => setGroupLengthInput(e.target.value)}
                min="1"
              />
            </label>
            <label>
              Color:{" "}
              <select
                value={newGroupColor}
                onChange={handleNewGroupColorChange}
              >
                {MARKER_COLORS.map((col, idx) => (
                  <option key={idx} value={col}>
                    {col}
                  </option>
                ))}
              </select>
              <span className="color-preview"></span>
            </label>
            <button onClick={handleAddGroup}>Add Group</button>
            <button onClick={handleClearCustomGroups}>Clear Groups</button>
          </div>
          {customGroups.length > 0 && (
            <ul className="custom-group-list">
              {customGroups.map((group, idx) => (
                <li key={idx}>
                  <span className="group-color-box"></span>
                  Group {idx + 1}: starts at beat {group.startBeat + 1}, length{" "}
                  {group.groupLength}, color {group.color}{" "}
                  <button onClick={() => handleRemoveGroup(idx)}>Remove</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="time-display">{formatTime(currentTime)}</div>
        {bpm && <div className="bpm-display">BPM: {bpm}</div>}
      </div>

      <div className="waveform-container">
        <div ref={waveformRef} className="waveform"></div>
      </div>
    </div>
  );
};

export default BeatSyncWaveform;
