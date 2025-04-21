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
  const [duration, setDuration] = useState(0);
  const songName = audioFile ? audioFile.name.replace(/\.[^/.]+$/, "") : "";
  const regionsPluginRef = useRef(null);
  const [zoom, setZoom] = useState(currentZoom);
  const [isDragging, setIsDragging] = useState(false);
  const [dragInfo, setDragInfo] = useState(null);
  const [snapMode, setSnapMode] = useState("beats");
  const [hoverBeat, setHoverBeat] = useState(null);

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

      const handleZoom = (zoomValue) => {
        const minZoom = 40;
        if (zoomValue < minZoom) {
          wavesurfer.zoom(minZoom);
        }
        setZoom(zoomValue);

        setTimeout(() => {
          if (formationsContainerRef.current) {
            const event = new Event("resize");
            window.dispatchEvent(event);
          }
        }, 50);
      };

      wavesurfer.on("zoom", handleZoom);

      const audioDuration = wavesurfer.getDuration();
      setDuration(audioDuration);

      onWavesurferInit(wavesurfer);

      return () => {
        wavesurfer.un("zoom", handleZoom);
      };
    }
  }, [wavesurfer, isReady, volume, onWavesurferInit]);

  useEffect(() => {
    if (wavesurfer && isReady && zoom !== currentZoom) {
      wavesurfer.zoom(zoom);
    }
  }, [wavesurfer, isReady, zoom, currentZoom]);

  useEffect(() => {
    const handleResize = () => {
      if (wavesurfer && wavesurfer.drawer) {
        setZoom(zoom);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [zoom, wavesurfer]);

  useEffect(() => {
    if (wavesurfer && typeof currentTime === "number") {
      const updateTime = () => {
        onTimeUpdate(wavesurfer.getCurrentTime());
      };

      wavesurfer.on("timeupdate", updateTime);

      return () => {
        wavesurfer.un("timeupdate", updateTime);
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
      if (!beatTimestamps.length) return 0;

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
    (beatIndex) => {
      if (!containerRef.current || !duration || beatTimestamps.length === 0) {
        return 0;
      }

      const idx = Math.min(Math.max(0, beatIndex), beatTimestamps.length - 1);
      const time = beatTimestamps[idx];

      const fullWidth = containerRef.current.scrollWidth;

      return (time / duration) * fullWidth;
    },
    [beatTimestamps, containerRef, duration]
  );

  const positionToBeat = useCallback(
    (px) => {
      if (
        !containerRef.current ||
        duration === 0 ||
        beatTimestamps.length === 0
      ) {
        return 0;
      }
      const fullWidth = containerRef.current.scrollWidth;
      const time = (px / fullWidth) * duration;
      return findClosestBeatIndex(time);
    },
    [beatTimestamps, containerRef, duration, findClosestBeatIndex]
  );

  const drawAllRegions = useCallback(() => {
    if (!regionsPluginRef.current || !wavesurfer || !isReady) return;

    try {
      clearAllRegions();

      const beatMap = new Array(beatTimestamps.length).fill(null);
      const transitionMap = new Array(beatTimestamps.length).fill(false);

      customGroups.forEach((group, groupIndex) => {
        const startBeat = group.startBeat;
        const endBeat = startBeat + group.groupLength;
        const transStartBeat =
          group.transitionStartBeat || startBeat + group.groupLength - 2;
        const transEndBeat = transStartBeat + (group.transitionLength || 2);

        for (let i = startBeat; i < endBeat && i < beatTimestamps.length; i++) {
          beatMap[i] = {
            groupIndex,
            color: group.color,
            isTransition: i >= transStartBeat && i < transEndBeat,
          };

          if (i >= transStartBeat && i < transEndBeat) {
            transitionMap[i] = true;
          }
        }
      });

      if (layerVisibility.beatMarkers) {
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
            start: time,
            end: time + 0.1,
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
              if (wavesurfer) {
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
    activeGroupIndex,
    groupSize,
    markerOffset,
    subdivisionFactor,
    duration,
    layerVisibility,
  ]);

  useEffect(() => {
    if (isReady && beatTimestamps.length > 0 && wavesurfer) {
      drawAllRegions();
    }
  }, [
    isReady,
    beatTimestamps,
    customGroups,
    activeGroupIndex,
    drawAllRegions,
    wavesurfer,
    layerVisibility,
  ]);

  useEffect(() => {
    if (isReady && wavesurfer && customGroups.length > 0) {
      drawAllRegions();
    }
  }, [customGroups.length, isReady, wavesurfer, drawAllRegions]);

  useEffect(() => {
    if (!wavesurfer || !isReady) return;
    const waveContainer = containerRef.current;
    const formationsEl = formationsContainerRef.current;
    if (!waveContainer || !formationsEl) return;

    const handleZoom = () => {
      const waveEl = containerRef.current;
      const formationsEl = formationsContainerRef.current;
      const fullWidth =
        waveEl.querySelector(".wave")?.scrollWidth ?? waveEl.scrollWidth;
      formationsEl.style.width = fullWidth + "px";
    };

    wavesurfer.on("zoom", handleZoom);
    handleZoom();
    return () => wavesurfer.un("zoom", handleZoom);
  }, [wavesurfer, isReady]);

  useEffect(() => {
    if (!wavesurfer || !isReady) return;
    const waveContainer = containerRef.current;
    const formationsEl = formationsContainerRef.current;
    if (!waveContainer || !formationsEl) return;

    const handleWaveScroll = () => {
      formationsEl.scrollLeft = waveContainer.scrollLeft;
    };
    const handleFormationsScroll = () => {
      waveContainer.scrollLeft = formationsEl.scrollLeft;
    };

    // ← use waveContainer, not waveEl, and hook up your named handlers
    waveContainer.addEventListener("scroll", handleWaveScroll);
    formationsEl.addEventListener("scroll", handleFormationsScroll);

    return () => {
      waveContainer.removeEventListener("scroll", handleWaveScroll);
      formationsEl.removeEventListener("scroll", handleFormationsScroll);
    };
  }, [wavesurfer, isReady]);

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

      if (type === "formation") {
        let startBeat = 0;
        let endBeat = 0;

        if (snapMode === "beats") {
          startBeat = findClosestBeatIndex(startTime);
          endBeat = findClosestBeatIndex(endTime);

          if (endBeat - startBeat < 2) {
            endBeat = startBeat + 2;
          }
        } else {
          startBeat = findClosestBeatIndex(startTime);
          const beatDuration = beatTimestamps[1] - beatTimestamps[0];
          const formationDuration = endTime - startTime;
          const estimatedBeats = Math.max(
            2,
            Math.round(formationDuration / beatDuration)
          );
          endBeat = startBeat + estimatedBeats;

          if (endBeat >= beatTimestamps.length) {
            endBeat = beatTimestamps.length - 1;
          }
        }

        const groupLength = endBeat - startBeat;

        let newTransitionStartBeat;
        let newTransitionLength;

        if (group.transitionStartBeat !== undefined) {
          const oldRelativePosition =
            (group.transitionStartBeat - group.startBeat) / group.groupLength;

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
          transitionLength: newTransitionLength,
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
          const beatDuration = beatTimestamps[1] - beatTimestamps[0];
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

        if (transitionEndBeat - transitionStartBeat < 1) {
          transitionEndBeat = transitionStartBeat + 1;
        }

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
      if (type === "formation" || type === "transition") {
        onSelectGroup(groupIndex);
      }
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
        if (endBeat > lastEndBeat) {
          lastEndBeat = endBeat;
        }
      });
    }

    let startBeat = lastEndBeat;

    if (wavesurfer) {
      const currentTime = wavesurfer.getCurrentTime();
      const currentBeat = findClosestBeatIndex(currentTime);
      if (currentBeat > lastEndBeat) {
        startBeat = currentBeat;
      }
    }

    if (startBeat >= beatTimestamps.length - 8) {
      startBeat = Math.max(0, beatTimestamps.length - 9);
    }

    let groupLength = 8;
    if (startBeat + groupLength >= beatTimestamps.length) {
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

    if (wavesurfer && isReady) {
      requestAnimationFrame(() => {
        drawAllRegions();
      });
    }
  }, [
    customGroups,
    beatTimestamps.length,
    onAddGroup,
    wavesurfer,
    findClosestBeatIndex,
    isReady,
    drawAllRegions,
  ]);

  const handleDragStart = useCallback(
    (e, groupIndex, edge) => {
      e.stopPropagation();

      if (!formationsContainerRef.current) return;

      const container = formationsContainerRef.current;
      const containerRect = container.getBoundingClientRect();
      const x = e.clientX - containerRect.left;

      setIsDragging(true);
      setDragInfo({
        groupIndex,
        edge,
        startX: x,
        startBeat: customGroups[groupIndex].startBeat,
        groupLength: customGroups[groupIndex].groupLength,
        transitionStartBeat: customGroups[groupIndex].transitionStartBeat || 0,
        transitionLength: customGroups[groupIndex].transitionLength || 2,
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
        if (beatTimestamps[beatIndex]) {
          const time = beatTimestamps[beatIndex];
          wavesurfer.seekTo(time / duration);
        }
      }
    },
    [wavesurfer, customGroups, beatTimestamps, duration, onSelectGroup]
  );

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging || !dragInfo || !wavesurfer) return;

      const container = formationsContainerRef.current;
      const containerRect = container.getBoundingClientRect();
      const x = e.clientX - containerRect.left;
      const deltaX = x - dragInfo.startX;

      const deltaBeat =
        snapMode === "beats"
          ? positionToBeat(x) - positionToBeat(dragInfo.startX)
          : Math.round(deltaX / 10);

      const group = customGroups[dragInfo.groupIndex];
      if (!group) return;

      let newStartBeat = group.startBeat;
      let newGroupLength = group.groupLength;
      let newTransitionStartBeat =
        group.transitionStartBeat || group.startBeat + group.groupLength - 2;
      let newTransitionLength = group.transitionLength || 2;

      if (dragInfo.edge === "start") {
        newStartBeat = Math.max(0, dragInfo.startBeat + deltaBeat);

        if (newStartBeat + 2 >= group.startBeat + group.groupLength) {
          newStartBeat = group.startBeat + group.groupLength - 2;
        }

        newGroupLength = group.startBeat + group.groupLength - newStartBeat;

        if (newTransitionStartBeat < newStartBeat) {
          newTransitionStartBeat = newStartBeat;
          newTransitionLength =
            newStartBeat + newGroupLength - newTransitionStartBeat;
        }
      } else if (dragInfo.edge === "end") {
        newGroupLength = Math.max(2, dragInfo.groupLength + deltaBeat);

        if (newStartBeat + newGroupLength > beatTimestamps.length) {
          newGroupLength = beatTimestamps.length - newStartBeat;
        }

        if (
          newTransitionStartBeat + newTransitionLength >
          newStartBeat + newGroupLength
        ) {
          newTransitionStartBeat =
            newStartBeat + newGroupLength - newTransitionLength;
        }
      } else if (dragInfo.edge === "transition-start") {
        newTransitionStartBeat = Math.max(
          newStartBeat,
          dragInfo.transitionStartBeat + deltaBeat
        );

        if (newTransitionStartBeat + 1 >= newStartBeat + newGroupLength) {
          newTransitionStartBeat = newStartBeat + newGroupLength - 1;
        }

        newTransitionLength =
          newStartBeat + newGroupLength - newTransitionStartBeat;
      } else if (dragInfo.edge === "transition-end") {
        const newEndBeat = Math.min(
          newStartBeat + newGroupLength,
          dragInfo.transitionStartBeat + dragInfo.transitionLength + deltaBeat
        );

        newTransitionLength = Math.max(1, newEndBeat - newTransitionStartBeat);
      }

      let willOverlap = false;
      const newEndBeat = newStartBeat + newGroupLength;

      customGroups.forEach((otherGroup, otherIndex) => {
        if (otherIndex === dragInfo.groupIndex) return;

        const otherStart = otherGroup.startBeat;
        const otherEnd = otherStart + otherGroup.groupLength;

        if (newStartBeat < otherEnd && otherStart < newEndBeat) {
          willOverlap = true;
        }
      });

      if (!willOverlap) {
        const updatedGroup = {
          ...group,
          startBeat: newStartBeat,
          groupLength: newGroupLength,
          transitionStartBeat: newTransitionStartBeat,
          transitionLength: newTransitionLength,
        };

        onUpdateGroup(dragInfo.groupIndex, updatedGroup);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setDragInfo(null);
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
  ]);

  const renderBeatTooltip = useCallback(() => {
    if (!hoverBeat) return null;

    return (
      <div className="beat-tooltip">
        Beats {hoverBeat.start + 1} - {hoverBeat.end}
      </div>
    );
  }, [hoverBeat]);

  const toggleLayerVisibility = useCallback((layer) => {
    setLayerVisibility((prev) => ({
      ...prev,
      [layer]: !prev[layer],
    }));
  }, []);

  const renderFormations = useCallback(() => {
    if (!wavesurfer || !isReady) return null;

    return customGroups.map((group, index) => {
      const startPosition = beatToPosition(group.startBeat);
      const endPosition = beatToPosition(group.startBeat + group.groupLength);
      const width = Math.max(endPosition - startPosition, 30);

      const transitionStartBeat =
        group.transitionStartBeat !== undefined
          ? group.transitionStartBeat
          : group.startBeat + group.groupLength - 2;

      const transitionLength =
        group.transitionLength !== undefined ? group.transitionLength : 2;

      const transitionStartPosition = beatToPosition(transitionStartBeat);
      const transitionWidth =
        beatToPosition(transitionStartBeat + transitionLength) -
        transitionStartPosition;

      return (
        <div
          key={`formation-${index}`}
          className={`formation-group ${
            activeGroupIndex === index ? "active" : ""
          }`}
          style={{
            left: `${startPosition}px`,
            width: `${width}px`,
            backgroundColor: `${group.color}25`,
            borderColor: group.color,
            opacity: layerVisibility.formationBoundaries ? 1 : 0.3,
          }}
          onClick={(e) => handleFormationClick(e, index)}
        >
          <div className="formation-content">
            <span
              className="formation-name"
              style={{
                display: layerVisibility.labels ? "block" : "none",
              }}
            >
              {group.groupName || `Formation ${index + 1}`}
            </span>
          </div>

          <div className="formation-transition">
            <div
              className="transition-indicator"
              style={{
                position: "absolute",
                left: `${transitionStartPosition - startPosition}px`,
                width: `${transitionWidth}px`,
                height: "20px",
                top: "26px",
                backgroundColor: group.color,
                opacity: layerVisibility.transitions ? 0.7 : 0.2,
                borderRadius: "4px",
                pointerEvents: "all",
                cursor: "pointer",
              }}
              onMouseEnter={() =>
                setHoverBeat({
                  start: transitionStartBeat,
                  end: transitionStartBeat + transitionLength,
                  groupIndex: index,
                })
              }
              onMouseLeave={() => setHoverBeat(null)}
            >
              <div
                className="transition-content"
                style={{
                  display: layerVisibility.labels ? "block" : "none",
                }}
              >
                <span>For.</span>
              </div>

              <div
                className="handle-transition-start"
                onMouseDown={(e) =>
                  handleDragStart(e, index, "transition-start")
                }
                title={`Beat ${transitionStartBeat + 1}`}
              ></div>

              <div
                className="handle-transition-end"
                onMouseDown={(e) => handleDragStart(e, index, "transition-end")}
                title={`Beat ${transitionStartBeat + transitionLength}`}
              ></div>
            </div>
          </div>

          <div
            className="handle handle-start"
            onMouseDown={(e) => handleDragStart(e, index, "start")}
          ></div>

          <div
            className="handle handle-end"
            onMouseDown={(e) => handleDragStart(e, index, "end")}
          ></div>

          {hoverBeat && hoverBeat.groupIndex === index && renderBeatTooltip()}
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
              }, 
 Transition: Beats ${customGroups[activeGroupIndex].transitionStartBeat + 1}-${
                customGroups[activeGroupIndex].transitionStartBeat +
                customGroups[activeGroupIndex].transitionLength
              }`
            : ""}
        </span>
      </div>

      <div className="waveform-container">
        <div className="formations-regions" ref={formationsContainerRef}>
          {renderFormations()}
          <button className="add-formation-btn" onClick={handleAddFormation}>
            <span>+</span>
          </button>
        </div>
        <div ref={containerRef} className="waveform"></div>
      </div>
    </div>
  );
};

export default Waveform;
