import React, { useRef, useState, useCallback, useEffect } from "react";
import { motion } from "motion/react";
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
  selectedDancerIds,
  onDancersSelected,
}) => {
  const [isDraggingDancerOnly, setIsDraggingDancerOnly] = useState(false);
  const [activeDragDancer, setActiveDragDancer] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const [isDrawingPathModeActive, setIsDrawingPathModeActive] = useState(false);
  const [isCurrentlyDrawingPath, setIsCurrentlyDrawingPath] = useState(false);
  const [pathInitiatorDancer, setPathInitiatorDancer] = useState(null);
  const [currentDrawingPath, setCurrentDrawingPath] = useState([]);

  const [isMarqueeSelecting, setIsMarqueeSelecting] = useState(false);
  const [marqueeRect, setMarqueeRect] = useState({
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  });

  const stageRef = useRef(null);

  const getStageCoords = useCallback((e) => {
    if (!stageRef.current) return null;
    const stageBounds = stageRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - stageBounds.left,
      y: clientY - stageBounds.top,
    };
  }, []);

  const calculateNormalizedMarquee = useCallback(() => {
    const x1 = Math.min(marqueeRect.startX, marqueeRect.currentX);
    const y1 = Math.min(marqueeRect.startY, marqueeRect.currentY);
    const x2 = Math.max(marqueeRect.startX, marqueeRect.currentX);
    const y2 = Math.max(marqueeRect.startY, marqueeRect.currentY);
    return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
  }, [marqueeRect]);

  const checkDancerInMarquee = useCallback((dancerPos, normalizedMarquee) => {
    if (!dancerPos || !normalizedMarquee) return false;
    const dancerRight = dancerPos.x + DANCER_WIDTH;
    const dancerBottom = dancerPos.y + DANCER_HEIGHT;
    const marqueeRight = normalizedMarquee.x + normalizedMarquee.width;
    const marqueeBottom = normalizedMarquee.y + normalizedMarquee.height;

    return (
      dancerPos.x < marqueeRight &&
      dancerRight > normalizedMarquee.x &&
      dancerPos.y < marqueeBottom &&
      dancerBottom > normalizedMarquee.y
    );
  }, []);

  const handleStageInteractionStart = useCallback(
    (e) => {
      if (
        e.target !== stageRef.current ||
        isDrawingPathModeActive ||
        activeGroupIndex === null
      ) {
        return;
      }
      e.preventDefault();
      const coords = getStageCoords(e);
      if (!coords) return;
      setIsMarqueeSelecting(true);
      setMarqueeRect({
        startX: coords.x,
        startY: coords.y,
        currentX: coords.x,
        currentY: coords.y,
      });
      if (onDancersSelected) {
        onDancersSelected(new Set());
      }
    },
    [
      isDrawingPathModeActive,
      activeGroupIndex,
      getStageCoords,
      onDancersSelected,
    ]
  );

  const handleInteractionMove = useCallback(
    (e) => {
      if (
        !isMarqueeSelecting &&
        !isDraggingDancerOnly &&
        !isCurrentlyDrawingPath
      )
        return;

      const coords = getStageCoords(e);
      if (!coords) return;

      if (isMarqueeSelecting) {
        setMarqueeRect((prev) => ({
          ...prev,
          currentX: coords.x,
          currentY: coords.y,
        }));
        const liveMarquee = {
          x: Math.min(marqueeRect.startX, coords.x),
          y: Math.min(marqueeRect.startY, coords.y),
          width: Math.abs(marqueeRect.startX - coords.x),
          height: Math.abs(marqueeRect.startY - coords.y),
        };
        const newlySelectedIds = new Set();
        dancers.forEach((dancer) => {
          const pos = getDancerPosition(dancer.id);
          if (pos && checkDancerInMarquee(pos, liveMarquee)) {
            newlySelectedIds.add(dancer.id);
          }
        });
        if (onDancersSelected) {
          onDancersSelected(newlySelectedIds);
        }
      } else if (
        isCurrentlyDrawingPath &&
        pathInitiatorDancer &&
        currentDrawingPath.length > 0
      ) {
        const lastPoint = currentDrawingPath[currentDrawingPath.length - 1];
        const dx = coords.x - lastPoint.x;
        const dy = coords.y - lastPoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > 5) {
          setCurrentDrawingPath((prev) => [...prev, coords]);
        }
      } else if (isDraggingDancerOnly && activeDragDancer) {
        // Handled by document event listener if needed for live update, but position set on end.
      }
    },
    [
      isMarqueeSelecting,
      isDraggingDancerOnly,
      isCurrentlyDrawingPath,
      getStageCoords,
      dancers,
      getDancerPosition,
      checkDancerInMarquee,
      onDancersSelected,
      pathInitiatorDancer,
      currentDrawingPath,
      marqueeRect.startX,
      marqueeRect.startY,
    ]
  );

  const handleInteractionEnd = useCallback(
    (e) => {
      if (isMarqueeSelecting) {
        setIsMarqueeSelecting(false);
        const finalNormalizedMarquee = calculateNormalizedMarquee();
        const finalSelectedIds = new Set();
        dancers.forEach((dancer) => {
          const pos = getDancerPosition(dancer.id);
          if (pos && checkDancerInMarquee(pos, finalNormalizedMarquee)) {
            finalSelectedIds.add(dancer.id);
          }
        });
        if (onDancersSelected) {
          onDancersSelected(finalSelectedIds);
        }
      } else if (
        isCurrentlyDrawingPath &&
        pathInitiatorDancer &&
        currentDrawingPath.length > 0
      ) {
        if (activeGroupIndex !== null && onSavePath) {
          onSavePath(pathInitiatorDancer.id, currentDrawingPath, pathMode);
        }
        setCurrentDrawingPath([]);
        setPathInitiatorDancer(null);
        setIsCurrentlyDrawingPath(false);
      } else if (isDraggingDancerOnly && activeDragDancer) {
        const coords = getStageCoords(e);
        if (
          coords &&
          activeGroupIndex !== null &&
          stageRef.current &&
          onSetDancerPosition
        ) {
          const stageWidth = stageRef.current.clientWidth;
          const stageHeight = stageRef.current.clientHeight;
          const finalX = Math.max(
            0,
            Math.min(stageWidth - DANCER_WIDTH, coords.x - dragOffset.x)
          );
          const finalY = Math.max(
            0,
            Math.min(stageHeight - DANCER_HEIGHT, coords.y - dragOffset.y)
          );
          onSetDancerPosition(
            activeDragDancer.id,
            finalX,
            finalY,
            activeGroupIndex
          );
        }
        setIsDraggingDancerOnly(false);
        setActiveDragDancer(null);
      }

      if (isCurrentlyDrawingPath) setIsCurrentlyDrawingPath(false);
      if (pathInitiatorDancer) setPathInitiatorDancer(null);
      if (currentDrawingPath.length > 0) setCurrentDrawingPath([]);
      if (isDraggingDancerOnly) setIsDraggingDancerOnly(false);
      if (activeDragDancer) setActiveDragDancer(null);
    },
    [
      isMarqueeSelecting,
      isCurrentlyDrawingPath,
      pathInitiatorDancer,
      currentDrawingPath,
      activeGroupIndex,
      onSavePath,
      pathMode,
      isDraggingDancerOnly,
      activeDragDancer,
      getStageCoords,
      dragOffset,
      onSetDancerPosition,
      calculateNormalizedMarquee,
      dancers,
      getDancerPosition,
      checkDancerInMarquee,
      onDancersSelected,
    ]
  );

  const handleDancerInteractionStart = useCallback(
    (e, dancer) => {
      if (isMarqueeSelecting) return;
      e.stopPropagation();
      const coords = getStageCoords(e);
      if (!coords) return;

      if (isDrawingPathModeActive) {
        if (activeGroupIndex !== null) {
          const startPos = getDancerPosition(dancer.id);
          setPathInitiatorDancer(dancer);
          setCurrentDrawingPath(startPos ? [startPos] : [coords]);
          setIsCurrentlyDrawingPath(true);
          e.preventDefault();
        }
      } else {
        if (activeGroupIndex !== null) {
          const currentPosition = getDancerPosition(dancer.id);
          const offsetX = currentPosition ? coords.x - currentPosition.x : 0;
          const offsetY = currentPosition ? coords.y - currentPosition.y : 0;
          setIsDraggingDancerOnly(true);
          setActiveDragDancer(dancer);
          setDragOffset({ x: offsetX, y: offsetY });
          e.preventDefault();
        }
      }
    },
    [
      isDrawingPathModeActive,
      activeGroupIndex,
      getDancerPosition,
      getStageCoords,
      isMarqueeSelecting,
    ]
  );

  useEffect(() => {
    const eventTarget = document;

    const handleMove = (e) => {
      if (
        isMarqueeSelecting ||
        isDraggingDancerOnly ||
        isCurrentlyDrawingPath
      ) {
        handleInteractionMove(e);
      }
    };
    const handleEnd = (e) => {
      if (
        isMarqueeSelecting ||
        isDraggingDancerOnly ||
        isCurrentlyDrawingPath
      ) {
        handleInteractionEnd(e);
      }
    };

    eventTarget.addEventListener("mousemove", handleMove);
    eventTarget.addEventListener("mouseup", handleEnd);
    eventTarget.addEventListener("touchmove", handleMove, { passive: false });
    eventTarget.addEventListener("touchend", handleEnd);

    return () => {
      eventTarget.removeEventListener("mousemove", handleMove);
      eventTarget.removeEventListener("mouseup", handleEnd);
      eventTarget.removeEventListener("touchmove", handleMove);
      eventTarget.removeEventListener("touchend", handleEnd);
    };
  }, [
    isMarqueeSelecting,
    isDraggingDancerOnly,
    isCurrentlyDrawingPath,
    handleInteractionMove,
    handleInteractionEnd,
  ]);

  const togglePathDrawingMode = useCallback(() => {
    setIsDrawingPathModeActive((prev) => {
      const nextState = !prev;
      setCurrentDrawingPath([]);
      setPathInitiatorDancer(null);
      setIsCurrentlyDrawingPath(false);
      setIsDraggingDancerOnly(false);
      setActiveDragDancer(null);
      setIsMarqueeSelecting(false);
      if (!nextState && onDancersSelected) {
      }
      return nextState;
    });
  }, [onDancersSelected]);

  const renderDancerShape = (dancer) => {
    const color = dancer.color || "#cccccc";
    switch (dancer.shape) {
      case "triangle":
        return <polygon points="10,0 20,20 0,20" fill={color} />;
      case "square":
        return <rect x="0" y="0" width="20" height="20" fill={color} />;
      case "circle":
      default:
        return <circle cx="10" cy="10" r="10" fill={color} />;
    }
  };

  const renderPathPreview = () => {
    if (
      !isCurrentlyDrawingPath ||
      !pathInitiatorDancer ||
      currentDrawingPath.length < 1
    )
      return null;
    let pathData = `M ${currentDrawingPath[0].x} ${currentDrawingPath[0].y}`;
    for (let i = 1; i < currentDrawingPath.length; i++) {
      pathData += ` L ${currentDrawingPath[i].x} ${currentDrawingPath[i].y}`;
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
          zIndex: 1,
        }}
      >
        <path
          d={pathData}
          stroke={pathInitiatorDancer?.color || "#fff"}
          strokeWidth="2"
          fill="none"
          strokeDasharray="4,4"
        />
      </svg>
    );
  };

  const renderMarqueeRectangle = () => {
    if (!isMarqueeSelecting) return null;
    const normMarquee = calculateNormalizedMarquee();
    if (normMarquee.width === 0 && normMarquee.height === 0) return null;
    return (
      <div
        className="marquee-selection-box"
        style={{
          position: "absolute",
          left: normMarquee.x,
          top: normMarquee.y,
          width: normMarquee.width,
          height: normMarquee.height,
          border: "1px dashed #007bff",
          backgroundColor: "rgba(0, 123, 255, 0.2)",
          pointerEvents: "none",
          zIndex: 1000,
        }}
      />
    );
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
    const groupNumber = index + 1;
    const status = isInTransition ? " (Transitioning...)" : "";
    const selectedIndicator = index === activeGroupIndex ? " (Selected)" : "";
    return `${
      group.groupName || `Formation ${groupNumber}`
    }${status}${selectedIndicator}`;
  };

  return (
    <div className="stage-container">
      <div className="stage-header">
        <h2>Choreography Stage</h2>
        <div className="stage-info">{getFormationDisplayName()}</div>
        <div className="stage-actions">
          <button
            className={`path-toggle ${isDrawingPathModeActive ? "active" : ""}`}
            onClick={togglePathDrawingMode}
            title={
              isDrawingPathModeActive
                ? "Cancel Path Drawing"
                : "Enable Path Drawing"
            }
            disabled={activeGroupIndex === null}
          >
            {isDrawingPathModeActive ? "Cancel Path" : "Draw Path"}
          </button>
        </div>
      </div>

      <div
        ref={stageRef}
        className={`stage-area ${
          isDrawingPathModeActive && !isMarqueeSelecting ? "drawing-mode" : ""
        } ${isMarqueeSelecting ? "marquee-active" : ""}`}
        onMouseDown={handleStageInteractionStart}
        onTouchStart={handleStageInteractionStart}
      >
        <div className="stage-grid" />
        {renderPathPreview()}
        {renderMarqueeRectangle()}

        {dancers.map((dancer) => {
          const position = getDancerPosition(dancer.id);
          const isSelectedByMarquee =
            selectedDancerIds && selectedDancerIds.has(dancer.id);

          return (
            <motion.div
              key={dancer.id}
              className={`dancer ${
                isCurrentlyDrawingPath && pathInitiatorDancer?.id === dancer.id
                  ? "path-active"
                  : ""
              } ${isSelectedByMarquee ? "selected-by-marquee" : ""}`}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                cursor:
                  isDrawingPathModeActive &&
                  activeGroupIndex !== null &&
                  !isMarqueeSelecting &&
                  !isDraggingDancerOnly
                    ? "crosshair"
                    : isDraggingDancerOnly && activeDragDancer?.id === dancer.id
                    ? "grabbing"
                    : activeGroupIndex !== null &&
                      !isMarqueeSelecting &&
                      !isDrawingPathModeActive
                    ? "grab"
                    : "default",
                touchAction: "none",
                zIndex:
                  (isDraggingDancerOnly &&
                    activeDragDancer?.id === dancer.id) ||
                  (isCurrentlyDrawingPath &&
                    pathInitiatorDancer?.id === dancer.id)
                    ? 10
                    : isSelectedByMarquee
                    ? 6
                    : 5,
                userSelect: "none",
                WebkitUserSelect: "none",
                MozUserSelect: "none",
              }}
              initial={false}
              animate={{ x: position?.x ?? 200, y: position?.y ?? 200 }}
              transition={{ type: "tween", duration: 0.05, ease: "linear" }}
              onMouseDown={(e) => handleDancerInteractionStart(e, dancer)}
              onTouchStart={(e) => handleDancerInteractionStart(e, dancer)}
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
            <p className="hint">
              Add dancers using the Dancers tab in the Sidebar
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Stage;
