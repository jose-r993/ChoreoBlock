import React, { useRef, useState } from "react";
import { motion } from "motion/react";
import "../styles/Stage.scss";

const Stage = ({
  dancers,
  activeGroupIndex,
  customGroups,
  currentFormationIndex,
  isInTransition,
  getDancerPosition,
  onDrawPath,
  pathMode,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [activeDancer, setActiveDancer] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDrawingPath, setIsDrawingPath] = useState(false);
  const [currentPathDancer, setCurrentPathDancer] = useState(null);
  const [currentPath, setCurrentPath] = useState([]);

  const stageRef = useRef(null);

  const startDrag = (e, dancer) => {
    e.stopPropagation();
    if (!stageRef.current) return;

    if (isDrawingPath) {
      setCurrentPathDancer(dancer);

      const stageBounds = stageRef.current.getBoundingClientRect();
      const x = e.clientX - stageBounds.left;
      const y = e.clientY - stageBounds.top;

      setCurrentPath([{ x, y }]);
      return;
    }

    const stageBounds = stageRef.current.getBoundingClientRect();
    const dancerPosition = getDancerPosition(dancer.id);

    const offsetX = e.clientX - stageBounds.left - dancerPosition.x;
    const offsetY = e.clientY - stageBounds.top - dancerPosition.y;

    setIsDragging(true);
    setActiveDancer(dancer);
    setDragOffset({ x: offsetX, y: offsetY });
  };

  const handleDrag = (e) => {
    if (!stageRef.current) return;

    if (isDrawingPath && currentPathDancer) {
      const stageBounds = stageRef.current.getBoundingClientRect();
      const x = e.clientX - stageBounds.left;
      const y = e.clientY - stageBounds.top;

      if (e.buttons === 1) {
        const lastPoint = currentPath[currentPath.length - 1];
        const dx = x - lastPoint.x;
        const dy = y - lastPoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 5) {
          setCurrentPath((prev) => [...prev, { x, y }]);
        }
      }
      return;
    }

    if (!isDragging || !activeDancer) return;

    const stageBounds = stageRef.current.getBoundingClientRect();
    const x = Math.max(
      0,
      Math.min(stageBounds.width, e.clientX - stageBounds.left - dragOffset.x)
    );
    const y = Math.max(
      0,
      Math.min(stageBounds.height, e.clientY - stageBounds.top - dragOffset.y)
    );
  };

  const endDrag = () => {
    if (isDrawingPath && currentPathDancer && currentPath.length > 1) {
      onDrawPath(currentPathDancer.id, currentPath, pathMode);

      setCurrentPath([]);
      setCurrentPathDancer(null);
    }

    setIsDragging(false);
    setActiveDancer(null);
  };

  const togglePathDrawing = () => {
    setIsDrawingPath(!isDrawingPath);
    setCurrentPath([]);
    setCurrentPathDancer(null);
  };

  const renderDancerShape = (dancer) => {
    switch (dancer.shape) {
      case "circle":
        return <circle cx="10" cy="10" r="10" fill={dancer.color} />;
      case "triangle":
        return <polygon points="10,0 20,20 0,20" fill={dancer.color} />;
      case "square":
        return <rect x="0" y="0" width="20" height="20" fill={dancer.color} />;
      default:
        return null;
    }
  };

  const renderPathPreview = () => {
    if (!isDrawingPath || currentPath.length < 2) return null;

    let pathData = "";

    pathData = `M ${currentPath[0].x} ${currentPath[0].y}`;
    for (let i = 1; i < currentPath.length; i++) {
      pathData += ` L ${currentPath[i].x} ${currentPath[i].y}`;
    }

    return (
      <svg className="path-preview">
        <path
          d={pathData}
          stroke={currentPathDancer?.color || "#fff"}
          strokeWidth="2"
          fill="none"
          strokeDasharray="5,5"
        />

        {currentPath.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r={3}
            fill={
              index === 0
                ? "#0f0"
                : index === currentPath.length - 1
                ? "#f00"
                : "#fff"
            }
          />
        ))}
      </svg>
    );
  };

  const getFormationDisplayName = () => {
    if (currentFormationIndex === null) {
      return "No formation selected";
    }

    const group = customGroups[currentFormationIndex];
    if (!group) return "Unknown formation";

    return `${group.groupName || `Group ${currentFormationIndex + 1}`}${
      isInTransition ? " (Transitioning)" : ""
    }`;
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
        onMouseLeave={endDrag}
      >
        <div className="stage-grid"></div>
        {renderPathPreview()}

        {dancers.map((dancer) => {
          const position = getDancerPosition(dancer.id);

          return (
            <motion.div
              key={dancer.id}
              className={`dancer ${
                currentPathDancer?.id === dancer.id ? "path-active" : ""
              }`}
              style={{
                cursor: isDrawingPath
                  ? "crosshair"
                  : isDragging && activeDancer?.id === dancer.id
                  ? "grabbing"
                  : "grab",
              }}
              initial={false}
              animate={{
                x: position.x,
                y: position.y,
              }}
              transition={{
                type: "spring",
                stiffness: 120,
                damping: 15,
                mass: 1,
              }}
              onMouseDown={(e) => startDrag(e, dancer)}
            >
              <svg width="24" height="24" viewBox="0 0 20 20">
                {renderDancerShape(dancer)}
              </svg>
              <div className="dancer-name">{dancer.name}</div>
            </motion.div>
          );
        })}

        {dancers.length === 0 ? (
          <div className="stage-placeholder">
            <p>No dancers added</p>
            <p className="hint">Add dancers using the Dancers tab</p>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default Stage;
