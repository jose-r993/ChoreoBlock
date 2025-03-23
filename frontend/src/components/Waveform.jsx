import React, { useEffect, useRef, useState, useCallback } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";
import "../styles/Waveform.scss";

const BeatSyncWaveform = ({
  audioFile,
  beatTimestamps = [],
  bpm,
  groupSize = 8,
  customGroups = [],
  markerOffset = 0,
  subdivisionFactor = 1,
  volume = 0.3,
  currentZoom = 100,
  onTimeUpdate = () => {},
  onWavesurferInit = () => {},
}) => {
  const waveformRef = useRef(null);
  const wavesurfer = useRef(null);
  const regionsPluginRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

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
      waveColor: "#4F76A3",
      progressColor: "#86A8E7",
      cursorColor: "#FF5500",
      height: 128,
      normalize: true,
      minPxPerSec: 50,
      plugins: [regionsPluginRef.current],
    });

    wavesurfer.current.on("ready", () => {
      console.log("WaveSurfer is ready");
      setIsReady(true);
      wavesurfer.current.zoom(currentZoom);
      wavesurfer.current.setVolume(volume);

      onWavesurferInit(wavesurfer.current);
    });

    wavesurfer.current.on("timeupdate", (time) => {
      onTimeUpdate(time);
    });

    if (audioFile) {
      clearBeatMarkers();
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
  }, [audioFile, onTimeUpdate, onWavesurferInit]);

  useEffect(() => {
    if (wavesurfer.current && isReady) {
      wavesurfer.current.zoom(currentZoom);
    }
  }, [currentZoom, isReady]);

  useEffect(() => {
    if (wavesurfer.current && isReady) {
      wavesurfer.current.setVolume(volume);
    }
  }, [volume, isReady]);

  const clearBeatMarkers = useCallback(() => {
    if (regionsPluginRef.current && regionsPluginRef.current.clearRegions) {
      regionsPluginRef.current.clearRegions();
    }
  }, []);

  const addBeatMarkers = useCallback(() => {
    if (!regionsPluginRef.current?.addRegion) {
      console.error("Regions plugin addRegion method is not available");
      return;
    }

    clearBeatMarkers();

    const getMarkerConfig = (index) => {
      const MARKER_COLORS = [
        "#FF5500",
        "#00AAFF",
        "#22CCAA",
        "#FFAA00",
        "#FF00AA",
      ];
      const effectiveIndex = index - markerOffset;

      if (customGroups.length > 0) {
        const group = customGroups.find(
          (g) =>
            effectiveIndex >= g.startBeat &&
            effectiveIndex < g.startBeat + g.groupLength
        );

        if (group) {
          return {
            color: group.color,
            label: `${customGroups.indexOf(group) + 1}`,
          };
        } else {
          return {
            color: "#888888",
            label: "",
          };
        }
      } else {
        const defaultGroupIndex = Math.floor(effectiveIndex / groupSize);
        return {
          color: MARKER_COLORS[defaultGroupIndex % MARKER_COLORS.length],
          label: `${defaultGroupIndex + 1}`,
        };
      }
    };

    beatTimestamps.forEach((time, index) => {
      if (index % subdivisionFactor !== 0) return;

      const { color, label } = getMarkerConfig(index);
      const region = regionsPluginRef.current.addRegion({
        start: time,
        end: time + 0.05,
        color: color + "55",
        drag: false,
        resize: false,
      });

      if (label && region.element) {
        const labelEl = region.element.querySelector(
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
    customGroups,
    markerOffset,
    subdivisionFactor,
    clearBeatMarkers,
  ]);

  useEffect(() => {
    if (isReady && beatTimestamps.length > 0) {
      addBeatMarkers();
    }
  }, [
    isReady,
    beatTimestamps,
    groupSize,
    customGroups,
    markerOffset,
    subdivisionFactor,
    addBeatMarkers,
  ]);

  return <div ref={waveformRef} className="waveform"></div>;
};

export default BeatSyncWaveform;
