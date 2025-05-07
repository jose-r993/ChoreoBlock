import React, { useRef, useState, useCallback } from "react";
import { motion } from "motion/react";
import "../styles/Stage.scss";

const Stage = ({
  dancers = [],
  activeGroupIndex,
  customGroups = [],
  currentTimelineState,
  getDancerPosition,
  onSetDancerPosition,
  onSavePath,
  pathMode,
}) => {
  const [isDraggingDancer, setIsDraggingDancer] = useState(false);
  const [activeDragDancer, setActiveDragDancer] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const [isDrawingPath, setIsDrawingPath] = useState(false);
  const [currentPathDancer, setCurrentPathDancer] = useState(null);
  const [currentPath, setCurrentPath] = useState([]);

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

  const startDrag = useCallback(
    (e, dancer) => {
      e.stopPropagation();
      const coords = getStageCoords(e);
      if (!coords) return;

      if (isDrawingPath) {
        if (activeGroupIndex !== null && activeGroupIndex >= 0) {
          const startPos = getDancerPosition(dancer.id);
          setCurrentPathDancer(dancer);
          setCurrentPath([startPos]);
          e.preventDefault();
        } else {
          console.warn("Cannot draw path: No formation selected.");
        }
      } else {
        if (activeGroupIndex !== null) {
          const currentPosition = getDancerPosition(dancer.id);
          const offsetX = coords.x - currentPosition.x;
          const offsetY = coords.y - currentPosition.y;
          setIsDraggingDancer(true);
          setActiveDragDancer(dancer);
          setDragOffset({ x: offsetX, y: offsetY });
          e.preventDefault();
        } else {
          console.warn("Cannot set static position: No formation selected.");
        }
      }
    },
    [isDrawingPath, getStageCoords, getDancerPosition, activeGroupIndex]
  );

  const handleDrag = useCallback(
    (e) => {
      if (!stageRef.current) return;
      const isMouseEventWithButton = e.buttons === 1;
      const isTouchEvent = e.type === "touchmove";
      if (!isMouseEventWithButton && !isTouchEvent) return;

      const coords = getStageCoords(e);
      if (!coords) return;
      e.preventDefault();

      if (isDrawingPath && currentPathDancer && currentPath.length > 0) {
        const lastPoint = currentPath[currentPath.length - 1];
        const dx = coords.x - lastPoint.x;
        const dy = coords.y - lastPoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > 5) {
          setCurrentPath((prev) => [...prev, coords]);
        }
      } else if (isDraggingDancer && activeDragDancer) {
        // no-op
      }
    },
    [
      isDrawingPath,
      currentPathDancer,
      currentPath,
      isDraggingDancer,
      activeDragDancer,
      getStageCoords,
    ]
  );

  const endDrag = useCallback(
    (e) => {
      if (isDrawingPath && currentPathDancer && currentPath.length > 1) {
        if (activeGroupIndex !== null) {
          onSavePath(currentPathDancer.id, currentPath, activeGroupIndex);
        }
        setCurrentPath([]);
        setCurrentPathDancer(null);
      } else if (isDraggingDancer && activeDragDancer) {
        const coords = getStageCoords(e);
        if (coords && activeGroupIndex !== null && stageRef.current) {
          const stageWidth = stageRef.current.clientWidth;
          const stageHeight = stageRef.current.clientHeight;
          const dancerWidth = 24;
          const dancerHeight = 24;
          const finalX = Math.max(
            0,
            Math.min(stageWidth - dancerWidth, coords.x - dragOffset.x)
          );
          const finalY = Math.max(
            0,
            Math.min(stageHeight - dancerHeight, coords.y - dragOffset.y)
          );
          onSetDancerPosition(
            activeDragDancer.id,
            finalX,
            finalY,
            activeGroupIndex
          );
        }
        setIsDraggingDancer(false);
        setActiveDragDancer(null);
      }

      if (isDrawingPath && currentPath.length <= 1) setCurrentPath([]);
      if (currentPathDancer) setCurrentPathDancer(null);
      if (isDraggingDancer) setIsDraggingDancer(false);
      if (activeDragDancer) setActiveDragDancer(null);
    },
    [
      isDrawingPath,
      currentPathDancer,
      currentPath,
      onSavePath,
      activeGroupIndex,
      isDraggingDancer,
      activeDragDancer,
      dragOffset,
      onSetDancerPosition,
      getStageCoords,
    ]
  );

  const handleMouseLeave = useCallback(() => {
    if (isDraggingDancer || (isDrawingPath && currentPath.length > 0)) {
      setIsDraggingDancer(false);
      setActiveDragDancer(null);
      setCurrentPath([]);
      setCurrentPathDancer(null);
    }
  }, [isDraggingDancer, isDrawingPath, currentPath.length]);

  const togglePathDrawing = useCallback(() => {
    setIsDrawingPath((prev) => {
      const nextState = !prev;
      setCurrentPath([]);
      setCurrentPathDancer(null);
      setIsDraggingDancer(false);
      setActiveDragDancer(null);
      return nextState;
    });
  }, []);

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
    if (!isDrawingPath || !currentPathDancer || currentPath.length < 1)
      return null;
    let pathData = `M ${currentPath[0].x} ${currentPath[0].y}`;
    for (let i = 1; i < currentPath.length; i++) {
      pathData += ` L ${currentPath[i].x} ${currentPath[i].y}`;
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
          stroke={currentPathDancer?.color || "#fff"}
          strokeWidth="2"
          fill="none"
          strokeDasharray="4,4"
        />
      </svg>
    );
  };

  const getFormationDisplayName = () => {
    const { index, isInTransition } = currentTimelineState || {
      index: null,
      isInTransition: false,
    };

    if (index === null || index < 0 || !customGroups || !customGroups[index]) {
      if (activeGroupIndex !== null && customGroups[activeGroupIndex]) {
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
            className={`path-toggle ${isDrawingPath ? "active" : ""}`}
            onClick={togglePathDrawing}
            title={
              isDrawingPath ? "Cancel Path Drawing" : "Enable Path Drawing"
            }
            disabled={activeGroupIndex === null}
          >
            {isDrawingPath ? "Cancel Path" : "Draw Path"}
          </button>
        </div>
      </div>

      <div
        ref={stageRef}
        className={`stage-area ${isDrawingPath ? "drawing-mode" : ""}`}
        onMouseMove={handleDrag}
        onMouseUp={endDrag}
        onMouseLeave={handleMouseLeave}
        onTouchMove={handleDrag}
        onTouchEnd={endDrag}
      >
        <div className="stage-grid" />
        {renderPathPreview()}

        {dancers.map((dancer) => {
          const position = getDancerPosition(dancer.id);
          const isSelectedDancerDragging =
            isDraggingDancer && activeDragDancer?.id === dancer.id;
          const isSelectedDancerPathing =
            isDrawingPath && currentPathDancer?.id === dancer.id;

          return (
            <motion.div
              key={dancer.id}
              className={`dancer ${
                isSelectedDancerPathing ? "path-active" : ""
              }`}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                cursor:
                  isDrawingPath && activeGroupIndex !== null
                    ? "crosshair"
                    : isSelectedDancerDragging
                    ? "grabbing"
                    : activeGroupIndex !== null
                    ? "grab"
                    : "default",
                touchAction: "none",
                zIndex: isSelectedDancerDragging ? 10 : 5,
                userSelect: "none",
                WebkitUserSelect: "none",
                MozUserSelect: "none",
              }}
              initial={false}
              animate={{ x: position?.x ?? 200, y: position?.y ?? 200 }}
              transition={{ type: "tween", duration: 0.05, ease: "linear" }}
              onMouseDown={(e) => startDrag(e, dancer)}
              onTouchStart={(e) => startDrag(e, dancer)}
              onDragStart={(e) => e.preventDefault()}
            >
              <svg width="24" height="24" viewBox="0 0 20 20">
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
