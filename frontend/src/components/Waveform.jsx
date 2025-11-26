import React, {
  useMemo,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { useWavesurfer } from "@wavesurfer/react";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";
import TimelinePlugin from "wavesurfer.js/dist/plugins/timeline.js";
import ZoomPlugin from "wavesurfer.js/dist/plugins/zoom.js";
import WaveformControls from "./WaveformControls";
import "../styles/Waveform.scss";

// Waveform component for displaying audio waveform with beat markers, custom groups, and Formation regions with embedded transition
const Waveform = ({
  onVolumeChange,
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
  onUpdateGroup = () => {},
  currentTime = 0,
  activeGroupIndex = null,
  onAddGroup = () => {},
  onSelectGroup = () => {},
}) => {
  const containerRef = useRef(null);
  const formationsContainerRef = useRef(null);
  const formationsScrollWrapperRef = useRef(null);
  const [duration, setDuration] = useState(0);
  const songName = audioFile ? audioFile.name.replace(/\.[^/.]+$/, "") : "";
  const regionsPluginRef = useRef(null);
  const [zoom, setZoom] = useState(currentZoom);
  const [isDragging, setIsDragging] = useState(false);
  const [dragInfo, setDragInfo] = useState(null);
  const [snapMode, setSnapMode] = useState("beats");
  const [hoverBeat, setHoverBeat] = useState(null);
  const [waveformScrollWidth, setWaveformScrollWidth] = useState(0);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 });
  const [scrollMultiplier, setScrollMultiplier] = useState(50);
  const baseZoomRef = useRef(null);
  const baseMultiplierRef = useRef(50);
  const [addButtonPosition, setAddButtonPosition] = useState(0);

  const [layerVisibility, setLayerVisibility] = useState({
    beatMarkers: true,
    formationBoundaries: true,
    transitions: true,
    labels: true,
  });

  const timeRemaining = Math.max(0, duration - currentTime);

  const [audioUrl, setAudioUrl] = useState(null);
  useEffect(() => {
    if (audioFile) {
      const url = URL.createObjectURL(audioFile);
      setAudioUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [audioFile]);

  const { wavesurfer, isReady } = useWavesurfer({
    container: containerRef,
    url: audioUrl,
    waveColor: "#4F76A3",
    progressColor: "#86A8E7",
    cursorColor: "#FF5500",
    height: 60,
    normalize: true,
    minPxPerSec: 50,
    autoScroll: true,
    scrollParent: true,
    splitChannels: false,
    barHeight: 3.0,
    dragToSeek: true,
    barGap: 2,
    barWidth: 5,
    barRadius: 2,
    verticalAlignment: 1.0,
    plugins: useMemo(
      () => [
        (regionsPluginRef.current = RegionsPlugin.create({
          height: 1,
        })),
        TimelinePlugin.create({
          height: 20,
          primaryLabelInterval: 2,
          secondaryLabelOpacity: 0,
          insertPosition: "beforebegin",
          style: {
            fontSize: "14px",
            color: "#f5f5f580",
          },
        }),
        ZoomPlugin.create({
          scale: 0.2,
        }),
      ],
      []
    ),
  });

  useEffect(() => {
    if (wavesurfer && isReady) {
      wavesurfer.setVolume(volume);
      const audioDuration = wavesurfer.getDuration();
      setDuration(audioDuration);
      onWavesurferInit(wavesurfer);

      if (baseZoomRef.current === null) {
        baseZoomRef.current = wavesurfer.options.minPxPerSec;
      }
    }
  }, [wavesurfer, isReady, volume, onWavesurferInit]);

  useEffect(() => {
    if (wavesurfer && isReady && zoom !== currentZoom) {
      if (wavesurfer.options.minPxPerSec !== zoom && zoom > 0) {
        wavesurfer.zoom(zoom);
      }
    }
  }, [wavesurfer, isReady, zoom, currentZoom]);

  useEffect(() => {
    if (wavesurfer && isReady) {
      let rafIdUpdate = null;
      let waveWrapperElement = null;

      const updateWidthAndSyncPosition = () => {
        if (rafIdUpdate) cancelAnimationFrame(rafIdUpdate);
        rafIdUpdate = requestAnimationFrame(() => {
          if (!waveWrapperElement)
            waveWrapperElement = wavesurfer?.getWrapper();
          if (!waveWrapperElement) {
            setWaveformScrollWidth(0);
            if (formationsContainerRef.current)
              formationsContainerRef.current.style.width = `0px`;
            rafIdUpdate = null;
            return;
          }
          const currentWidth = waveWrapperElement.scrollWidth;
          const scrollLeft = waveWrapperElement.scrollLeft;
          setWaveformScrollWidth(currentWidth);
          if (formationsContainerRef.current) {
            formationsContainerRef.current.style.width = `${currentWidth}px`;

            formationsContainerRef.current.style.transition =
              "transform 100ms ease-out";

            setTimeout(() => {
              if (formationsContainerRef.current) {
                formationsContainerRef.current.style.transition = "";
              }
            }, 150);
          }
          rafIdUpdate = null;
        });
      };

      const handleZoom = () => {
        if (formationsContainerRef.current) {
          formationsContainerRef.current.style.transition =
            "transform 100ms ease-out";
        }

        const currentPxPerSec = wavesurfer.options.minPxPerSec;
        if (currentPxPerSec && baseZoomRef.current) {
          const zoomRatio = currentPxPerSec / baseZoomRef.current;
          const newMultiplier = baseMultiplierRef.current * zoomRatio;
          setScrollMultiplier(newMultiplier);
        }

        updateWidthAndSyncPosition();

        setTimeout(() => {
          if (formationsContainerRef.current) {
            formationsContainerRef.current.style.transition = "";
          }
        }, 150);
      };

      const handleReady = () => {
        waveWrapperElement = wavesurfer?.getWrapper();
        updateWidthAndSyncPosition();

        if (baseZoomRef.current === null && wavesurfer.options.minPxPerSec) {
          baseZoomRef.current = wavesurfer.options.minPxPerSec;
        }
      };

      const handleRedraw = () => updateWidthAndSyncPosition();

      wavesurfer.on("ready", handleReady);
      wavesurfer.on("redraw", handleRedraw);
      wavesurfer.on("zoom", handleZoom);

      if (wavesurfer.isReady) {
        waveWrapperElement = wavesurfer?.getWrapper();
        updateWidthAndSyncPosition();

        if (baseZoomRef.current === null && wavesurfer.options.minPxPerSec) {
          baseZoomRef.current = wavesurfer.options.minPxPerSec;
        }
      }

      return () => {
        if (rafIdUpdate) cancelAnimationFrame(rafIdUpdate);
        if (wavesurfer) {
          try {
            wavesurfer.un("ready", handleReady);
            wavesurfer.un("redraw", handleRedraw);
            wavesurfer.un("zoom", handleZoom);
          } catch (error) {}
        }
      };
    }
  }, [wavesurfer, setZoom, setVisibleRange, isReady, scrollMultiplier]);

  useEffect(() => {
    if (wavesurfer && typeof currentTime === "number") {
      const updateTime = (time) => {
        onTimeUpdate(time);
      };
      wavesurfer.on("timeupdate", updateTime);
      return () => {
        if (wavesurfer) {
          wavesurfer.un("timeupdate", updateTime);
        }
      };
    }
  }, [wavesurfer, onTimeUpdate]);

  const clearAllRegions = useCallback(() => {
    if (regionsPluginRef.current) {
      try {
        regionsPluginRef.current.clearRegions();
      } catch (err) {}
    }
  }, [regionsPluginRef]);

  const findClosestBeatTime = useCallback(
    (time) => {
      if (!beatTimestamps || beatTimestamps.length === 0) return 0;
      let closestTime = beatTimestamps[0];
      let minDifference = Math.abs(beatTimestamps[0] - time);
      for (let i = 1; i < beatTimestamps.length; i++) {
        const difference = Math.abs(beatTimestamps[i] - time);
        if (difference < minDifference) {
          minDifference = difference;
          closestTime = beatTimestamps[i];
        }
      }
      return closestTime;
    },
    [beatTimestamps]
  );

  const timeToPosition = useCallback(
    (time, totalWidth) => {
      if (!totalWidth || !duration) {
        return 0;
      }
      return (time / duration) * totalWidth;
    },
    [duration]
  );

  const positionToTime = useCallback(
    (px, totalWidth) => {
      if (!totalWidth || duration === 0) {
        return 0;
      }
      return (px / totalWidth) * duration;
    },
    [duration]
  );

  const drawAllRegions = useCallback(() => {
    if (!regionsPluginRef.current || !wavesurfer || !isReady || !duration)
      return;
    try {
      clearAllRegions();

      if (layerVisibility.beatMarkers && beatTimestamps) {
        beatTimestamps.forEach((time, index) => {
          if (index % subdivisionFactor !== 0) return;

          // Check if this beat falls within any custom group
          let beatInfo = null;
          for (let groupIndex = 0; groupIndex < customGroups.length; groupIndex++) {
            const group = customGroups[groupIndex];
            if (time >= group.startTime && time < group.endTime) {
              const isTransition =
                time >= group.transitionStartTime &&
                time < group.transitionEndTime;
              beatInfo = {
                groupIndex,
                color: group.color,
                isTransition,
              };
              break;
            }
          }

          let color = "#888888";
          let label = "";
          let isTransition = false;

          if (beatInfo) {
            color = beatInfo.color;
            label = `${beatInfo.groupIndex + 1}`;
            isTransition = beatInfo.isTransition;
          } else {
            const effectiveIndex = index - markerOffset;
            if (effectiveIndex >= 0) {
              const defaultGroupIndex = Math.floor(effectiveIndex / groupSize);
              const MARKER_COLORS = [
                "#FF5500",
                "#00AAFF",
                "#22CCAA",
                "#FFAA00",
                "#FF00AA",
              ];
              color = MARKER_COLORS[defaultGroupIndex % MARKER_COLORS.length];
              label = `${defaultGroupIndex + 1}`;
            }
          }
          const region = regionsPluginRef.current.addRegion({
            start: time - 0.04,
            end: time + 0.04,
            color: color + (isTransition ? "AA" : "55"),
            drag: false,
            resize: false,
            id: `beat-${index}`,
            data: { type: "beat", beatIndex: index, isTransition },
          });
          if (label && region && region.element && layerVisibility.labels) {
            const labelEl = region.element?.querySelector(
              ".wavesurfer-region-label"
            );
            if (labelEl)
              labelEl.innerHTML = `<span class="marker-label">${label}</span>`;
            if (isTransition) region.element.classList.add("transition-beat");
          }
          if (region) {
            region.on("click", () => {
              if (wavesurfer && duration > 0)
                wavesurfer.seekTo(time / duration);
            });
          }
        });
      }
    } catch (error) {}
  }, [
    regionsPluginRef,
    wavesurfer,
    isReady,
    clearAllRegions,
    beatTimestamps,
    customGroups,
    layerVisibility,
    subdivisionFactor,
    markerOffset,
    groupSize,
    duration,
  ]);

  useEffect(() => {
    if (isReady && beatTimestamps?.length > 0 && wavesurfer) {
      drawAllRegions();
    }
  }, [
    isReady,
    beatTimestamps,
    customGroups,
    drawAllRegions,
    wavesurfer,
    layerVisibility,
  ]);

  useEffect(() => {
    if (!wavesurfer || !isReady || !regionsPluginRef.current) return;
    const handleRegionUpdated = (region) => {
      if (!region.data) return;
      const { type, groupIndex } = region.data;
      if (type !== "formation" && type !== "transition") return;
      const group = customGroups[groupIndex];
      if (!group) return;

      let newStartTime = region.start;
      let newEndTime = region.end;

      // Apply beat snapping if enabled
      if (snapMode === "beats") {
        newStartTime = findClosestBeatTime(newStartTime);
        newEndTime = findClosestBeatTime(newEndTime);

        // Ensure minimum duration
        const minDuration = beatTimestamps && beatTimestamps.length > 1
          ? (beatTimestamps[1] - beatTimestamps[0]) * 2
          : 0.2;
        if (newEndTime - newStartTime < minDuration) {
          newEndTime = newStartTime + minDuration;
        }
      }

      if (type === "formation") {
        // Calculate new transition times based on relative position
        let newTransitionStartTime;
        let newTransitionEndTime;

        if (group.transitionStartTime !== undefined && group.transitionEndTime !== undefined) {
          const oldDuration = group.endTime - group.startTime;
          const oldRelativeTransitionStart = oldDuration > 0
            ? (group.transitionStartTime - group.startTime) / oldDuration
            : 0.75;
          const oldTransitionDuration = group.transitionEndTime - group.transitionStartTime;

          const newDuration = newEndTime - newStartTime;
          newTransitionStartTime = newStartTime + (newDuration * oldRelativeTransitionStart);
          newTransitionEndTime = Math.min(newTransitionStartTime + oldTransitionDuration, newEndTime);

          // Ensure transition doesn't exceed formation bounds
          newTransitionStartTime = Math.max(newStartTime, Math.min(newTransitionStartTime, newEndTime - 0.1));
          newTransitionEndTime = Math.max(newTransitionStartTime + 0.1, Math.min(newTransitionEndTime, newEndTime));
        } else {
          // Default: transition in last 2 seconds
          const defaultTransitionDuration = Math.min(2, newEndTime - newStartTime);
          newTransitionStartTime = newEndTime - defaultTransitionDuration;
          newTransitionEndTime = newEndTime;
        }

        const updatedGroup = {
          ...group,
          startTime: newStartTime,
          endTime: newEndTime,
          transitionStartTime: newTransitionStartTime,
          transitionEndTime: newTransitionEndTime,
        };
        onUpdateGroup(groupIndex, updatedGroup);
      } else if (type === "transition") {
        let newTransitionStartTime = newStartTime;
        let newTransitionEndTime = newEndTime;

        // Apply beat snapping if enabled
        if (snapMode === "beats") {
          newTransitionStartTime = findClosestBeatTime(newTransitionStartTime);
          newTransitionEndTime = findClosestBeatTime(newTransitionEndTime);
        }

        // Constrain transition within formation bounds
        newTransitionStartTime = Math.max(group.startTime, newTransitionStartTime);
        newTransitionEndTime = Math.min(group.endTime, newTransitionEndTime);

        // Ensure minimum transition duration
        const minTransitionDuration = 0.1;
        if (newTransitionEndTime - newTransitionStartTime < minTransitionDuration) {
          newTransitionEndTime = newTransitionStartTime + minTransitionDuration;
        }

        const updatedGroup = {
          ...group,
          transitionStartTime: newTransitionStartTime,
          transitionEndTime: newTransitionEndTime,
        };
        onUpdateGroup(groupIndex, updatedGroup);
      }
    };

    const handleRegionClick = (region) => {
      if (!region.data) return;
      const { type, groupIndex } = region.data;
      if (type === "formation" || type === "transition")
        onSelectGroup(groupIndex);
    };

    regionsPluginRef.current.on("region-updated", handleRegionUpdated);
    regionsPluginRef.current.on("region-clicked", handleRegionClick);

    return () => {
      if (regionsPluginRef.current) {
        regionsPluginRef.current.un("region-updated", handleRegionUpdated);
        regionsPluginRef.current.un("region-clicked", handleRegionClick);
      }
    };
  }, [
    wavesurfer,
    isReady,
    regionsPluginRef,
    customGroups,
    onUpdateGroup,
    onSelectGroup,
    snapMode,
    findClosestBeatTime,
    beatTimestamps,
  ]);

  useEffect(() => {
    if (!waveformScrollWidth || !isReady) return;

    let position = 30;

    if (customGroups && customGroups.length > 0) {
      const lastGroup = customGroups[customGroups.length - 1];
      if (lastGroup) {
        const lastEndTime = lastGroup.endTime;
        position = timeToPosition(lastEndTime, waveformScrollWidth);

        position += 10;
      }
    }

    setAddButtonPosition(position);
  }, [
    customGroups,
    waveformScrollWidth,
    isReady,
    timeToPosition,
    duration,
  ]);

  const handleAddFormation = useCallback(() => {
    let startTime = 0;

    // Find the last endTime of all groups
    if (customGroups.length > 0) {
      customGroups.forEach((group) => {
        const endTime = group.endTime;
        if (endTime > startTime) startTime = endTime;
      });
    }

    // If we're past the last group, start at current playback position
    if (wavesurfer) {
      const currentTimeVal = wavesurfer.getCurrentTime();
      if (currentTimeVal > startTime) {
        startTime = findClosestBeatTime(currentTimeVal);
      }
    }

    // Default duration: 8 seconds
    let duration = 8;

    // Make sure we don't exceed the audio duration
    if (wavesurfer) {
      const audioDuration = wavesurfer.getDuration();
      if (startTime + duration > audioDuration) {
        duration = Math.max(1, audioDuration - startTime - 0.5);
      }
    }

    const endTime = startTime + duration;

    // Default transition: last 2 seconds
    const transitionDuration = Math.min(2, duration);
    const transitionStartTime = endTime - transitionDuration;
    const transitionEndTime = endTime;

    const MARKER_COLORS = [
      "#FF5500",
      "#00AAFF",
      "#22CCAA",
      "#FFAA00",
      "#FF00AA",
    ];

    const newGroup = {
      startTime,
      endTime,
      color: MARKER_COLORS[customGroups.length % MARKER_COLORS.length],
      transitionStartTime,
      transitionEndTime,
      groupName: `Formation ${customGroups.length + 1}`,
    };
    onAddGroup(newGroup);
  }, [
    customGroups,
    onAddGroup,
    wavesurfer,
    findClosestBeatTime,
  ]);

  const handleDragStart = useCallback(
    (e, groupIndex, edge) => {
      e.stopPropagation();
      if (
        !formationsContainerRef.current ||
        !wavesurfer ||
        !customGroups[groupIndex]
      )
        return;
      const waveWrapper = wavesurfer.getWrapper();
      if (!waveWrapper) return;
      const formationsDiv = formationsContainerRef.current;
      const containerRect = formationsDiv.getBoundingClientRect();
      const currentScrollLeft = waveWrapper.scrollLeft;
      const x = e.clientX - containerRect.left + currentScrollLeft;
      setIsDragging(true);
      setDragInfo({
        groupIndex,
        edge,
        startX: x,
        startTime: customGroups[groupIndex].startTime,
        endTime: customGroups[groupIndex].endTime,
        transitionStartTime: customGroups[groupIndex].transitionStartTime,
        transitionEndTime: customGroups[groupIndex].transitionEndTime,
      });
    },
    [customGroups, wavesurfer]
  );

  const handleFormationClick = useCallback(
    (e, groupIndex) => {
      e.stopPropagation();
      onSelectGroup(groupIndex);
      if (wavesurfer && customGroups[groupIndex]) {
        const time = customGroups[groupIndex].startTime;
        if (duration > 0) wavesurfer.seekTo(time / duration);
      }
    },
    [wavesurfer, customGroups, duration, onSelectGroup]
  );

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (
        !isDragging ||
        !dragInfo ||
        !wavesurfer ||
        !formationsContainerRef.current
      )
        return;
      const waveWrapper = wavesurfer.getWrapper();
      const totalWidth = waveWrapper?.scrollWidth;
      if (!totalWidth) return;
      const formationsDiv = formationsContainerRef.current;
      const containerRect = formationsDiv.getBoundingClientRect();
      const currentScrollLeft = waveWrapper.scrollLeft;
      const x = e.clientX - containerRect.left + currentScrollLeft;

      // Convert pixel position to time
      let currentTime = positionToTime(x, totalWidth);
      let startTimeDrag = positionToTime(dragInfo.startX, totalWidth);

      // Apply beat snapping if enabled
      if (snapMode === "beats") {
        currentTime = findClosestBeatTime(currentTime);
        startTimeDrag = findClosestBeatTime(startTimeDrag);
      }

      const deltaTime = currentTime - startTimeDrag;

      const group = customGroups[dragInfo.groupIndex];
      if (!group) return;

      let newStartTime = group.startTime;
      let newEndTime = group.endTime;
      let newTransitionStartTime = group.transitionStartTime;
      let newTransitionEndTime = group.transitionEndTime;

      const audioDuration = wavesurfer.getDuration();
      const minDuration = 0.5; // Minimum formation duration

      if (dragInfo.edge === "start") {
        newStartTime = Math.max(0, dragInfo.startTime + deltaTime);
        const originalEndTime = dragInfo.endTime;

        // Ensure minimum duration
        if (originalEndTime - newStartTime < minDuration) {
          newStartTime = originalEndTime - minDuration;
        }
        newEndTime = originalEndTime;

        // Adjust transition to maintain relative position
        const originalDuration = dragInfo.endTime - dragInfo.startTime;
        const oldTransitionStartOffset = dragInfo.transitionStartTime - dragInfo.startTime;
        const transitionDuration = dragInfo.transitionEndTime - dragInfo.transitionStartTime;

        newTransitionStartTime = newStartTime + oldTransitionStartOffset;
        newTransitionEndTime = newTransitionStartTime + transitionDuration;

        // Constrain transition within formation bounds
        newTransitionStartTime = Math.max(newStartTime, Math.min(newTransitionStartTime, newEndTime - 0.1));
        newTransitionEndTime = Math.min(newEndTime, newTransitionEndTime);

      } else if (dragInfo.edge === "end") {
        newStartTime = dragInfo.startTime;
        newEndTime = Math.min(audioDuration, dragInfo.endTime + deltaTime);

        // Ensure minimum duration
        if (newEndTime - newStartTime < minDuration) {
          newEndTime = newStartTime + minDuration;
        }

        // Adjust transition to maintain relative position
        const newDuration = newEndTime - newStartTime;
        const originalDuration = dragInfo.endTime - dragInfo.startTime;

        if (originalDuration > 0) {
          const transitionRelativeStart = (dragInfo.transitionStartTime - dragInfo.startTime) / originalDuration;
          const transitionRelativeDuration = (dragInfo.transitionEndTime - dragInfo.transitionStartTime) / originalDuration;

          newTransitionStartTime = newStartTime + (newDuration * transitionRelativeStart);
          newTransitionEndTime = newTransitionStartTime + (newDuration * transitionRelativeDuration);
        } else {
          newTransitionStartTime = newEndTime - 2;
          newTransitionEndTime = newEndTime;
        }

        // Constrain transition within formation bounds
        newTransitionStartTime = Math.max(newStartTime, Math.min(newTransitionStartTime, newEndTime - 0.1));
        newTransitionEndTime = Math.min(newEndTime, newTransitionEndTime);

      } else if (dragInfo.edge === "transition-start") {
        newStartTime = dragInfo.startTime;
        newEndTime = dragInfo.endTime;

        newTransitionStartTime = Math.max(
          newStartTime,
          dragInfo.transitionStartTime + deltaTime
        );
        newTransitionEndTime = dragInfo.transitionEndTime;

        // Ensure transition doesn't go past its end
        if (newTransitionStartTime >= newTransitionEndTime - 0.1) {
          newTransitionStartTime = newTransitionEndTime - 0.1;
        }

      } else if (dragInfo.edge === "transition-end") {
        newStartTime = dragInfo.startTime;
        newEndTime = dragInfo.endTime;
        newTransitionStartTime = dragInfo.transitionStartTime;

        newTransitionEndTime = Math.min(
          newEndTime,
          dragInfo.transitionEndTime + deltaTime
        );

        // Ensure minimum transition duration
        if (newTransitionEndTime - newTransitionStartTime < 0.1) {
          newTransitionEndTime = newTransitionStartTime + 0.1;
        }
      }

      // Check for overlaps with other groups
      let willOverlap = false;
      customGroups.forEach((otherGroup, otherIndex) => {
        if (otherIndex === dragInfo.groupIndex) return;
        const otherStart = otherGroup.startTime;
        const otherEnd = otherGroup.endTime;
        if (newStartTime < otherEnd && otherStart < newEndTime) {
          willOverlap = true;
        }
      });

      if (!willOverlap) {
        const updatedGroup = {
          ...group,
          startTime: newStartTime,
          endTime: newEndTime,
          transitionStartTime: newTransitionStartTime,
          transitionEndTime: newTransitionEndTime,
        };
        requestAnimationFrame(() => {
          onUpdateGroup(dragInfo.groupIndex, updatedGroup);
        });
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        setDragInfo(null);
      }
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    isDragging,
    dragInfo,
    customGroups,
    onUpdateGroup,
    snapMode,
    positionToTime,
    wavesurfer,
    findClosestBeatTime,
    duration,
  ]);

  const renderBeatTooltip = useCallback(() => {
    if (!hoverBeat) return null;
    return (
      <div className="beat-tooltip">
        {hoverBeat.start.toFixed(2)}s - {hoverBeat.end.toFixed(2)}s
      </div>
    );
  }, [hoverBeat]);

  const toggleLayerVisibility = useCallback((layer) => {
    setLayerVisibility((prev) => ({ ...prev, [layer]: !prev[layer] }));
  }, []);

  useEffect(() => {
    if (!wavesurfer || !isReady) return;

    let rafIdScroll = null;

    const handleWavesurferScroll = (scrollLeft) => {
      if (rafIdScroll) {
        cancelAnimationFrame(rafIdScroll);
      }

      rafIdScroll = requestAnimationFrame(() => {
        const adjustedScrollLeft = scrollLeft * scrollMultiplier;

        if (formationsContainerRef.current) {
          formationsContainerRef.current.style.transition = "";
          formationsContainerRef.current.style.transform = `translateX(-${adjustedScrollLeft}px)`;
        }

        rafIdScroll = null;
      });
    };

    wavesurfer.on("scroll", handleWavesurferScroll);

    const initialSync = () => {
      if (wavesurfer && wavesurfer.isReady && formationsContainerRef.current) {
        try {
          const initialScroll = wavesurfer.getScroll();
          const adjustedInitialScroll = initialScroll * scrollMultiplier;
          formationsContainerRef.current.style.transform = `translateX(-${adjustedInitialScroll}px)`;
        } catch (e) {}
      }
    };

    if (wavesurfer.isReady) {
      initialSync();
    } else {
      wavesurfer.once("ready", initialSync);
    }

    return () => {
      if (rafIdScroll) {
        cancelAnimationFrame(rafIdScroll);
      }
      if (wavesurfer) {
        try {
          wavesurfer.un("scroll", handleWavesurferScroll);
          wavesurfer.un("ready", initialSync);
        } catch (e) {}
      }
    };
  }, [wavesurfer, isReady, scrollMultiplier, setVisibleRange]);

  const renderFormations = useCallback(() => {
    if (
      !wavesurfer ||
      !isReady ||
      !formationsContainerRef.current ||
      waveformScrollWidth === 0 ||
      !beatTimestamps ||
      beatTimestamps.length === 0 ||
      !duration
    ) {
      return null;
    }
    if (!Array.isArray(customGroups) || customGroups.length === 0) {
      return null;
    }

    return customGroups.map((group, originalIndex) => {
      const startPosition = timeToPosition(
        group.startTime,
        waveformScrollWidth
      );
      const endPosition = timeToPosition(
        group.endTime,
        waveformScrollWidth
      );
      const width = Math.max(endPosition - startPosition, 2);

      if (isNaN(startPosition) || isNaN(width)) return null;

      const transitionStartPosition = timeToPosition(
        group.transitionStartTime,
        waveformScrollWidth
      );
      const transitionEndPosition = timeToPosition(
        group.transitionEndTime,
        waveformScrollWidth
      );
      const transitionWidth = Math.max(
        transitionEndPosition - transitionStartPosition,
        2
      );

      return (
        <div
          key={`formation-${originalIndex}-${group.startTime}`}
          className={`formation-group ${
            activeGroupIndex === originalIndex ? "active" : ""
          }`}
          style={{
            position: "absolute",
            left: `${startPosition}px`,
            width: `${width}px`,
            backgroundColor: `${group.color}25`,
            borderColor: group.color,
            outline: `${group.color} solid 0px`,
            opacity: layerVisibility.formationBoundaries ? 1 : 0.3,
          }}
          onClick={(e) => handleFormationClick(e, originalIndex)}
        >
          <div
            className="formation-content"
            style={{ borderBottom: `1px solid ${group.color}40` }}
          >
            <span
              className="formation-name"
              style={{
                display: layerVisibility.labels ? "block" : "none",
              }}
            >
              {group.groupName || `Formation ${originalIndex + 1}`}
            </span>
            <div
              className="handle handle-start"
              onMouseDown={(e) => handleDragStart(e, originalIndex, "start")}
            ></div>
            <div
              className="handle handle-end"
              onMouseDown={(e) => handleDragStart(e, originalIndex, "end")}
            ></div>
          </div>
          <div
            className="formation-transition"
            style={{ display: layerVisibility.transitions ? "block" : "none" }}
          >
            <div
              className="transition-indicator"
              style={{
                position: "absolute",
                left: `${transitionStartPosition - startPosition}px`,
                width: `${transitionWidth - 5}px`,
                maxWidth: "100%",
                backgroundColor: group.color,
                padding: "0 2px",
              }}
              onMouseEnter={() =>
                setHoverBeat({
                  start: group.transitionStartTime,
                  end: group.transitionEndTime,
                  groupIndex: originalIndex,
                })
              }
              onMouseLeave={() => setHoverBeat(null)}
            >
              <div
                className="transition-content"
                style={{ display: layerVisibility.labels ? "block" : "none" }}
              >
                <span>Tr</span>
                <div
                  className="handle-transition-start"
                  onMouseDown={(e) =>
                    handleDragStart(e, originalIndex, "transition-start")
                  }
                  title={`Time ${group.transitionStartTime.toFixed(2)}s`}
                ></div>
                <div
                  className="handle-transition-end"
                  onMouseDown={(e) =>
                    handleDragStart(e, originalIndex, "transition-end")
                  }
                  title={`Time ${group.transitionEndTime.toFixed(2)}s`}
                ></div>
              </div>
            </div>
          </div>

          {hoverBeat &&
            hoverBeat.groupIndex === originalIndex &&
            renderBeatTooltip()}
        </div>
      );
    });
  }, [
    wavesurfer,
    isReady,
    waveformScrollWidth,
    customGroups,
    beatTimestamps,
    duration,
    activeGroupIndex,
    layerVisibility,
    timeToPosition,
    handleFormationClick,
    handleDragStart,
    setHoverBeat,
    hoverBeat,
    renderBeatTooltip,
  ]);

  return (
    <div className="waveform-component">
      <WaveformControls
        isPlaying={isPlaying}
        onPlayPause={onPlayPause}
        currentTime={currentTime}
        timeRemaining={timeRemaining}
        bpm={bpm}
        songName={songName}
        volume={volume}
        onVolumeChange={onVolumeChange}
      />
      <div className="formations-regions-header">
        <div className="snap-options">
          <label className="snap-radio">
            <input
              type="radio"
              name="snapMode"
              value="beats"
              checked={snapMode === "beats"}
              onChange={() => setSnapMode("beats")}
            />{" "}
            Snap to Beats
          </label>
          <label className="snap-radio">
            <input
              type="radio"
              name="snapMode"
              value="free"
              checked={snapMode === "free"}
              onChange={() => setSnapMode("free")}
            />{" "}
            Free Adjustment
          </label>
        </div>
        <div className="layer-controls">
          <button
            className={`layer-toggle ${
              layerVisibility.beatMarkers ? "active" : ""
            }`}
            onClick={() => toggleLayerVisibility("beatMarkers")}
            title="Toggle Beat Markers"
          >
            <span>Beats</span>
          </button>
          <button
            className={`layer-toggle ${
              layerVisibility.formationBoundaries ? "active" : ""
            }`}
            onClick={() => toggleLayerVisibility("formationBoundaries")}
            title="Toggle Formation Boundaries"
          >
            <span>Formations</span>
          </button>
          <button
            className={`layer-toggle ${
              layerVisibility.transitions ? "active" : ""
            }`}
            onClick={() => toggleLayerVisibility("transitions")}
            title="Toggle Transitions"
          >
            <span>Transitions</span>
          </button>
          <button
            className={`layer-toggle ${layerVisibility.labels ? "active" : ""}`}
            onClick={() => toggleLayerVisibility("labels")}
            title="Toggle Labels"
          >
            <span>Labels</span>
          </button>
        </div>
        <span className="formation-info">
          {customGroups.length > 0 &&
          activeGroupIndex !== null &&
          customGroups[activeGroupIndex]
            ? `Formation ${activeGroupIndex + 1}: ${
                customGroups[activeGroupIndex].startTime.toFixed(2)
              }s-${
                customGroups[activeGroupIndex].endTime.toFixed(2)
              }s, Transition: ${
                customGroups[activeGroupIndex].transitionStartTime.toFixed(2)
              }s-${
                customGroups[activeGroupIndex].transitionEndTime.toFixed(2)
              }s`
            : ""}
        </span>
      </div>
      <div className="waveform-container">
        <div
          className="formations-scroll-wrapper"
          ref={formationsScrollWrapperRef}
          style={{ overflow: "hidden", height: "50px", padding: 0 }}
        >
          <div
            className="formations-regions"
            ref={formationsContainerRef}
            style={{ position: "relative", height: "100%" }}
          >
            {renderFormations()}
            <button
              className="add-formation-btn"
              style={{
                left: `${addButtonPosition}px`,
              }}
              onClick={handleAddFormation}
            >
              <span>+</span>
            </button>
          </div>
        </div>
        <div ref={containerRef} className="waveform"></div>
      </div>
    </div>
  );
};

const CreateProject = () => {
  
}

export default Waveform;
