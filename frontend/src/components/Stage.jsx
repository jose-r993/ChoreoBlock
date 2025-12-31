import React, { useRef, useState, useCallback, useEffect } from "react";
import { motion } from "motion/react";
import { derivePathFromGesture } from "./pathDetectionHelpers";
import "../styles/Stage.scss";

const DANCER_WIDTH = 24;
const DANCER_HEIGHT = 24;
const STAGE_WIDTH = 1600;
const STAGE_HEIGHT = 800;
const PADDING = 600;
const CONTAINER_WIDTH = STAGE_WIDTH + PADDING;
const CONTAINER_HEIGHT = STAGE_HEIGHT + 2 * PADDING;
const MIN_SCALE = 0.5;
const MAX_SCALE = 1.8;
const ZOOM_FACTOR = 1.02;

const Stage = ({
  dancers = [],
  activeGroupIndex,
  customGroups = [],
  currentTimelineState,
  getDancerPosition,
  onSetDancerPosition,
  onSavePath,
  pathMode,
  isStageInPathDrawingMode,
  selectedDancerIds,
  onDancersSelected,
  getActualStartForFormation,
  getActualEndForFormation,
  formations,
  onUpdateDancerPosition,
  onUpdateFormation,
}) => {
  const [stageMode, setStageMode] = useState("select");
  const [isCurrentlyDrawingPath, setIsCurrentlyDrawingPath] = useState(false);
  const [pathInitiatorDancer, setPathInitiatorDancer] = useState(null);
  const [currentDrawingPath, setCurrentDrawingPath] = useState([]);
  const [drawingModifiers, setDrawingModifiers] = useState({
    shiftKey: false,
    altKey: false,
    ctrlKey: false,
  });

  const [isDraggingDancer, setIsDraggingDancer] = useState(false);
  const [draggingDancer, setDraggingDancer] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragStartPosition, setDragStartPosition] = useState({ x: 0, y: 0 });
  const [originalPath, setOriginalPath] = useState(null);

  const [isMarqueeSelecting, setIsMarqueeSelecting] = useState(false);
  const [marqueeStartCoords, setMarqueeStartCoords] = useState({ x: 0, y: 0 });
  const [marqueeCurrentCoords, setMarqueeCurrentCoords] = useState({
    x: 0,
    y: 0,
  });

  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [scale, setScale] = useState(0.65);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, tx: 0, ty: 0 });
  const [viewportDimensions, setViewportDimensions] = useState({
    width: 800,
    height: 600,
  });

  const viewportRef = useRef(null);
  const containerRef = useRef(null);
  const dancerPositionsRef = useRef({});

  useEffect(() => {
    const updateViewportDimensions = () => {
      if (viewportRef.current) {
        const rect = viewportRef.current.getBoundingClientRect();
        setViewportDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateViewportDimensions();
    window.addEventListener("resize", updateViewportDimensions);
    return () => window.removeEventListener("resize", updateViewportDimensions);
  }, []);

  useEffect(() => {
    const preventDefault = (e) => e.preventDefault();
    const viewport = viewportRef.current;
    if (viewport) {
      viewport.addEventListener("wheel", preventDefault, { passive: false });
      viewport.addEventListener("contextmenu", preventDefault);

      return () => {
        viewport.removeEventListener("wheel", preventDefault);
        viewport.removeEventListener("contextmenu", preventDefault);
      };
    }
  }, []);

  useEffect(() => {
    const newPositions = {};
    dancers.forEach((dancer) => {
      newPositions[dancer.id] = getDancerPosition(dancer.id);
    });
    dancerPositionsRef.current = newPositions;
  }, [dancers, getDancerPosition, currentTimelineState]);

  const clampTranslation = useCallback(
    (newTx, newTy, currentScale) => {
      const minTx = viewportDimensions.width - CONTAINER_WIDTH * currentScale - PADDING * currentScale;
      const maxTx = PADDING * currentScale;
      const minTy = viewportDimensions.height - CONTAINER_HEIGHT * currentScale - PADDING * currentScale;
      const maxTy = PADDING * currentScale;

      return {
        tx: Math.max(minTx, Math.min(maxTx, newTx)),
        ty: Math.max(minTy, Math.min(maxTy, newTy)),
      };
    },
    [viewportDimensions]
  );

  const getStageCoords = useCallback(
    (e) => {
      if (!containerRef.current) return null;
      const containerBounds = containerRef.current.getBoundingClientRect();
      const viewportBounds = viewportRef.current.getBoundingClientRect();

      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      const containerX = (clientX - containerBounds.left) / scale;
      const containerY = (clientY - containerBounds.top) / scale;

      const stageX = containerX - PADDING;
      const stageY = containerY - PADDING;

      return { x: stageX, y: stageY };
    },
    [scale]
  );

  const handleWheel = useCallback(
    (e) => {
      e.preventDefault();

      // Detect pinch-to-zoom gesture (browser sets ctrlKey for pinch on trackpad)
      const isPinchZoom = e.ctrlKey || e.metaKey;

      if (isPinchZoom) {
        // PINCH-TO-ZOOM: Zoom at cursor position
        const delta = e.deltaY;

        // On Mac trackpads, deltaY is very sensitive during pinch, so we use a smaller factor
        const zoomSensitivity = 0.01;
        const zoomMultiplier = 1 - delta * zoomSensitivity;

        const newScale = Math.max(
          MIN_SCALE,
          Math.min(MAX_SCALE, scale * zoomMultiplier)
        );

        if (newScale !== scale) {
          const rect = viewportRef.current.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;

          // Calculate world coordinates at mouse position
          const worldX = (mouseX - tx) / scale;
          const worldY = (mouseY - ty) / scale;

          // Calculate new translation to keep mouse position fixed
          const newTx = mouseX - worldX * newScale;
          const newTy = mouseY - worldY * newScale;

          const clamped = clampTranslation(newTx, newTy, newScale);

          setScale(newScale);
          setTx(clamped.tx);
          setTy(clamped.ty);
        }
      } else {
        // TWO-FINGER PAN: Pan the stage
        const panSensitivity = 1.0; // Adjust this to make panning faster/slower
        const deltaX = e.deltaX * panSensitivity;
        const deltaY = e.deltaY * panSensitivity;

        const newTx = tx - deltaX;
        const newTy = ty - deltaY;

        const clamped = clampTranslation(newTx, newTy, scale);

        setTx(clamped.tx);
        setTy(clamped.ty);
      }
    },
    [scale, tx, ty, clampTranslation]
  );

  const handlePointerDown = useCallback(
    (e) => {
      const coords = getStageCoords(e);
      if (!coords) return;

      if (e.button === 2 || e.button === 1 || (e.button === 0 && e.shiftKey)) {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        setIsPanning(true);
        setPanStart({ x: e.clientX, y: e.clientY, tx, ty });
        return;
      }

      if (
        e.target === containerRef.current ||
        e.target.classList.contains("stage-background")
      ) {
        if (stageMode === "select") {
          e.preventDefault();
          setIsMarqueeSelecting(true);
          setMarqueeStartCoords(coords);
          setMarqueeCurrentCoords(coords);
          if (onDancersSelected) onDancersSelected(new Set());
        }
      }
    },
    [tx, ty, getStageCoords, stageMode, onDancersSelected]
  );

  const handlePointerUp = useCallback(
    (e) => {
      if (isPanning) {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
        setIsPanning(false);
        setPanStart({ x: 0, y: 0, tx: 0, ty: 0 });
        return;
      }

      if (
        isCurrentlyDrawingPath &&
        pathInitiatorDancer &&
        currentDrawingPath.length > 0 &&
        stageMode === "draw"
      ) {
        const processedPath = derivePathFromGesture(currentDrawingPath, {
          shiftKey: drawingModifiers.shiftKey,
          altKey: drawingModifiers.altKey,
          pathModeHint: pathMode,
          straightThreshold: 5 * (window.devicePixelRatio || 1),
          axisLockThreshold: 10,
          simplifyEpsilon: 3,
          smoothingIterations: 2,
        });

        // Convert center coordinates back to top-left for storage
        const pathInTopLeftCoords = processedPath.points.map((p) => ({
          x: p.x - DANCER_WIDTH / 2,
          y: p.y - DANCER_HEIGHT / 2,
        }));

        if (onSavePath) {
          onSavePath(
            pathInitiatorDancer.id,
            pathInTopLeftCoords,
            processedPath.kind,
            processedPath.subKind
          );
        }

        setIsCurrentlyDrawingPath(false);
        setCurrentDrawingPath([]);
        setPathInitiatorDancer(null);
        setDrawingModifiers({ shiftKey: false, altKey: false, ctrlKey: false });
      }

      if (isDraggingDancer) {
        setIsDraggingDancer(false);
        setDraggingDancer(null);
        setDragOffset({ x: 0, y: 0 });
        setDragStartPosition({ x: 0, y: 0 });
        setOriginalPath(null);
      }

      if (isMarqueeSelecting) {
        setIsMarqueeSelecting(false);
        setMarqueeStartCoords({ x: 0, y: 0 });
        setMarqueeCurrentCoords({ x: 0, y: 0 });
      }
    },
    [
      isPanning,
      isCurrentlyDrawingPath,
      isDraggingDancer,
      isMarqueeSelecting,
      pathInitiatorDancer,
      currentDrawingPath,
      stageMode,
      pathMode,
      drawingModifiers,
      onSavePath,
    ]
  );

  const handleDancerMouseDown = useCallback(
    (e, dancer) => {
      e.stopPropagation();
      const coords = getStageCoords(e);
      if (!coords) return;
      e.preventDefault();

      const currentVisualPosition =
        dancerPositionsRef.current[dancer.id] || getDancerPosition(dancer.id);

      if (
        stageMode === "draw" &&
        isStageInPathDrawingMode &&
        activeGroupIndex !== null
      ) {
        setDrawingModifiers({
          shiftKey: e.shiftKey,
          altKey: e.altKey,
          ctrlKey: e.ctrlKey || e.metaKey,
        });

        setPathInitiatorDancer(dancer);
        // Convert to center coordinates for drawing
        const dancerCenter = currentVisualPosition
          ? {
              x: currentVisualPosition.x + DANCER_WIDTH / 2,
              y: currentVisualPosition.y + DANCER_HEIGHT / 2,
            }
          : coords;
        setCurrentDrawingPath([dancerCenter]);
        setIsCurrentlyDrawingPath(true);

        if (!selectedDancerIds || !selectedDancerIds.has(dancer.id)) {
          if (e.shiftKey || e.ctrlKey || e.metaKey) {
            const newSelection = new Set(selectedDancerIds);
            newSelection.add(dancer.id);
            if (onDancersSelected) onDancersSelected(newSelection);
          } else {
            if (onDancersSelected) onDancersSelected(new Set([dancer.id]));
          }
        }
      } else if (stageMode === "select") {
        if (e.shiftKey || e.ctrlKey || e.metaKey) {
          const newSelection = new Set(selectedDancerIds);
          if (newSelection.has(dancer.id)) {
            newSelection.delete(dancer.id);
          } else {
            newSelection.add(dancer.id);
          }
          if (onDancersSelected) onDancersSelected(newSelection);
        } else {
          if (onDancersSelected) onDancersSelected(new Set([dancer.id]));
        }

        setIsDraggingDancer(true);
        setDraggingDancer(dancer);
        setDragStartPosition(currentVisualPosition);
        setDragOffset({
          x: coords.x - currentVisualPosition.x,
          y: coords.y - currentVisualPosition.y,
        });

        if (
          activeGroupIndex !== null &&
          formations &&
          formations[activeGroupIndex]
        ) {
          const formationData = formations[activeGroupIndex][dancer.id];
          if (formationData && formationData.rawStagePath) {
            setOriginalPath(formationData.rawStagePath);
          } else {
            setOriginalPath(null);
          }
        }
      }
    },
    [
      activeGroupIndex,
      getStageCoords,
      getDancerPosition,
      isStageInPathDrawingMode,
      selectedDancerIds,
      onDancersSelected,
      stageMode,
      formations,
    ]
  );

  const calculateNormalizedMarquee = useCallback(() => {
    const x1 = Math.min(marqueeStartCoords.x, marqueeCurrentCoords.x);
    const y1 = Math.min(marqueeStartCoords.y, marqueeCurrentCoords.y);
    const x2 = Math.max(marqueeStartCoords.x, marqueeCurrentCoords.x);
    const y2 = Math.max(marqueeStartCoords.y, marqueeCurrentCoords.y);
    return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
  }, [marqueeStartCoords, marqueeCurrentCoords]);

  const checkDancerInMarquee = useCallback((dancerPos, normalizedMarquee) => {
    if (!dancerPos || !normalizedMarquee) return false;
    const dancerCenterX = dancerPos.x + DANCER_WIDTH / 2;
    const dancerCenterY = dancerPos.y + DANCER_HEIGHT / 2;
    const marqueeRight = normalizedMarquee.x + normalizedMarquee.width;
    const marqueeBottom = normalizedMarquee.y + normalizedMarquee.height;
    return (
      dancerCenterX >= normalizedMarquee.x &&
      dancerCenterX <= marqueeRight &&
      dancerCenterY >= normalizedMarquee.y &&
      dancerCenterY <= marqueeBottom
    );
  }, []);

  const handleZoomIn = useCallback(() => {
    const newScale = Math.min(MAX_SCALE, scale * ZOOM_FACTOR);
    if (newScale !== scale) {
      const centerX = viewportDimensions.width / 2;
      const centerY = viewportDimensions.height / 2;

      const worldX = (centerX - tx) / scale;
      const worldY = (centerY - ty) / scale;

      const newTx = centerX - worldX * newScale;
      const newTy = centerY - worldY * newScale;

      const clamped = clampTranslation(newTx, newTy, newScale);

      setScale(newScale);
      setTx(clamped.tx);
      setTy(clamped.ty);
    }
  }, [scale, tx, ty, viewportDimensions, clampTranslation]);

  const handleZoomOut = useCallback(() => {
    const newScale = Math.max(MIN_SCALE, scale / ZOOM_FACTOR);
    if (newScale !== scale) {
      const centerX = viewportDimensions.width / 2;
      const centerY = viewportDimensions.height / 2;

      const worldX = (centerX - tx) / scale;
      const worldY = (centerY - ty) / scale;

      const newTx = centerX - worldX * newScale;
      const newTy = centerY - worldY * newScale;

      const clamped = clampTranslation(newTx, newTy, newScale);

      setScale(newScale);
      setTx(clamped.tx);
      setTy(clamped.ty);
    }
  }, [scale, tx, ty, viewportDimensions, clampTranslation]);

  const handleResetView = useCallback(() => {
    setScale(0.5);
    setTx(0);
    setTy(0);
  }, []);

  const renderDancerShape = (dancer) => {
    const color = dancer.color || "#cccccc";
    switch (dancer.shape) {
      case "triangle":
        return <polygon points="10,0 20,20 0,20" fill={color} />;
      case "square":
        return <rect x="0" y="0" width="20" height="20" fill={color} />;
      default:
        return <circle cx="10" cy="10" r="10" fill={color} />;
    }
  };

  const renderPathPreview = () => {
    if (!isCurrentlyDrawingPath || currentDrawingPath.length < 2) return null;

    const previewPath = derivePathFromGesture(currentDrawingPath, {
      shiftKey: drawingModifiers.shiftKey,
      altKey: drawingModifiers.altKey,
      pathModeHint: pathMode,
      straightThreshold: 5 * (window.devicePixelRatio || 1),
      axisLockThreshold: 10,
      simplifyEpsilon: 3,
      smoothingIterations: 2,
    });

    let d = "";
    if (previewPath.kind === "straight" || previewPath.kind === "hold") {
      if (previewPath.points.length >= 2) {
        d = `M ${previewPath.points[0].x} ${previewPath.points[0].y} L ${previewPath.points[1].x} ${previewPath.points[1].y}`;
      }
    } else {
      if (previewPath.points.length >= 2) {
        d = `M ${previewPath.points[0].x} ${previewPath.points[0].y}`;
        for (let i = 1; i < previewPath.points.length; i++) {
          d += ` L ${previewPath.points[i].x} ${previewPath.points[i].y}`;
        }
      }
    }

    return (
      <svg
        className="path-preview"
        style={{
          position: "absolute",
          top: PADDING,
          left: PADDING,
          width: STAGE_WIDTH,
          height: STAGE_HEIGHT,
          pointerEvents: "none",
          zIndex: 1000,
        }}
      >
        <path
          d={`M ${currentDrawingPath[0].x} ${
            currentDrawingPath[0].y
          } ${currentDrawingPath
            .slice(1)
            .map((p) => `L ${p.x} ${p.y}`)
            .join(" ")}`}
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1"
          fill="none"
        />

        <path
          d={d}
          stroke={pathInitiatorDancer?.color || "#fff"}
          strokeWidth="2"
          fill="none"
          strokeDasharray={previewPath.kind === "straight" ? "none" : "4,4"}
        />
      </svg>
    );
  };

  const renderMarqueeRectangle = () => {
    if (!isMarqueeSelecting) return null;
    const normMarquee = calculateNormalizedMarquee();
    if (normMarquee.width < 1 && normMarquee.height < 1) return null;
    return (
      <div
        className="marquee-selection-box"
        style={{
          position: "absolute",
          left: normMarquee.x + PADDING,
          top: normMarquee.y + PADDING,
          width: normMarquee.width,
          height: normMarquee.height,
        }}
      />
    );
  };

  const renderSetPathsDisplay = () => {
    if (
      activeGroupIndex === null ||
      !dancers ||
      dancers.length === 0 ||
      !formations ||
      !selectedDancerIds ||
      selectedDancerIds.size === 0
    )
      return null;

    const canCalculateActualPositions =
      getActualStartForFormation && getActualEndForFormation;

    if (activeGroupIndex >= formations.length) return null;

    const formationObject = formations[activeGroupIndex];
    if (
      !formationObject ||
      typeof formationObject !== "object" ||
      Array.isArray(formationObject)
    )
      return null;

    const pathElements = [];

    dancers.forEach((dancer) => {
      if (!selectedDancerIds.has(dancer.id)) return;

      const dancerData = formationObject[dancer.id];
      if (
        !dancerData ||
        !dancerData.rawStagePath ||
        dancerData.rawStagePath.length === 0
      )
        return;

      let actualStart;
      let rawPath = dancerData.rawStagePath;

      if (canCalculateActualPositions) {
        actualStart = getActualStartForFormation(dancer.id, activeGroupIndex);
      } else {
        actualStart = rawPath[0];
      }

      if (
        !actualStart ||
        typeof actualStart.x !== "number" ||
        typeof actualStart.y !== "number"
      )
        return;

      const drawnPathStart = rawPath[0];

      if (
        !drawnPathStart ||
        typeof drawnPathStart.x !== "number" ||
        typeof drawnPathStart.y !== "number"
      )
        return;

      const deltaX = canCalculateActualPositions
        ? actualStart.x - drawnPathStart.x
        : 0;
      const deltaY = canCalculateActualPositions
        ? actualStart.y - drawnPathStart.y
        : 0;

      const effectiveDisplayPath = rawPath.map((p) => ({
        x: p.x + deltaX,
        y: p.y + deltaY,
      }));

      if (effectiveDisplayPath.length === 0) return;

      const pathActualStartPoint = effectiveDisplayPath[0];
      const pathActualEndPoint =
        effectiveDisplayPath[effectiveDisplayPath.length - 1];

      if (effectiveDisplayPath.length === 1 || rawPath.length === 1) {
        pathElements.push(
          <g key={`${dancer.id}-setpathdisplay-holdmarker`}>
            <circle
              cx={pathActualStartPoint.x + DANCER_WIDTH / 2}
              cy={pathActualStartPoint.y + DANCER_HEIGHT / 2}
              r="8"
              fill={dancer.color || "#888"}
              opacity="0.3"
            />
            <text
              x={pathActualStartPoint.x + DANCER_WIDTH / 2}
              y={pathActualStartPoint.y + DANCER_HEIGHT / 2}
              dominantBaseline="middle"
              textAnchor="middle"
              fill="#FFF"
              fontSize="10px"
              opacity="0.7"
              style={{ pointerEvents: "none" }}
            >
              H
            </text>
          </g>
        );
        return;
      }

      if (
        Math.abs(pathActualStartPoint.x - pathActualEndPoint.x) < 1 &&
        Math.abs(pathActualStartPoint.y - pathActualEndPoint.y) < 1
      )
        return;

      let pathD = `M ${pathActualStartPoint.x + DANCER_WIDTH / 2} ${
        pathActualStartPoint.y + DANCER_HEIGHT / 2
      }`;

      for (let i = 1; i < effectiveDisplayPath.length; i++) {
        pathD += ` L ${effectiveDisplayPath[i].x + DANCER_WIDTH / 2} ${
          effectiveDisplayPath[i].y + DANCER_HEIGHT / 2
        }`;
      }

      pathElements.push(
        <g key={`${dancer.id}-setpathdisplay`}>
          <circle
            cx={pathActualStartPoint.x + DANCER_WIDTH / 2}
            cy={pathActualStartPoint.y + DANCER_HEIGHT / 2}
            r="8"
            fill={dancer.color || "#888"}
            opacity="0.4"
          />
          <text
            x={pathActualStartPoint.x + DANCER_WIDTH / 2}
            y={pathActualStartPoint.y + DANCER_HEIGHT / 2}
            dominantBaseline="middle"
            textAnchor="middle"
            fill="#FFF"
            fontSize="10px"
            opacity="0.9"
            style={{ pointerEvents: "none" }}
          >
            S
          </text>

          <path
            d={pathD}
            stroke={dancer.color || "#888"}
            strokeWidth="2"
            strokeDasharray="3,3"
            fill="none"
            opacity="0.8"
          />

          <circle
            cx={pathActualEndPoint.x + DANCER_WIDTH / 2}
            cy={pathActualEndPoint.y + DANCER_HEIGHT / 2}
            r="6"
            fill={dancer.color || "#888"}
            opacity="0.8"
          />
          <text
            x={pathActualEndPoint.x + DANCER_WIDTH / 2}
            y={pathActualEndPoint.y + DANCER_HEIGHT / 2}
            dominantBaseline="middle"
            textAnchor="middle"
            fill="#FFF"
            fontSize="9px"
            opacity="0.9"
            style={{ pointerEvents: "none" }}
          >
            E
          </text>
        </g>
      );
    });

    return pathElements;
  };

  const getFormationDisplayName = () => {
    const { index, isInTransition } = currentTimelineState || {
      index: null,
      isInTransition: false,
    };
    if (index === null || index < 0 || !customGroups || !customGroups[index]) {
      if (
        activeGroupIndex !== null &&
        customGroups &&
        customGroups[activeGroupIndex]
      ) {
        const selectedGroup = customGroups[activeGroupIndex];
        return `${
          selectedGroup.groupName || `Formation ${activeGroupIndex + 1}`
        } (Selected)`;
      }
      return "No Formation Active";
    }
    const group = customGroups[index];
    return `${group.groupName || `Formation ${index + 1}`}${
      isInTransition ? " (Transitioning...)" : ""
    }${index === activeGroupIndex ? " (Selected)" : ""}`;
  };

  /**
   * Filters out perpendicular wobble while preserving intentional direction changes
   */
  const shouldAddPoint = (newPoint, pathSoFar, minDistance = 5, wobbleThreshold = 3) => {
    if (pathSoFar.length === 0) return true;

    const last = pathSoFar[pathSoFar.length - 1];
    const distance = Math.hypot(newPoint.x - last.x, newPoint.y - last.y);

    if (distance < minDistance) return false;

    // If we have established direction, filter perpendicular wobble
    if (pathSoFar.length >= 2) {
      const prevLast = pathSoFar[pathSoFar.length - 2];

      const pathDx = last.x - prevLast.x;
      const pathDy = last.y - prevLast.y;
      const pathMag = Math.sqrt(pathDx * pathDx + pathDy * pathDy);

      if (pathMag > 1) {
        const newDx = newPoint.x - last.x;
        const newDy = newPoint.y - last.y;

        // Perpendicular distance using cross product
        const perpDist = Math.abs(pathDx * newDy - pathDy * newDx) / pathMag;

        if (perpDist < wobbleThreshold && distance < minDistance * 1.5) {
          return false;
        }
      }
    }

    return true;
  };

  const handlePointerMove = useCallback(
    (e) => {
      if (isPanning) {
        e.preventDefault();
        const dx = e.clientX - panStart.x;
        const dy = e.clientY - panStart.y;
        const newTx = panStart.tx + dx;
        const newTy = panStart.ty + dy;
        const clamped = clampTranslation(newTx, newTy, scale);
        setTx(clamped.tx);
        setTy(clamped.ty);
        return;
      }

      const coords = getStageCoords(e);
      if (!coords) return;

      if (isCurrentlyDrawingPath && stageMode === "draw") {
        e.preventDefault();
        setDrawingModifiers((prev) => ({
          ...prev,
          shiftKey: e.shiftKey,
          altKey: e.altKey,
          ctrlKey: e.ctrlKey || e.metaKey,
        }));

        const clampedPathPointX = Math.max(0, Math.min(coords.x, STAGE_WIDTH));
        const clampedPathPointY = Math.max(0, Math.min(coords.y, STAGE_HEIGHT));
        const clampedPathCoords = {
          x: clampedPathPointX,
          y: clampedPathPointY,
        };

        if (shouldAddPoint(clampedPathCoords, currentDrawingPath, 5, 3)) {
          setCurrentDrawingPath((prev) => [...prev, clampedPathCoords]);
        }
      } else if (isDraggingDancer && draggingDancer && stageMode === "select") {
        e.preventDefault();
        const rawNewX = coords.x - dragOffset.x;
        const rawNewY = coords.y - dragOffset.y;

        const clampedX = Math.max(
          0,
          Math.min(rawNewX, STAGE_WIDTH - DANCER_WIDTH)
        );
        const clampedY = Math.max(
          0,
          Math.min(rawNewY, STAGE_HEIGHT - DANCER_HEIGHT)
        );

        const deltaX = clampedX - dragStartPosition.x;
        const deltaY = clampedY - dragStartPosition.y;

        if (onUpdateDancerPosition) {
          onUpdateDancerPosition(draggingDancer.id, clampedX, clampedY);
        }

        if (activeGroupIndex !== null && originalPath && onUpdateFormation) {
          const translatedPath = originalPath.map((point) => ({
            x: point.x + deltaX,
            y: point.y + deltaY,
          }));

          const formationData = formations[activeGroupIndex];
          const updatedFormationData = {
            ...formationData,
            [draggingDancer.id]: {
              ...formationData[draggingDancer.id],
              rawStagePath: translatedPath,
            },
          };

          onUpdateFormation(activeGroupIndex, updatedFormationData);
        }
      } else if (isMarqueeSelecting && stageMode === "select") {
        e.preventDefault();
        setMarqueeCurrentCoords(coords);
        const normalizedMarquee = calculateNormalizedMarquee();
        const newSelection = new Set();
        dancers.forEach((dancer) => {
          const position = getDancerPosition(dancer.id);
          if (checkDancerInMarquee(position, normalizedMarquee)) {
            newSelection.add(dancer.id);
          }
        });
        if (onDancersSelected) onDancersSelected(newSelection);
      }
    },
    [
      isPanning,
      isCurrentlyDrawingPath,
      isDraggingDancer,
      isMarqueeSelecting,
      panStart,
      scale,
      stageMode,
      currentDrawingPath,
      draggingDancer,
      dragOffset,
      dragStartPosition,
      originalPath,
      dancers,
      clampTranslation,
      getStageCoords,
      getDancerPosition,
      onDancersSelected,
      onUpdateDancerPosition,
      onUpdateFormation,
      activeGroupIndex,
      formations,
      calculateNormalizedMarquee,
      checkDancerInMarquee,
    ]
  );

  return (
    <div className="stage-container">
      <div className="stage-controls">
        <div className="zoom-controls">
          <button className="zoom-btn" onClick={handleZoomOut} title="Zoom Out">
            −
          </button>
          <span className="zoom-level">{Math.round(scale * 100)}%</span>
          <button className="zoom-btn" onClick={handleZoomIn} title="Zoom In">
            +
          </button>
          <button
            className="zoom-btn reset"
            onClick={handleResetView}
            title="Reset View"
          >
            ⟲
          </button>
        </div>
        <div className="stage-mode-controls">
          <button
            className={`mode-btn ${stageMode === "select" ? "active" : ""}`}
            onClick={() => setStageMode("select")}
            title="Select Mode"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M0 2l7 0l3 3l0 4l-2 0l0-3l-2-2l0 9l2 0l0 2l-6 0l0-2l2 0l0-9l-4 0z" />
            </svg>
          </button>
          <button
            className={`mode-btn ${stageMode === "draw" ? "active" : ""}`}
            onClick={() => setStageMode("draw")}
            title="Draw Mode"
            disabled={!isStageInPathDrawingMode}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5L13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175l-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z" />
            </svg>
          </button>
        </div>
      </div>
      <div
        ref={viewportRef}
        className="stage-viewport"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{
          cursor: isPanning
            ? "grabbing"
            : stageMode === "draw" && isStageInPathDrawingMode
            ? "crosshair"
            : "grab",
        }}
      >
        <div
          ref={containerRef}
          className="stage-container-inner"
          style={{
            width: CONTAINER_WIDTH,
            height: CONTAINER_HEIGHT,
            transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
            transformOrigin: "0 0",
          }}
        >
          <div
            className="stage-background"
            style={{
              position: "absolute",
              top: PADDING,
              left: PADDING,
              width: STAGE_WIDTH,
              height: STAGE_HEIGHT,
            }}
          >
            <div className="stage-grid" />
          </div>

          <svg
            className="paths-display-svg"
            style={{
              position: "absolute",
              top: PADDING,
              left: PADDING,
              width: STAGE_WIDTH,
              height: STAGE_HEIGHT,
              pointerEvents: "none",
              zIndex: 1,
            }}
          >
            {renderSetPathsDisplay()}
          </svg>

          {renderPathPreview()}
          {renderMarqueeRectangle()}

          {dancers.map((dancer) => {
            const position = getDancerPosition(dancer.id);
            if (
              typeof position?.x !== "number" ||
              typeof position?.y !== "number"
            ) {
              return null;
            }
            const isSelected =
              selectedDancerIds && selectedDancerIds.has(dancer.id);
            return (
              <motion.div
                key={dancer.id}
                className={`dancer ${
                  pathInitiatorDancer?.id === dancer.id ? "path-active" : ""
                } ${isSelected ? "selected" : ""}`}
                style={{
                  position: "absolute",
                  left: PADDING,
                  top: PADDING,
                  cursor:
                    stageMode === "draw" &&
                    isStageInPathDrawingMode &&
                    activeGroupIndex !== null
                      ? "crosshair"
                      : stageMode === "select"
                      ? "pointer"
                      : "default",
                  touchAction: "none",
                  zIndex:
                    pathInitiatorDancer?.id === dancer.id
                      ? 10
                      : isSelected
                      ? 6
                      : 5,
                }}
                initial={false}
                animate={{ x: position.x, y: position.y }}
                transition={{ type: "tween", duration: 0.05, ease: "linear" }}
                onPointerDown={(e) => handleDancerMouseDown(e, dancer)}
              >
                <svg
                  width={DANCER_WIDTH}
                  height={DANCER_HEIGHT}
                  viewBox="0 0 20 20"
                >
                  {renderDancerShape(dancer)}
                </svg>
                <div className="dancer-name">{dancer.name}</div>
              </motion.div>
            );
          })}
          {dancers.length === 0 && (
            <div
              className="stage-placeholder"
              style={{
                left: PADDING + STAGE_WIDTH / 2,
                top: PADDING + STAGE_HEIGHT / 2,
              }}
            >
              <p>No dancers added</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default Stage;
