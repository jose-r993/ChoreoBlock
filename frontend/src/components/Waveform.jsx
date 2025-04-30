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
    const handleResize = () => {
      if (wavesurfer && wavesurfer.drawer) {
        requestAnimationFrame(() => {
          if (wavesurfer && wavesurfer.isReady) {
            const waveWrapper = wavesurfer.getWrapper();
            const currentWidth = waveWrapper?.scrollWidth || 0;
            setWaveformScrollWidth(currentWidth);
            if (formationsContainerRef.current) {
              formationsContainerRef.current.style.width = `${currentWidth}px`;
            }
            const scrollLeft = wavesurfer.getScroll();
            if (formationsContainerRef.current) {
              formationsContainerRef.current.style.left = `-${scrollLeft}px`;
            }
            if (containerRef.current) {
              setVisibleRange({
                start: scrollLeft,
                end: scrollLeft + containerRef.current.offsetWidth,
              });
            }
          }
        });
      }
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [wavesurfer, isReady, setVisibleRange]);

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
      } catch (err) {
        console.warn("Error clearing regions:", err);
      }
    }
  }, []);

  const findClosestBeatIndex = useCallback(
    (time) => {
      if (!beatTimestamps || beatTimestamps.length === 0) return 0;
      let closestIndex = 0;
      let minDifference = Math.abs(beatTimestamps[0] - time);
      for (let i = 1; i < beatTimestamps.length; i++) {
        const difference = Math.abs(beatTimestamps[i] - time);
        if (difference < minDifference) {
          minDifference = difference;
          closestIndex = i;
        }
      }
      return closestIndex;
    },
    [beatTimestamps]
  );

  const beatToPosition = useCallback(
    (beatIndex, totalWidth) => {
      if (
        !totalWidth ||
        !duration ||
        !beatTimestamps ||
        beatTimestamps.length === 0
      ) {
        return 0;
      }
      const idx = Math.min(Math.max(0, beatIndex), beatTimestamps.length - 1);
      const time = beatTimestamps[idx] ?? 0;
      return (time / duration) * totalWidth;
    },
    [beatTimestamps, duration]
  );

  const positionToBeat = useCallback(
    (px, totalWidth) => {
      if (
        !totalWidth ||
        duration === 0 ||
        !beatTimestamps ||
        beatTimestamps.length === 0
      ) {
        return 0;
      }
      const time = (px / totalWidth) * duration;
      return findClosestBeatIndex(time);
    },
    [beatTimestamps, duration, findClosestBeatIndex]
  );

  const drawAllRegions = useCallback(() => {
    if (!regionsPluginRef.current || !wavesurfer || !isReady || !duration)
      return;

    try {
      clearAllRegions();
      const beatMap = new Array(beatTimestamps.length).fill(null);
      customGroups.forEach((group, groupIndex) => {
        const startBeat = group.startBeat;
        const endBeat = startBeat + group.groupLength;
        const transStartBeat =
          group.transitionStartBeat !== undefined
            ? group.transitionStartBeat
            : startBeat + group.groupLength - 2;
        const transEndBeat =
          transStartBeat +
          (group.transitionLength !== undefined ? group.transitionLength : 2);

        for (let i = startBeat; i < endBeat && i < beatTimestamps.length; i++) {
          beatMap[i] = {
            groupIndex,
            color: group.color,
            isTransition: i >= transStartBeat && i < transEndBeat,
          };
        }
      });

      if (layerVisibility.beatMarkers && beatTimestamps) {
        beatTimestamps.forEach((time, index) => {
          if (index % subdivisionFactor !== 0) return;

          const beatInfo = beatMap[index];
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
            if (labelEl) {
              labelEl.innerHTML = `<span class="marker-label">${label}</span>`;
            }
            if (isTransition) {
              region.element.classList.add("transition-beat");
            }
          }

          if (region) {
            region.on("click", () => {
              if (wavesurfer && duration > 0) {
                wavesurfer.seekTo(time / duration);
              }
            });
          }
        });
      }
    } catch (error) {
      console.warn("Error drawing regions:", error);
    }
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
      const startTime = region.start;
      const endTime = region.end;

      let startBeat = 0;
      let endBeat = 0;
      if (snapMode === "beats") {
        startBeat = findClosestBeatIndex(startTime);
        endBeat = findClosestBeatIndex(endTime);
        if (endBeat - startBeat < 2) endBeat = startBeat + 2;
      } else {
        startBeat = findClosestBeatIndex(startTime);
        const beatDuration =
          beatTimestamps && beatTimestamps.length > 1
            ? beatTimestamps[1] - beatTimestamps[0]
            : 0.1;
        const formationDuration = endTime - startTime;
        const estimatedBeats = Math.max(
          2,
          Math.round(formationDuration / beatDuration)
        );
        endBeat = startBeat + estimatedBeats;
        if (beatTimestamps && endBeat >= beatTimestamps.length)
          endBeat = beatTimestamps.length - 1;
      }

      const groupLength = endBeat - startBeat;
      let newTransitionStartBeat;
      let newTransitionLength;

      if (type === "formation") {
        if (group.transitionStartBeat !== undefined) {
          const oldRelativePosition =
            group.groupLength > 0
              ? (group.transitionStartBeat - group.startBeat) /
                group.groupLength
              : 0;
          newTransitionStartBeat = Math.round(
            startBeat + groupLength * oldRelativePosition
          );
          newTransitionStartBeat = Math.max(
            startBeat,
            Math.min(newTransitionStartBeat, startBeat + groupLength - 1)
          );
          newTransitionLength = Math.min(
            group.transitionLength || 2,
            startBeat + groupLength - newTransitionStartBeat
          );
        } else {
          newTransitionStartBeat = startBeat + groupLength - 2;
          newTransitionLength = 2;
        }
        const updatedGroup = {
          ...group,
          startBeat,
          groupLength,
          transitionStartBeat: newTransitionStartBeat,
          transitionLength: Math.max(1, newTransitionLength),
        };
        onUpdateGroup(groupIndex, updatedGroup);
      } else if (type === "transition") {
        let transitionStartBeat = 0;
        let transitionEndBeat = 0;
        if (snapMode === "beats") {
          transitionStartBeat = findClosestBeatIndex(startTime);
          transitionEndBeat = findClosestBeatIndex(endTime);
        } else {
          transitionStartBeat = findClosestBeatIndex(startTime);
          const beatDuration =
            beatTimestamps && beatTimestamps.length > 1
              ? beatTimestamps[1] - beatTimestamps[0]
              : 0.1;
          const transitionDuration = endTime - startTime;
          const estimatedBeats = Math.max(
            1,
            Math.round(transitionDuration / beatDuration)
          );
          transitionEndBeat = transitionStartBeat + estimatedBeats;
        }
        transitionStartBeat = Math.max(group.startBeat, transitionStartBeat);
        transitionEndBeat = Math.min(
          group.startBeat + group.groupLength,
          transitionEndBeat
        );
        if (transitionEndBeat - transitionStartBeat < 1)
          transitionEndBeat = transitionStartBeat + 1;
        const updatedGroup = {
          ...group,
          transitionStartBeat: transitionStartBeat,
          transitionLength: transitionEndBeat - transitionStartBeat,
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
    findClosestBeatIndex,
    beatTimestamps,
  ]);

  const handleAddFormation = useCallback(() => {
    let lastEndBeat = 0;
    if (customGroups.length > 0) {
      customGroups.forEach((group) => {
        const endBeat = group.startBeat + group.groupLength;
        if (endBeat > lastEndBeat) lastEndBeat = endBeat;
      });
    }
    let startBeat = lastEndBeat;
    if (wavesurfer) {
      const currentTimeVal = wavesurfer.getCurrentTime();
      const currentBeat = findClosestBeatIndex(currentTimeVal);
      if (currentBeat > lastEndBeat) startBeat = currentBeat;
    }
    if (beatTimestamps && startBeat >= beatTimestamps.length - 8) {
      startBeat = Math.max(0, beatTimestamps.length - 9);
    }
    let groupLength = 8;
    if (beatTimestamps && startBeat + groupLength >= beatTimestamps.length) {
      groupLength = beatTimestamps.length - startBeat - 1;
      if (groupLength < 2) groupLength = 2;
    }
    const transitionStartBeat = startBeat + groupLength - 2;
    const transitionLength = 2;
    const MARKER_COLORS = [
      "#FF5500",
      "#00AAFF",
      "#22CCAA",
      "#FFAA00",
      "#FF00AA",
    ];
    const newGroup = {
      startBeat,
      groupLength,
      color: MARKER_COLORS[customGroups.length % MARKER_COLORS.length],
      transitionStartBeat,
      transitionLength,
      groupName: `Formation ${customGroups.length + 1}`,
    };
    onAddGroup(newGroup);
  }, [
    customGroups,
    beatTimestamps,
    onAddGroup,
    wavesurfer,
    findClosestBeatIndex,
    isReady,
  ]);

  const handleDragStart = useCallback(
    (e, groupIndex, edge) => {
      e.stopPropagation();
      if (
        !formationsContainerRef.current ||
        !containerRef.current ||
        !customGroups[groupIndex]
      )
        return;
      const formationsDiv = formationsContainerRef.current;
      const containerRect = formationsDiv.getBoundingClientRect();
      const x =
        e.clientX - containerRect.left + containerRef.current.scrollLeft;
      setIsDragging(true);
      setDragInfo({
        groupIndex,
        edge,
        startX: x,
        startBeat: customGroups[groupIndex].startBeat,
        groupLength: customGroups[groupIndex].groupLength,
        transitionStartBeat:
          customGroups[groupIndex].transitionStartBeat !== undefined
            ? customGroups[groupIndex].transitionStartBeat
            : customGroups[groupIndex].startBeat +
              customGroups[groupIndex].groupLength -
              2,
        transitionLength:
          customGroups[groupIndex].transitionLength !== undefined
            ? customGroups[groupIndex].transitionLength
            : 2,
      });
    },
    [customGroups]
  );

  const handleFormationClick = useCallback(
    (e, groupIndex) => {
      e.stopPropagation();
      onSelectGroup(groupIndex);
      if (wavesurfer && customGroups[groupIndex]) {
        const beatIndex = customGroups[groupIndex].startBeat;
        if (beatTimestamps && beatTimestamps[beatIndex] !== undefined) {
          const time = beatTimestamps[beatIndex];
          if (duration > 0) {
            wavesurfer.seekTo(time / duration);
          }
        }
      }
    },
    [wavesurfer, customGroups, beatTimestamps, duration, onSelectGroup]
  );

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (
        !isDragging ||
        !dragInfo ||
        !wavesurfer ||
        !containerRef.current ||
        !formationsContainerRef.current
      )
        return;

      const waveWrapper = wavesurfer.getWrapper();
      const totalWidth = waveWrapper?.scrollWidth;
      if (!totalWidth) return;

      const formationsDiv = formationsContainerRef.current;
      const containerRect = formationsDiv.getBoundingClientRect();
      const x =
        e.clientX - containerRect.left + containerRef.current.scrollLeft;

      const currentBeat = positionToBeat(x, totalWidth);
      const startBeatDrag = positionToBeat(dragInfo.startX, totalWidth);
      let deltaBeat = currentBeat - startBeatDrag;

      if (snapMode === "beats") {
        deltaBeat =
          findClosestBeatIndex((x / totalWidth) * duration) -
          findClosestBeatIndex((dragInfo.startX / totalWidth) * duration);
      }

      const group = customGroups[dragInfo.groupIndex];
      if (!group) return;

      let newStartBeat = group.startBeat;
      let newGroupLength = group.groupLength;
      let newTransitionStartBeat = group.transitionStartBeat;
      let newTransitionLength = group.transitionLength;

      if (dragInfo.edge === "start") {
        newStartBeat = Math.max(0, dragInfo.startBeat + deltaBeat);
        const endBeat = dragInfo.startBeat + dragInfo.groupLength;
        if (newStartBeat + 2 > endBeat) newStartBeat = endBeat - 2;
        newGroupLength = endBeat - newStartBeat;
        const oldTransitionStartOffset =
          dragInfo.transitionStartBeat - dragInfo.startBeat;
        newTransitionStartBeat = newStartBeat + oldTransitionStartOffset;
        newTransitionLength = dragInfo.transitionLength;
        if (newTransitionStartBeat < newStartBeat) {
          newTransitionLength -= newStartBeat - newTransitionStartBeat;
          newTransitionStartBeat = newStartBeat;
        }
        if (
          newTransitionStartBeat + newTransitionLength >
          newStartBeat + newGroupLength
        ) {
          newTransitionLength =
            newStartBeat + newGroupLength - newTransitionStartBeat;
        }
      } else if (dragInfo.edge === "end") {
        newGroupLength = Math.max(2, dragInfo.groupLength + deltaBeat);
        if (
          beatTimestamps &&
          dragInfo.startBeat + newGroupLength >= beatTimestamps.length
        ) {
          newGroupLength = beatTimestamps.length - dragInfo.startBeat - 1;
        }
        newStartBeat = dragInfo.startBeat;
        newTransitionStartBeat = dragInfo.transitionStartBeat;
        newTransitionLength = dragInfo.transitionLength;
        if (
          newTransitionStartBeat + newTransitionLength >
          newStartBeat + newGroupLength
        ) {
          newTransitionLength =
            newStartBeat + newGroupLength - newTransitionStartBeat;
        }
      } else if (dragInfo.edge === "transition-start") {
        newStartBeat = dragInfo.startBeat;
        newGroupLength = dragInfo.groupLength;
        const originalTransitionEndBeat =
          dragInfo.transitionStartBeat + dragInfo.transitionLength;
        newTransitionStartBeat = Math.max(
          newStartBeat,
          dragInfo.transitionStartBeat + deltaBeat
        );
        if (newTransitionStartBeat + 1 > originalTransitionEndBeat) {
          newTransitionStartBeat = originalTransitionEndBeat - 1;
        }
        newTransitionLength =
          originalTransitionEndBeat - newTransitionStartBeat;
      } else if (dragInfo.edge === "transition-end") {
        newStartBeat = dragInfo.startBeat;
        newGroupLength = dragInfo.groupLength;
        newTransitionStartBeat = dragInfo.transitionStartBeat;
        const newTransitionEndBeat = Math.min(
          newStartBeat + newGroupLength,
          dragInfo.transitionStartBeat + dragInfo.transitionLength + deltaBeat
        );
        newTransitionLength = Math.max(
          1,
          newTransitionEndBeat - newTransitionStartBeat
        );
      }

      newTransitionLength = Math.max(1, newTransitionLength);
      newTransitionStartBeat = Math.max(newStartBeat, newTransitionStartBeat);
      newTransitionLength = Math.min(
        newTransitionLength,
        newStartBeat + newGroupLength - newTransitionStartBeat
      );
      newTransitionStartBeat = Math.min(
        newTransitionStartBeat,
        newStartBeat + newGroupLength - newTransitionLength
      );

      let willOverlap = false;
      const newEndBeatCheck = newStartBeat + newGroupLength;
      customGroups.forEach((otherGroup, otherIndex) => {
        if (otherIndex === dragInfo.groupIndex) return;
        const otherStart = otherGroup.startBeat;
        const otherEnd = otherStart + otherGroup.groupLength;
        if (newStartBeat < otherEnd && otherStart < newEndBeatCheck)
          willOverlap = true;
      });

      if (!willOverlap) {
        const updatedGroup = {
          ...group,
          startBeat: newStartBeat,
          groupLength: newGroupLength,
          transitionStartBeat: newTransitionStartBeat,
          transitionLength: newTransitionLength,
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
    positionToBeat,
    wavesurfer,
    beatTimestamps,
    findClosestBeatIndex,
    duration,
  ]);

  const renderBeatTooltip = useCallback(() => {
    if (!hoverBeat) return null;
    return (
      <div className="beat-tooltip">
        Beats {hoverBeat.start + 1} - {hoverBeat.end + 1}
      </div>
    );
  }, [hoverBeat]);

  const toggleLayerVisibility = useCallback((layer) => {
    setLayerVisibility((prev) => ({ ...prev, [layer]: !prev[layer] }));
  }, []);

  useEffect(() => {
    if (wavesurfer && isReady) {
      const updateWidthAndInitialPosition = () => {
        requestAnimationFrame(() => {
          const waveWrapper = wavesurfer.getWrapper();
          const currentWidth = waveWrapper?.scrollWidth || 0;
          setWaveformScrollWidth(currentWidth);

          if (formationsContainerRef.current) {
            formationsContainerRef.current.style.width = `${currentWidth}px`;
          }

          if (containerRef.current && formationsContainerRef.current) {
            const scrollLeft = wavesurfer.getScroll();
            formationsContainerRef.current.style.transform = `translateX(-${scrollLeft}px)`;

            setVisibleRange({
              start: scrollLeft,
              end: scrollLeft + (containerRef.current.offsetWidth || 0),
            });
          }
        });
      };

      const handleZoom = () => {
        const currentPxPerSec = wavesurfer?.options?.minPxPerSec;
        if (currentPxPerSec) {
          setZoom(currentPxPerSec);
        }
        updateWidthAndInitialPosition();
      };

      wavesurfer.on("zoom", handleZoom);
      wavesurfer.on("ready", updateWidthAndInitialPosition);
      wavesurfer.on("redraw", updateWidthAndInitialPosition);

      const initialSyncTimeout = setTimeout(updateWidthAndInitialPosition, 0);

      return () => {
        clearTimeout(initialSyncTimeout);
        if (wavesurfer) {
          wavesurfer.un("zoom", handleZoom);
          wavesurfer.un("ready", updateWidthAndInitialPosition);
          wavesurfer.un("redraw", updateWidthAndInitialPosition);
        }
      };
    }
  }, [wavesurfer, isReady, setZoom, setVisibleRange]);

  useEffect(() => {
    if (!wavesurfer || !isReady) return;

    let rafId = null;
    const handleWavesurferScroll = (scrollLeft) => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      rafId = requestAnimationFrame(() => {
        if (formationsContainerRef.current && containerRef.current) {
          formationsContainerRef.current.style.transform = `translateX(-${scrollLeft}px)`;

          setVisibleRange({
            start: scrollLeft,
            end: scrollLeft + containerRef.current.offsetWidth,
          });
        }
      });
    };

    wavesurfer.on("scroll", handleWavesurferScroll);

    if (containerRef.current) {
      handleWavesurferScroll(containerRef.current.scrollLeft);
    }

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      if (wavesurfer) {
        wavesurfer.un("scroll", handleWavesurferScroll);
      }
    };
  }, [wavesurfer, isReady, setVisibleRange]);

  const renderFormations = useCallback(() => {
    if (
      !wavesurfer ||
      !isReady ||
      !formationsContainerRef.current ||
      !containerRef.current ||
      waveformScrollWidth === 0
    )
      return null;

    return customGroups.map((group, originalIndex) => {
      const startPosition = beatToPosition(
        group.startBeat,
        waveformScrollWidth
      );
      const endPosition = beatToPosition(
        group.startBeat + group.groupLength,
        waveformScrollWidth
      );
      const width = Math.max(endPosition - startPosition, 2);

      const transitionStartBeat =
        group.transitionStartBeat !== undefined
          ? group.transitionStartBeat
          : group.startBeat + group.groupLength - 2;
      const transitionLength =
        group.transitionLength !== undefined ? group.transitionLength : 2;

      const transitionStartPosition = beatToPosition(
        transitionStartBeat,
        waveformScrollWidth
      );
      const transitionEndPosition = beatToPosition(
        transitionStartBeat + transitionLength,
        waveformScrollWidth
      );
      const transitionWidth = Math.max(
        transitionEndPosition - transitionStartPosition,
        2
      );

      return (
        <div
          key={`formation-${originalIndex}-${group.startBeat}`}
          className={`formation-group ${
            activeGroupIndex === originalIndex ? "active" : ""
          }`}
          style={{
            left: `${startPosition}px`,
            width: `${width}px`,
            backgroundColor: `${group.color}25`,
            borderColor: group.color,
            opacity: layerVisibility.formationBoundaries ? 1 : 0.3,
            position: "absolute",
          }}
          onClick={(e) => handleFormationClick(e, originalIndex)}
        >
          <div className="formation-content">
            <span
              className="formation-name"
              style={{ display: layerVisibility.labels ? "block" : "none" }}
            >
              {group.groupName || `Formation ${originalIndex + 1}`}
            </span>
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
                width: `${transitionWidth}px`,
                height: "20px",
                top: "26px",
                backgroundColor: group.color,
                opacity: 0.7,
                borderRadius: "4px",
                pointerEvents: "all",
                cursor: "pointer",
              }}
              onMouseEnter={() =>
                setHoverBeat({
                  start: transitionStartBeat,
                  end: transitionStartBeat + transitionLength - 1,
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
              </div>
              <div
                className="handle-transition-start"
                onMouseDown={(e) =>
                  handleDragStart(e, originalIndex, "transition-start")
                }
                title={`Beat ${transitionStartBeat + 1}`}
              ></div>
              <div
                className="handle-transition-end"
                onMouseDown={(e) =>
                  handleDragStart(e, originalIndex, "transition-end")
                }
                title={`Beat ${transitionStartBeat + transitionLength}`}
              ></div>
            </div>
          </div>
          <div
            className="handle handle-start"
            onMouseDown={(e) => handleDragStart(e, originalIndex, "start")}
          ></div>
          <div
            className="handle handle-end"
            onMouseDown={(e) => handleDragStart(e, originalIndex, "end")}
          ></div>
          {hoverBeat &&
            hoverBeat.groupIndex === originalIndex &&
            renderBeatTooltip()}
        </div>
      );
    });
  }, [
    wavesurfer,
    isReady,
    customGroups,
    activeGroupIndex,
    beatToPosition,
    handleFormationClick,
    handleDragStart,
    layerVisibility,
    setHoverBeat,
    hoverBeat,
    renderBeatTooltip,
    waveformScrollWidth,
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
            />
            Snap to Beats
          </label>
          <label className="snap-radio">
            <input
              type="radio"
              name="snapMode"
              value="free"
              checked={snapMode === "free"}
              onChange={() => setSnapMode("free")}
            />
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
            ? `Formation ${activeGroupIndex + 1}: Beats ${
                customGroups[activeGroupIndex].startBeat + 1
              }-${
                customGroups[activeGroupIndex].startBeat +
                customGroups[activeGroupIndex].groupLength
              }, Transition: Beats ${
                customGroups[activeGroupIndex].transitionStartBeat + 1
              }-${
                customGroups[activeGroupIndex].transitionStartBeat +
                customGroups[activeGroupIndex].transitionLength
              }`
            : ""}
        </span>
      </div>
      <div className="waveform-container">
        <div
          className="formations-scroll-wrapper"
          ref={formationsScrollWrapperRef}
        >
          <div className="formations-regions" ref={formationsContainerRef}>
            {renderFormations()}
            <button className="add-formation-btn" onClick={handleAddFormation}>
              <span>+</span>
            </button>
          </div>
        </div>
        <div ref={containerRef} className="waveform"></div>
      </div>
    </div>
  );
};

export default Waveform;
