import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import "../styles/Stage.scss";

const Stage = ({
  dancers,
  activeGroupIndex,
  formations,
  onUpdateFormation,
  currentTime,
  beatTimestamps = [],
  customGroups = [],
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [activeDancer, setActiveDancer] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [currentFormationIndex, setCurrentFormationIndex] =
    useState(activeGroupIndex);
  const [isDrawingPath, setIsDrawingPath] = useState(false);
  const [currentPathDancer, setCurrentPathDancer] = useState(null);
  const [currentPath, setCurrentPath] = useState([]);
  const [pathMode, setPathMode] = useState("curved");
  const [transitionBeats, setTransitionBeats] = useState(4); // Default transition period
  const [transitionEasing, setTransitionEasing] = useState("linear"); // Global transition easing

  // Store dancer-specific transition types
  const [dancerTransitions, setDancerTransitions] = useState({});

  const stageRef = useRef(null);
  const prevFormationsRef = useRef({});
  const lastKnownPositions = useRef({});
  const transitionProgressRef = useRef(0);
  const isInTransitionRef = useRef(false);

  // Calculate transition state and progress
  useEffect(() => {
    if (
      !beatTimestamps.length ||
      !customGroups.length ||
      currentFormationIndex === null
    )
      return;

    const currentGroup = customGroups[currentFormationIndex];
    if (!currentGroup) return;

    const startBeatIndex = currentGroup.startBeat;
    const endBeatIndex = startBeatIndex + currentGroup.groupLength;

    // Calculate transition end beat - we'll transition during the first N beats
    const transitionEndBeatIndex = Math.min(
      startBeatIndex + transitionBeats,
      endBeatIndex
    );

    if (startBeatIndex >= beatTimestamps.length) return;

    const startTime = beatTimestamps[startBeatIndex];
    const transitionEndTime =
      beatTimestamps[
        Math.min(transitionEndBeatIndex, beatTimestamps.length - 1)
      ];
    const endTime =
      endBeatIndex < beatTimestamps.length
        ? beatTimestamps[endBeatIndex]
        : beatTimestamps[beatTimestamps.length - 1] + 1;

    // Check if we're in the transition period
    isInTransitionRef.current =
      currentTime >= startTime && currentTime < transitionEndTime;

    // Calculate appropriate progress
    if (isInTransitionRef.current) {
      // During transition: progress from 0 to 1 across transition period
      transitionProgressRef.current = Math.max(
        0,
        Math.min(1, (currentTime - startTime) / (transitionEndTime - startTime))
      );
    } else {
      // After transition: stay at 1
      transitionProgressRef.current = 1;
    }
  }, [
    currentTime,
    beatTimestamps,
    customGroups,
    currentFormationIndex,
    transitionBeats,
  ]);

  // Update current formation index based on playback time
  useEffect(() => {
    if (!beatTimestamps.length || !customGroups.length) return;

    let foundFormation = false;

    for (let i = 0; i < customGroups.length; i++) {
      const group = customGroups[i];
      const startBeatIndex = group.startBeat;
      const endBeatIndex = startBeatIndex + group.groupLength;

      if (startBeatIndex >= beatTimestamps.length) continue;

      const startTime = beatTimestamps[startBeatIndex];
      const endTime =
        endBeatIndex < beatTimestamps.length
          ? beatTimestamps[endBeatIndex]
          : beatTimestamps[beatTimestamps.length - 1] + 1;

      if (currentTime >= startTime && currentTime < endTime) {
        if (currentFormationIndex !== i) {
          // When transitioning to a new formation, save previous positions
          const prevDancerPositions = {};

          dancers.forEach((dancer) => {
            const currentPos = getDancerCurrentPosition(dancer.id);
            prevDancerPositions[dancer.id] = currentPos;
            lastKnownPositions.current[dancer.id] = currentPos;
          });

          prevFormationsRef.current = prevDancerPositions;
          // Reset transition progress when entering a new formation
          transitionProgressRef.current = 0;
        }

        setCurrentFormationIndex(i);
        foundFormation = true;
        break;
      }
    }

    if (!foundFormation && customGroups.length > 0) {
      setCurrentFormationIndex(0);
    }
  }, [
    currentTime,
    beatTimestamps,
    customGroups,
    dancers,
    currentFormationIndex,
  ]);

  // When activeGroupIndex changes (from clicking a group), update currentFormationIndex
  useEffect(() => {
    if (activeGroupIndex !== null) {
      setCurrentFormationIndex(activeGroupIndex);
    }
  }, [activeGroupIndex]);

  // When a new formation is created, initialize dancer positions from last known positions
  useEffect(() => {
    if (customGroups.length > 0 && formations.length > 0) {
      const newFormationIndex = formations.length - 1;

      // If this is a newly created formation (with no positions set yet)
      if (Object.keys(formations[newFormationIndex] || {}).length === 0) {
        const newFormation = {};

        // Use the positions from the previous formation
        dancers.forEach((dancer) => {
          if (
            newFormationIndex > 0 &&
            formations[newFormationIndex - 1] &&
            formations[newFormationIndex - 1][dancer.id]
          ) {
            // Copy position from previous formation
            newFormation[dancer.id] = {
              x: formations[newFormationIndex - 1][dancer.id].x,
              y: formations[newFormationIndex - 1][dancer.id].y,
            };
          } else if (lastKnownPositions.current[dancer.id]) {
            // Use last known position
            newFormation[dancer.id] = {
              x: lastKnownPositions.current[dancer.id].x,
              y: lastKnownPositions.current[dancer.id].y,
            };
          } else {
            // Default center position if no previous data
            newFormation[dancer.id] = { x: 200, y: 200 };
          }
        });

        // Update the formation with initialized positions
        onUpdateFormation(newFormationIndex, newFormation);
      }
    }
  }, [customGroups.length, formations.length, dancers, onUpdateFormation]);

  // Apply various transition easing functions
  const applyTransitionEasing = (progress, easingType, dancerId) => {
    // First check if there's a dancer-specific easing
    const dancerEasing = dancerTransitions[dancerId];

    // Use dancer-specific easing if available, otherwise use the provided one
    const easing = dancerEasing || easingType || transitionEasing;

    switch (easing) {
      case "easeInOut":
        return progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      case "easeIn":
        return progress * progress;

      case "easeOut":
        return 1 - Math.pow(1 - progress, 2);

      case "delayed":
        // Dancer stays in place until 2/3 through, then moves quickly
        return progress < 0.6 ? 0 : (progress - 0.6) * 2.5;

      case "early":
        // Dancer moves quickly, then stays in final position
        return progress > 0.4 ? 1 : progress * 2.5;

      case "bounce":
        // Slight overshoot and bounce back
        if (progress < 0.7) {
          return progress * 1.4; // Go a bit beyond
        } else if (progress < 0.85) {
          return 0.98 + Math.sin((progress - 0.7) * 20) * 0.05;
        } else {
          return 1;
        }

      case "linear":
      default:
        return progress;
    }
  };

  // Calculate dancer position considering transitions and paths
  const getDancerCurrentPosition = (dancerId) => {
    // If we're editing a specific formation, just return the exact position
    if (
      activeGroupIndex !== null &&
      formations[activeGroupIndex] &&
      formations[activeGroupIndex][dancerId]
    ) {
      const pos = { ...formations[activeGroupIndex][dancerId] };
      delete pos.path; // Don't include path data in the position
      lastKnownPositions.current[dancerId] = pos;
      return pos;
    }

    // If no formations or no current formation, return last known position
    if (!formations.length || currentFormationIndex === null) {
      return lastKnownPositions.current[dancerId] || { x: 200, y: 200 };
    }

    const currentFormation = formations[currentFormationIndex] || {};
    const dancerData = currentFormation[dancerId];

    // If dancer has no position in this formation, check previous
    if (!dancerData) {
      for (let i = currentFormationIndex - 1; i >= 0; i--) {
        if (formations[i] && formations[i][dancerId]) {
          const pos = { ...formations[i][dancerId] };
          delete pos.path;
          lastKnownPositions.current[dancerId] = pos;
          return pos;
        }
      }
      return lastKnownPositions.current[dancerId] || { x: 200, y: 200 };
    }

    // If we're not in transition period, return exact position
    if (!isInTransitionRef.current || currentFormationIndex === 0) {
      const pos = { x: dancerData.x, y: dancerData.y };
      lastKnownPositions.current[dancerId] = pos;
      return pos;
    }

    // We're in transition period - check if we have a custom path
    if (dancerData.path && dancerData.path.length > 1) {
      // Apply easing to path progress
      const easedProgress = applyTransitionEasing(
        transitionProgressRef.current,
        dancerData.transitionType,
        dancerId
      );

      const pos = getPositionAlongPath(dancerData.path, easedProgress);
      lastKnownPositions.current[dancerId] = pos;
      return pos;
    }

    // No path - apply easing to linear interpolation
    const prevFormationPos = prevFormationsRef.current[dancerId];
    if (prevFormationPos) {
      // Apply easing to the transition progress
      const easedProgress = applyTransitionEasing(
        transitionProgressRef.current,
        dancerData.transitionType,
        dancerId
      );

      const pos = {
        x:
          prevFormationPos.x +
          (dancerData.x - prevFormationPos.x) * easedProgress,
        y:
          prevFormationPos.y +
          (dancerData.y - prevFormationPos.y) * easedProgress,
      };
      lastKnownPositions.current[dancerId] = pos;
      return pos;
    }

    // Fallback to current position
    const pos = { x: dancerData.x, y: dancerData.y };
    lastKnownPositions.current[dancerId] = pos;
    return pos;
  };

  // Get position along a custom path
  const getPositionAlongPath = (path, progress) => {
    if (!path || path.length < 2) return path[0] || { x: 200, y: 200 };

    // For direct paths with just start/end points
    if (path.length === 2) {
      return {
        x: path[0].x + (path[1].x - path[0].x) * progress,
        y: path[0].y + (path[1].y - path[0].y) * progress,
      };
    }

    // For curved paths with multiple points
    const totalPathLength = path.length - 1;
    const currentSegmentIndex = Math.min(
      Math.floor(progress * totalPathLength),
      totalPathLength - 1
    );

    // Calculate progress within the current segment (0-1)
    const segmentProgress = progress * totalPathLength - currentSegmentIndex;

    // Get points for current segment
    const startPoint = path[currentSegmentIndex];
    const endPoint = path[currentSegmentIndex + 1];

    // For bezier paths (even number of segments)
    if (
      path.length % 2 === 0 &&
      currentSegmentIndex % 2 === 0 &&
      currentSegmentIndex + 2 < path.length
    ) {
      // This is a control point segment in a quadratic bezier
      const controlPoint = path[currentSegmentIndex + 1];
      const endPoint = path[currentSegmentIndex + 2];

      // Quadratic bezier formula
      const t = segmentProgress;
      const t1 = 1 - t;

      return {
        x:
          t1 * t1 * startPoint.x +
          2 * t1 * t * controlPoint.x +
          t * t * endPoint.x,
        y:
          t1 * t1 * startPoint.y +
          2 * t1 * t * controlPoint.y +
          t * t * endPoint.y,
      };
    }

    // Linear interpolation for all other cases
    return {
      x: startPoint.x + (endPoint.x - startPoint.x) * segmentProgress,
      y: startPoint.y + (endPoint.y - startPoint.y) * segmentProgress,
    };
  };

  // For display, we just pass through to the calculation function
  const getDancerPosition = (dancerId) => {
    return getDancerCurrentPosition(dancerId);
  };

  // Start dragging a dancer
  const startDrag = (e, dancer) => {
    e.stopPropagation();
    if (!stageRef.current) return;

    // Handle path drawing mode
    if (isDrawingPath) {
      setCurrentPathDancer(dancer);

      const stageBounds = stageRef.current.getBoundingClientRect();
      const x = e.clientX - stageBounds.left;
      const y = e.clientY - stageBounds.top;

      setCurrentPath([{ x, y }]);
      return;
    }

    // Regular dragging mode
    const stageBounds = stageRef.current.getBoundingClientRect();
    const dancerPosition = getDancerPosition(dancer.id);

    const offsetX = e.clientX - stageBounds.left - dancerPosition.x;
    const offsetY = e.clientY - stageBounds.top - dancerPosition.y;

    setIsDragging(true);
    setActiveDancer(dancer);
    setDragOffset({ x: offsetX, y: offsetY });
  };

  // Continue dragging or path drawing
  const handleDrag = (e) => {
    if (!stageRef.current) return;

    // Handle path drawing mode
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

    // Handle regular dragging
    if (!isDragging || !activeDancer || activeGroupIndex === null) return;

    const stageBounds = stageRef.current.getBoundingClientRect();
    const x = Math.max(
      0,
      Math.min(stageBounds.width, e.clientX - stageBounds.left - dragOffset.x)
    );
    const y = Math.max(
      0,
      Math.min(stageBounds.height, e.clientY - stageBounds.top - dragOffset.y)
    );

    const updatedFormation = {
      ...formations[activeGroupIndex],
      [activeDancer.id]: {
        ...(formations[activeGroupIndex]?.[activeDancer.id] || {}),
        x,
        y,
      },
    };

    onUpdateFormation(activeGroupIndex, updatedFormation);
  };

  // Finish dragging or path drawing
  const endDrag = () => {
    if (
      isDrawingPath &&
      currentPathDancer &&
      currentPath.length > 1 &&
      activeGroupIndex !== null
    ) {
      let processedPath = currentPath;

      if (pathMode === "curved") {
        processedPath = smoothPath(currentPath);
      } else if (pathMode === "cardinal") {
        processedPath = cardinalSpline(currentPath, 0.5);
      }

      // Get the current dancer data
      const currentPosition = getDancerPosition(currentPathDancer.id);
      const targetPosition = processedPath[processedPath.length - 1];

      // Update both the current position and save the path
      const updatedFormation = {
        ...formations[activeGroupIndex],
        [currentPathDancer.id]: {
          ...(formations[activeGroupIndex]?.[currentPathDancer.id] || {}),
          x: targetPosition.x,
          y: targetPosition.y,
          path: processedPath,
        },
      };

      onUpdateFormation(activeGroupIndex, updatedFormation);

      setCurrentPath([]);
      setCurrentPathDancer(null);
    }

    setIsDragging(false);
    setActiveDancer(null);
  };

  // Function to smooth a path using bezier curves
  const smoothPath = (points) => {
    if (points.length < 3) return points;

    const smoothed = [];
    smoothed.push(points[0]);

    for (let i = 0; i < points.length - 2; i += 2) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const p2 = i + 2 < points.length ? points[i + 2] : points[i + 1];

      smoothed.push(p1);

      if (i + 2 < points.length) {
        smoothed.push(p2);
      }
    }

    if (points.length % 2 === 0) {
      smoothed.push(points[points.length - 1]);
    }

    return smoothed;
  };

  // Cardinal spline interpolation for smoother paths
  function cardinalSpline(points, tension = 0.5) {
    if (points.length < 3) return points;

    const result = [];
    result.push(points[0]);

    for (let i = 0; i < points.length - 2; i++) {
      const p0 = i > 0 ? points[i - 1] : points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = i + 2 < points.length ? points[i + 2] : p2;

      const steps = 5;
      for (let t = 0; t <= 1; t += 1 / steps) {
        if (t === 0) continue;

        const t2 = t * t;
        const t3 = t2 * t;

        const x =
          0.5 *
          (2 * p1.x +
            (-p0.x + p2.x) * t +
            (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
            (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);

        const y =
          0.5 *
          (2 * p1.y +
            (-p0.y + p2.y) * t +
            (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
            (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);

        result.push({ x, y });
      }
    }

    result.push(points[points.length - 1]);
    return result;
  }

  // Toggle path drawing mode
  const togglePathMode = () => {
    setIsDrawingPath(!isDrawingPath);
    setCurrentPath([]);
    setCurrentPathDancer(null);
  };

  // Change path drawing mode
  const changePathMode = (mode) => {
    setPathMode(mode);
  };

  // Update transition beat count
  const handleTransitionBeatsChange = (e) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value > 0) {
      setTransitionBeats(value);
    }
  };

  // Update global transition easing
  const handleTransitionEasingChange = (e) => {
    setTransitionEasing(e.target.value);
  };

  // Set a specific dancer's transition type
  const setDancerTransitionType = (dancerId, type) => {
    // Update the dancer transition map
    setDancerTransitions((prev) => ({
      ...prev,
      [dancerId]: type,
    }));

    // If we're currently editing a formation, also save this to the formation data
    if (activeGroupIndex !== null && formations[activeGroupIndex]) {
      const dancerData = formations[activeGroupIndex][dancerId] || {
        x: 200,
        y: 200,
      };

      const updatedFormation = {
        ...formations[activeGroupIndex],
        [dancerId]: {
          ...dancerData,
          transitionType: type,
        },
      };

      onUpdateFormation(activeGroupIndex, updatedFormation);
    }
  };

  // Render dancer shape
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

  // Render path preview during drawing
  const renderPathPreview = () => {
    if (!isDrawingPath || currentPath.length < 2) return null;

    let pathData = "";
    let displayedPoints = currentPath;

    if (pathMode === "curved") {
      displayedPoints = smoothPath(currentPath);
      pathData = `M ${displayedPoints[0].x} ${displayedPoints[0].y}`;

      for (let i = 1; i < displayedPoints.length - 1; i += 2) {
        const p1 = displayedPoints[i];
        const p2 =
          i + 1 < displayedPoints.length
            ? displayedPoints[i + 1]
            : displayedPoints[i];
        pathData += ` Q ${p1.x} ${p1.y}, ${p2.x} ${p2.y}`;
      }
    } else if (pathMode === "cardinal") {
      displayedPoints = cardinalSpline(currentPath);
      pathData = `M ${displayedPoints[0].x} ${displayedPoints[0].y}`;

      for (let i = 1; i < displayedPoints.length; i++) {
        pathData += ` L ${displayedPoints[i].x} ${displayedPoints[i].y}`;
      }
    } else {
      pathData = `M ${currentPath[0].x} ${currentPath[0].y}`;
      for (let i = 1; i < currentPath.length; i++) {
        pathData += ` L ${currentPath[i].x} ${currentPath[i].y}`;
      }
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

        {displayedPoints.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r={index % 2 === 1 && pathMode === "curved" ? 2 : 3}
            fill={
              index === 0
                ? "#0f0"
                : index === displayedPoints.length - 1
                ? "#f00"
                : "#fff"
            }
            opacity={index % 2 === 1 && pathMode === "curved" ? 0.5 : 1}
          />
        ))}
      </svg>
    );
  };

  // Render existing paths in the current formation
  const renderExistingPaths = () => {
    if (currentFormationIndex === null || !formations[currentFormationIndex])
      return null;

    const paths = [];
    const formation = formations[currentFormationIndex];

    Object.entries(formation).forEach(([dancerId, dancerData]) => {
      if (dancerData && dancerData.path && dancerData.path.length > 1) {
        const dancer = dancers.find((d) => d.id === dancerId);
        if (!dancer) return;

        const path = dancerData.path;
        let pathData = "";

        if (path.length % 2 === 0) {
          // Bezier path
          pathData = `M ${path[0].x} ${path[0].y}`;
          for (let i = 1; i < path.length - 1; i += 2) {
            const p1 = path[i];
            const p2 = i + 1 < path.length ? path[i + 1] : path[i];
            pathData += ` Q ${p1.x} ${p1.y}, ${p2.x} ${p2.y}`;
          }
        } else {
          // Direct or cardinal path
          pathData = `M ${path[0].x} ${path[0].y}`;
          for (let i = 1; i < path.length; i++) {
            pathData += ` L ${path[i].x} ${path[i].y}`;
          }
        }

        paths.push(
          <path
            key={dancerId}
            d={pathData}
            stroke={dancer.color || "#fff"}
            strokeWidth="1"
            strokeOpacity="0.3"
            fill="none"
          />
        );
      }
    });

    if (paths.length === 0) return null;

    return <svg className="existing-paths">{paths}</svg>;
  };

  // Render dancer transition editor
  const renderDancerTransitionEditor = () => {
    if (activeGroupIndex === null) return null;

    const transitionTypes = [
      { id: "linear", label: "Linear" },
      { id: "easeInOut", label: "Smooth" },
      { id: "easeIn", label: "Accelerate" },
      { id: "easeOut", label: "Decelerate" },
      { id: "delayed", label: "Delayed" },
      { id: "early", label: "Early" },
      { id: "bounce", label: "Bounce" },
    ];

    return (
      <div className="dancer-transition-editor">
        <h4>Dancer Transitions</h4>
        <div className="dancer-transitions-list">
          {dancers.map((dancer) => {
            // Get this dancer's current transition type
            const dancerData = formations[activeGroupIndex]?.[dancer.id] || {};
            const transitionType =
              dancerData.transitionType ||
              dancerTransitions[dancer.id] ||
              transitionEasing;

            return (
              <div key={dancer.id} className="dancer-transition-item">
                <div className="dancer-info">
                  <svg width="16" height="16" viewBox="0 0 20 20">
                    {renderDancerShape(dancer)}
                  </svg>
                  <span>{dancer.name}</span>
                </div>
                <select
                  value={transitionType}
                  onChange={(e) =>
                    setDancerTransitionType(dancer.id, e.target.value)
                  }
                  className="transition-type-select"
                >
                  {transitionTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.label}
                    </option>
                  ))}
                </select>
                {dancerData.path && dancerData.path.length > 1 && (
                  <span className="has-path-indicator">Has custom path</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="stage-container">
      <div className="stage-header">
        <h2>Choreography Stage</h2>
        <div className="stage-info">
          {currentFormationIndex !== null
            ? `Formation ${currentFormationIndex + 1}${
                activeGroupIndex === currentFormationIndex ? " (Editing)" : ""
              } ${isInTransitionRef.current ? " - Transitioning" : ""}`
            : "Select a beat group to edit its formation"}
        </div>
        <div className="stage-controls">
          <div className="transition-control">
            <label>Transition Beats:</label>
            <input
              type="number"
              min="1"
              value={transitionBeats}
              onChange={handleTransitionBeatsChange}
              className="transition-input"
            />
          </div>

          <div className="transition-easing-control">
            <label>Default Transition:</label>
            <select
              value={transitionEasing}
              onChange={handleTransitionEasingChange}
              className="transition-select"
            >
              <option value="linear">Linear</option>
              <option value="easeInOut">Smooth</option>
              <option value="easeIn">Accelerate</option>
              <option value="easeOut">Decelerate</option>
              <option value="delayed">Delayed</option>
              <option value="early">Early</option>
              <option value="bounce">Bounce</option>
            </select>
          </div>

          <button
            className={`path-toggle ${isDrawingPath ? "active" : ""}`}
            onClick={togglePathMode}
            title={isDrawingPath ? "Cancel Path" : "Draw Movement Path"}
          >
            {isDrawingPath ? "Cancel Path" : "Draw Path"}
          </button>

          {isDrawingPath && (
            <div className="path-modes">
              <button
                className={`path-mode ${pathMode === "direct" ? "active" : ""}`}
                onClick={() => changePathMode("direct")}
                title="Direct path (straight lines)"
              >
                Direct
              </button>
              <button
                className={`path-mode ${pathMode === "curved" ? "active" : ""}`}
                onClick={() => changePathMode("curved")}
                title="Curved path (smooth)"
              >
                Curved
              </button>
              <button
                className={`path-mode ${
                  pathMode === "cardinal" ? "active" : ""
                }`}
                onClick={() => changePathMode("cardinal")}
                title="Cardinal spline (very smooth)"
              >
                Smooth
              </button>
            </div>
          )}
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
        {renderExistingPaths()}
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

        {(activeGroupIndex === null && currentFormationIndex === null) ||
        dancers.length === 0 ? (
          <div className="stage-placeholder">
            {dancers.length === 0 ? (
              <>
                <p>No dancers added</p>
                <p className="hint">Add dancers using the Dancers tab</p>
              </>
            ) : (
              <p>Select a beat group to edit its formation</p>
            )}
          </div>
        ) : null}
      </div>

      {/* Render dancer transition editor when a formation is active */}
      {activeGroupIndex !== null && renderDancerTransitionEditor()}
    </div>
  );
};

export default Stage;
