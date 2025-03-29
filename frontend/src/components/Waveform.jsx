import React, { useEffect, useRef, useState, useCallback } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";
import BasicWaveformControls from "./BasicWaveformControls";
import "../styles/Waveform.scss";

const Waveform = ({
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
  isPlaying = false,
  onPlayPause = () => {},
}) => {
  const waveformRef = useRef(null);
  const wavesurfer = useRef(null);
  const regionsPluginRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [scrollTimeout, setScrollTimeout] = useState(null);
  const [hasError, setHasError] = useState(false);

  // Extract song name from the audio file
  const songName = audioFile ? audioFile.name.replace(/\.[^/.]+$/, "") : "";

  const timeRemaining = Math.max(0, duration - currentTime);

  useEffect(() => {
    if (!waveformRef.current) return;

    setHasError(false);

    if (wavesurfer.current) {
      try {
        wavesurfer.current.destroy();
      } catch (err) {
        console.warn("Error during destroy:", err);
      }
      wavesurfer.current = null;
    }

    try {
      regionsPluginRef.current = RegionsPlugin.create({});

      wavesurfer.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: "#4F76A3",
        progressColor: "#86A8E7",
        cursorColor: "#FF5500",
        height: 80,
        normalize: true,
        minPxPerSec: 50,
        autoScroll: true,
        scrollParent: true,
        plugins: [regionsPluginRef.current],
        splitChannels: false,
        barHeight: 3.0,
        barGap: 1,
        barWidth: 2,
        barRadius: 2,
        verticalAlignment: 1.0,
      });

      wavesurfer.current.on("ready", () => {
        console.log("WaveSurfer is ready");
        const audioDuration = wavesurfer.current.getDuration();
        setIsReady(true);
        setDuration(audioDuration);
        setCurrentTime(0);

        setTimeout(() => {
          if (wavesurfer.current) {
            wavesurfer.current.zoom(currentZoom);
            wavesurfer.current.setVolume(volume);
          }
        }, 0);

        onWavesurferInit(wavesurfer.current);
      });

      wavesurfer.current.on("error", (err) => {
        console.error("Wavesurfer error:", err);
        setHasError(true);
      });

      wavesurfer.current.on("timeupdate", (time) => {
        const seconds = Math.floor(time);
        setCurrentTime(seconds);
        onTimeUpdate(seconds);

        if (isPlaying && wavesurfer.current) {
          if (!scrollTimeout) {
            const newScrollTimeout = setTimeout(() => {
              if (wavesurfer.current) {
                ensurePlayheadVisible();
              }
              setScrollTimeout(null);
            }, 100);

            setScrollTimeout(newScrollTimeout);
          }
        }
      });

      wavesurfer.current.on("play", () => {
        if (wavesurfer.current) {
          ensurePlayheadVisible();
        }
      });

      if (audioFile) {
        clearBeatMarkers();
        const objectUrl = URL.createObjectURL(audioFile);
        wavesurfer.current.load(objectUrl);
      }
    } catch (error) {
      console.error("Error initializing WaveSurfer:", error);
      setHasError(true);
    }

    return () => {
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      if (wavesurfer.current) {
        try {
          wavesurfer.current.destroy();
        } catch (err) {
          console.warn("Error during cleanup:", err);
        }
        wavesurfer.current = null;
      }
      if (audioFile) {
        URL.revokeObjectURL(audioFile);
      }
    };
  }, [audioFile, onWavesurferInit]);

  // Apply zoom when zoom level changes
  useEffect(() => {
    if (wavesurfer.current && isReady && !hasError) {
      try {
        wavesurfer.current.zoom(currentZoom);
      } catch (err) {
        console.warn("Error applying zoom:", err);
      }
    }
  }, [currentZoom, isReady, hasError]);

  // Apply volume when it changes
  useEffect(() => {
    if (wavesurfer.current && isReady && !hasError) {
      try {
        wavesurfer.current.setVolume(volume);
      } catch (err) {
        console.warn("Error applying volume:", err);
      }
    }
  }, [volume, isReady, hasError]);

  const ensurePlayheadVisible = useCallback(() => {
    if (!wavesurfer.current || !isReady || hasError) return;

    try {
      const currentTime = wavesurfer.current.getCurrentTime();
      const duration = wavesurfer.current.getDuration();
      if (!duration) return;

      const waveformWidth = waveformRef.current.clientWidth;
      const pixelsPerSecond = currentZoom;
      const visibleSeconds = waveformWidth / pixelsPerSecond;

      const waveformContainer = waveformRef.current.querySelector("wave");
      if (!waveformContainer) return;

      const scrollLeft = waveformContainer.scrollLeft;
      const scrollRight = scrollLeft + waveformWidth;
      const currentTimePosition = currentTime * pixelsPerSecond;

      if (
        currentTimePosition >
        scrollRight - visibleSeconds * 0.2 * pixelsPerSecond
      ) {
        waveformContainer.scrollLeft =
          currentTimePosition - visibleSeconds * 0.3 * pixelsPerSecond;
      } else if (currentTimePosition < scrollLeft) {
        waveformContainer.scrollLeft =
          currentTimePosition - visibleSeconds * 0.1 * pixelsPerSecond;
      }
    } catch (error) {
      console.warn("Error in ensurePlayheadVisible:", error);
    }
  }, [isReady, currentZoom, hasError]);

  const clearBeatMarkers = useCallback(() => {
    if (
      regionsPluginRef.current &&
      regionsPluginRef.current.clearRegions &&
      !hasError
    ) {
      try {
        regionsPluginRef.current.clearRegions();
      } catch (err) {
        console.warn("Error clearing beat markers:", err);
      }
    }
  }, [hasError]);

  const addBeatMarkers = useCallback(() => {
    if (!regionsPluginRef.current?.addRegion || hasError) return;

    try {
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
          if (wavesurfer.current && !hasError) {
            const duration = wavesurfer.current.getDuration();
            if (duration) {
              wavesurfer.current.seekTo(time / duration);
            }
          }
        });
      });
    } catch (error) {
      console.warn("Error adding beat markers:", error);
    }
  }, [
    beatTimestamps,
    groupSize,
    customGroups,
    markerOffset,
    subdivisionFactor,
    clearBeatMarkers,
    hasError,
  ]);

  useEffect(() => {
    if (isReady && beatTimestamps.length > 0 && !hasError) {
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
    hasError,
  ]);

  // Pass time updates to parent component
  useEffect(() => {
    onTimeUpdate(currentTime);
  }, [currentTime, onTimeUpdate]);

  if (hasError) {
    return (
      <div className="waveform-error">
        <p>Error loading audio. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="waveform-component">
      <BasicWaveformControls
        isPlaying={isPlaying}
        onPlayPause={onPlayPause}
        currentTime={currentTime}
        duration={duration}
        timeRemaining={timeRemaining}
        bpm={bpm}
        songName={songName}
      />
      <div ref={waveformRef} className="waveform"></div>
    </div>
  );
};

export default Waveform;
