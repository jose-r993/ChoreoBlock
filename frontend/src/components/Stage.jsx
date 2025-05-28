import React, { useRef, useState, useCallback, useEffect } from "react";
import { motion } from "motion/react";
import { derivePathFromGesture } from "./pathDetectionHelpers";
import "../styles/Stage.scss";

const DANCER_WIDTH = 24;
const DANCER_HEIGHT = 24;

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

  const [isMarqueeSelecting, setIsMarqueeSelecting] = useState(false);
  const [marqueeStartCoords, setMarqueeStartCoords] = useState({ x: 0, y: 0 });
  const [marqueeCurrentCoords, setMarqueeCurrentCoords] = useState({
    x: 0,
    y: 0,
  });

  const stageRef = useRef(null);

  const getStageCoords = useCallback((e) => {
    if (!stageRef.current) return null;
    const stageBounds = stageRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - stageBounds.left, y: clientY - stageBounds.top };
  }, []);

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

  const handleStageMouseDown = useCallback(
    (e) => {
      const coords = getStageCoords(e);
      if (!coords) return;

      if (e.target === stageRef.current && stageMode === "select") {
        e.preventDefault();
        setIsMarqueeSelecting(true);
        setMarqueeStartCoords(coords);
        setMarqueeCurrentCoords(coords);
        if (onDancersSelected) onDancersSelected(new Set());
      }
    },
    [getStageCoords, onDancersSelected, stageMode]
  );

  const handleDancerMouseDown = useCallback(
    (e, dancer) => {
      e.stopPropagation();
      const coords = getStageCoords(e);
      if (!coords) return;
      e.preventDefault();

      const startPos = getDancerPosition(dancer.id);

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
        setCurrentDrawingPath(startPos ? [startPos] : [coords]);
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
        const dancerPos = getDancerPosition(dancer.id);
        setDragOffset({
          x: coords.x - dancerPos.x,
          y: coords.y - dancerPos.y,
        });
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
    ]
  );

  const handleDocumentMouseMove = useCallback(
    (e) => {
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

        if (currentDrawingPath.length > 0) {
          const last = currentDrawingPath[currentDrawingPath.length - 1];
          if (Math.hypot(coords.x - last.x, coords.y - last.y) > 5) {
            setCurrentDrawingPath((prev) => [...prev, coords]);
          }
        }
      } else if (isDraggingDancer && draggingDancer && stageMode === "select") {
        e.preventDefault();
        const newX = coords.x - dragOffset.x;
        const newY = coords.y - dragOffset.y;

        if (onUpdateDancerPosition) {
          onUpdateDancerPosition(draggingDancer.id, newX, newY);
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
      isCurrentlyDrawingPath,
      isDraggingDancer,
      isMarqueeSelecting,
      currentDrawingPath,
      getStageCoords,
      calculateNormalizedMarquee,
      dancers,
      getDancerPosition,
      checkDancerInMarquee,
      onDancersSelected,
      stageMode,
      draggingDancer,
      dragOffset,
      onUpdateDancerPosition,
    ]
  );

  const handleDocumentMouseUp = useCallback(
    (e) => {
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
          straightThreshold: 3 * (window.devicePixelRatio || 1),
          axisLockThreshold: 10,
          simplifyEpsilon: 6,
          smoothingIterations: 2,
        });

        if (onSavePath) {
          onSavePath(
            pathInitiatorDancer.id,
            processedPath.points,
            processedPath.kind,
            processedPath.subKind
          );
        }

        setIsCurrentlyDrawingPath(false);
        setCurrentDrawingPath([]);
        setPathInitiatorDancer(null);
        setDrawingModifiers({ shiftKey: false, altKey: false, ctrlKey: false });
        return;
      }

      if (isDraggingDancer) {
        setIsDraggingDancer(false);
        setDraggingDancer(null);
        setDragOffset({ x: 0, y: 0 });
      }

      if (isMarqueeSelecting) {
        setIsMarqueeSelecting(false);
        setMarqueeStartCoords({ x: 0, y: 0 });
        setMarqueeCurrentCoords({ x: 0, y: 0 });
      }
    },
    [
      isCurrentlyDrawingPath,
      isDraggingDancer,
      isMarqueeSelecting,
      pathInitiatorDancer,
      currentDrawingPath,
      onSavePath,
      pathMode,
      drawingModifiers,
      stageMode,
    ]
  );

  useEffect(() => {
    document.addEventListener("mousemove", handleDocumentMouseMove);
    document.addEventListener("mouseup", handleDocumentMouseUp);
    document.addEventListener("touchmove", handleDocumentMouseMove, {
      passive: false,
    });
    document.addEventListener("touchend", handleDocumentMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleDocumentMouseMove);
      document.removeEventListener("mouseup", handleDocumentMouseUp);
      document.removeEventListener("touchmove", handleDocumentMouseMove);
      document.removeEventListener("touchend", handleDocumentMouseUp);
    };
  }, [handleDocumentMouseMove, handleDocumentMouseUp]);

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
      straightThreshold: 3 * (window.devicePixelRatio || 1),
      axisLockThreshold: 10,
      simplifyEpsilon: 6,
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
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
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

        {previewPath.kind === "straight" && previewPath.subKind && (
          <text
            x={previewPath.points[0].x + 10}
            y={previewPath.points[0].y - 10}
            fill="#fff"
            fontSize="12"
            opacity="0.8"
          >
            {previewPath.subKind === "vertical" ? "↕" : "↔"}
          </text>
        )}
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
          left: normMarquee.x,
          top: normMarquee.y,
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

  return (
    <div className="stage-container">
      <div className="stage-header">
        <h2>Choreography Stage</h2>
        <div className="stage-info">{getFormationDisplayName()}</div>
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
        ref={stageRef}
        className={`stage-area ${
          stageMode === "draw" && isStageInPathDrawingMode ? "drawing-mode" : ""
        }`}
        onMouseDown={handleStageMouseDown}
        onTouchStart={handleStageMouseDown}
      >
        <div className="stage-grid" />

        <svg
          className="paths-display-svg"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
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
                left: 0,
                top: 0,
                cursor:
                  stageMode === "draw" &&
                  isStageInPathDrawingMode &&
                  activeGroupIndex !== null
                    ? "crosshair"
                    : stageMode === "select"
                    ? "grab"
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
              onMouseDown={(e) => handleDancerMouseDown(e, dancer)}
              onTouchStart={(e) => handleDancerMouseDown(e, dancer)}
              onDragStart={(e) => e.preventDefault()}
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
          <div className="stage-placeholder">
            <p>No dancers added</p>
          </div>
        )}
      </div>
    </div>
  );
};
export default Stage;
