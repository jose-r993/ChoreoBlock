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
          group.transitionStartBeat ?? startBeat + group.groupLength - 2;
        const transEndBeat = transStartBeat + (group.transitionLength ?? 2);
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

  useEffect(() => {
    if (!waveformScrollWidth || !isReady) return;

    let position = 30;

    if (customGroups && customGroups.length > 0) {
      const lastGroup = customGroups[customGroups.length - 1];
      if (lastGroup) {
        const lastBeat = lastGroup.startBeat + lastGroup.groupLength;
        position = beatToPosition(lastBeat, waveformScrollWidth);

        position += 10;
      }
    }

    setAddButtonPosition(position);
  }, [
    customGroups,
    waveformScrollWidth,
    isReady,
    beatToPosition,
    beatTimestamps,
    duration,
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
    const transitionStartBeat = startBeat;
    const transitionLength = groupLength > 2 ? groupLength - 2 : groupLength;
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
        startBeat: customGroups[groupIndex].startBeat,
        groupLength: customGroups[groupIndex].groupLength,
        transitionStartBeat:
          customGroups[groupIndex].transitionStartBeat ??
          customGroups[groupIndex].startBeat +
            customGroups[groupIndex].groupLength -
            2,
        transitionLength: customGroups[groupIndex].transitionLength ?? 2,
      });
    },
    [customGroups, wavesurfer]
  );

  const handleFormationClick = useCallback(
    (e, groupIndex) => {
      e.stopPropagation();
      onSelectGroup(groupIndex);
      if (wavesurfer && customGroups[groupIndex]) {
        const beatIndex = customGroups[groupIndex].startBeat;
        if (beatTimestamps && beatTimestamps[beatIndex] !== undefined) {
          const time = beatTimestamps[beatIndex];
          if (duration > 0) wavesurfer.seekTo(time / duration);
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
      let currentBeat = 0;
      if (snapMode === "beats") {
        currentBeat = findClosestBeatIndex((x / totalWidth) * duration);
      } else {
        const time = (x / totalWidth) * duration;
        currentBeat = findClosestBeatIndex(time);
      }
      let startBeatDrag = 0;
      if (snapMode === "beats") {
        startBeatDrag = findClosestBeatIndex(
          (dragInfo.startX / totalWidth) * duration
        );
      } else {
        const startTime = (dragInfo.startX / totalWidth) * duration;
        startBeatDrag = findClosestBeatIndex(startTime);
      }
      let deltaBeat = currentBeat - startBeatDrag;
      if (snapMode !== "beats") {
        const pixelDelta = x - dragInfo.startX;
        const timeDelta = (pixelDelta / totalWidth) * duration;
        const beatDuration =
          beatTimestamps && beatTimestamps.length > 1
            ? beatTimestamps[1] - beatTimestamps[0]
            : 0.1;
        deltaBeat = Math.round(timeDelta / beatDuration);
      }
      const group = customGroups[dragInfo.groupIndex];
      if (!group) return;
      let {
        startBeat: newStartBeat,
        groupLength: newGroupLength,
        transitionStartBeat: newTransitionStartBeat,
        transitionLength: newTransitionLength,
      } = group;

      if (dragInfo.edge === "start") {
        newStartBeat = Math.max(0, dragInfo.startBeat + deltaBeat);
        const endBeat = dragInfo.startBeat + dragInfo.groupLength;
        if (newStartBeat + 2 > endBeat) newStartBeat = endBeat - 2;
        newGroupLength = endBeat - newStartBeat;
        const oldTransitionStartOffset =
          (dragInfo.transitionStartBeat ??
            dragInfo.startBeat + dragInfo.groupLength - 2) - dragInfo.startBeat;
        newTransitionStartBeat = newStartBeat + oldTransitionStartOffset;
        newTransitionLength = dragInfo.transitionLength ?? 2;
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
        newTransitionStartBeat =
          dragInfo.transitionStartBeat ?? newStartBeat + newGroupLength - 2;
        newTransitionLength = dragInfo.transitionLength ?? 2;
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
          (dragInfo.transitionStartBeat ?? newStartBeat + newGroupLength - 2) +
          (dragInfo.transitionLength ?? 2);
        newTransitionStartBeat = Math.max(
          newStartBeat,
          (dragInfo.transitionStartBeat ?? newStartBeat + newGroupLength - 2) +
            deltaBeat
        );
        if (newTransitionStartBeat + 1 > originalTransitionEndBeat) {
          newTransitionStartBeat = originalTransitionEndBeat - 1;
        }
        newTransitionLength =
          originalTransitionEndBeat - newTransitionStartBeat;
      } else if (dragInfo.edge === "transition-end") {
        newStartBeat = dragInfo.startBeat;
        newGroupLength = dragInfo.groupLength;
        newTransitionStartBeat =
          dragInfo.transitionStartBeat ?? newStartBeat + newGroupLength - 2;
        const currentTransitionEndBeat =
          (dragInfo.transitionStartBeat ?? newStartBeat + newGroupLength - 2) +
          (dragInfo.transitionLength ?? 2);
        const newTransitionEndBeat = Math.min(
          newStartBeat + newGroupLength,
          currentTransitionEndBeat + deltaBeat
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
      const startPosition = beatToPosition(
        group.startBeat,
        waveformScrollWidth
      );
      const endPosition = beatToPosition(
        group.startBeat + group.groupLength,
        waveformScrollWidth
      );
      const width = Math.max(endPosition - startPosition, 2);

      if (isNaN(startPosition) || isNaN(width)) return null;

      const transitionStartBeat =
        group.transitionStartBeat ?? group.startBeat + group.groupLength - 2;
      const transitionLength = group.transitionLength ?? 2;
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
    beatToPosition,
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

export default Waveform;
