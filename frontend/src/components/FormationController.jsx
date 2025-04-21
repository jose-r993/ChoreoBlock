import { useState, useRef, useEffect } from "react";

const useFormationController = ({
  dancers,
  formations,
  customGroups,
  beatTimestamps,
  currentTime,
  activeGroupIndex,
  onUpdateFormation,
}) => {
  const prevFormationsRef = useRef({});
  const lastKnownPositions = useRef({});
  const transitionProgressRef = useRef(0);
  const isInTransitionRef = useRef(false);

  const [currentFormationIndex, setCurrentFormationIndex] =
    useState(activeGroupIndex);
  const [dancerTransitions, setDancerTransitions] = useState({});

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
          const prevDancerPositions = {};

          dancers.forEach((dancer) => {
            const currentPos = getDancerPosition(dancer.id);
            prevDancerPositions[dancer.id] = currentPos;
            lastKnownPositions.current[dancer.id] = currentPos;
          });

          prevFormationsRef.current = prevDancerPositions;
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

  useEffect(() => {
    if (activeGroupIndex !== null) {
      setCurrentFormationIndex(activeGroupIndex);
    }
  }, [activeGroupIndex]);

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

    const transitionStartBeat =
      startBeatIndex + (currentGroup.transitionStartBeat || 0);

    const transitionLength = currentGroup.transitionLength || 4;

    const transitionEndBeat = Math.min(
      transitionStartBeat + transitionLength,
      startBeatIndex + currentGroup.groupLength
    );

    if (transitionStartBeat >= beatTimestamps.length) return;

    const transitionStartTime =
      beatTimestamps[Math.min(transitionStartBeat, beatTimestamps.length - 1)];
    const transitionEndTime =
      beatTimestamps[Math.min(transitionEndBeat, beatTimestamps.length - 1)];

    isInTransitionRef.current =
      currentTime >= transitionStartTime && currentTime < transitionEndTime;

    if (isInTransitionRef.current) {
      transitionProgressRef.current = Math.max(
        0,
        Math.min(
          1,
          (currentTime - transitionStartTime) /
            (transitionEndTime - transitionStartTime)
        )
      );
    } else {
      transitionProgressRef.current = currentTime >= transitionEndTime ? 1 : 0;
    }
  }, [currentTime, beatTimestamps, customGroups, currentFormationIndex]);

  const applyTransitionEasing = (progress, easingType, dancerId) => {
    const dancerEasing = dancerTransitions[dancerId];

    const easing = dancerEasing || easingType || "linear";

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
        return progress < 0.6 ? 0 : (progress - 0.6) * 2.5;

      case "early":
        return progress > 0.4 ? 1 : progress * 2.5;

      case "bounce":
        if (progress < 0.7) {
          return progress * 1.4;
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

  const getPositionAlongPath = (path, progress) => {
    if (!path || path.length < 2) return path[0] || { x: 200, y: 200 };

    if (path.length === 2) {
      return {
        x: path[0].x + (path[1].x - path[0].x) * progress,
        y: path[0].y + (path[1].y - path[0].y) * progress,
      };
    }

    const totalPathLength = path.length - 1;
    const currentSegmentIndex = Math.min(
      Math.floor(progress * totalPathLength),
      totalPathLength - 1
    );

    const segmentProgress = progress * totalPathLength - currentSegmentIndex;

    const startPoint = path[currentSegmentIndex];
    const endPoint = path[currentSegmentIndex + 1];

    if (
      path.length % 2 === 0 &&
      currentSegmentIndex % 2 === 0 &&
      currentSegmentIndex + 2 < path.length
    ) {
      const controlPoint = path[currentSegmentIndex + 1];
      const endPoint = path[currentSegmentIndex + 2];

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

    return {
      x: startPoint.x + (endPoint.x - startPoint.x) * segmentProgress,
      y: startPoint.y + (endPoint.y - startPoint.y) * segmentProgress,
    };
  };

  const getDancerPosition = (dancerId) => {
    if (
      activeGroupIndex !== null &&
      formations[activeGroupIndex] &&
      formations[activeGroupIndex][dancerId]
    ) {
      const pos = { ...formations[activeGroupIndex][dancerId] };
      delete pos.path;
      lastKnownPositions.current[dancerId] = pos;
      return pos;
    }

    if (!formations.length || currentFormationIndex === null) {
      return lastKnownPositions.current[dancerId] || { x: 200, y: 200 };
    }

    const currentFormation = formations[currentFormationIndex] || {};
    const dancerData = currentFormation[dancerId];

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

    if (!isInTransitionRef.current || currentFormationIndex === 0) {
      const pos = { x: dancerData.x, y: dancerData.y };
      lastKnownPositions.current[dancerId] = pos;
      return pos;
    }

    if (dancerData.path && dancerData.path.length > 1) {
      const easedProgress = applyTransitionEasing(
        transitionProgressRef.current,
        dancerData.transitionType,
        dancerId
      );

      const pos = getPositionAlongPath(dancerData.path, easedProgress);
      lastKnownPositions.current[dancerId] = pos;
      return pos;
    }

    const prevFormationPos = prevFormationsRef.current[dancerId];
    if (prevFormationPos) {
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

    const pos = { x: dancerData.x, y: dancerData.y };
    lastKnownPositions.current[dancerId] = pos;
    return pos;
  };

  const setDancerTransitionType = (dancerId, type) => {
    setDancerTransitions((prev) => ({
      ...prev,
      [dancerId]: type,
    }));

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

  const cardinalSpline = (points, tension = 0.5) => {
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
  };

  const addDancerPath = (dancerId, path, pathMode = "direct") => {
    if (!dancerId || activeGroupIndex === null) return;

    let processedPath = path;

    if (path && path.length > 1) {
      if (pathMode === "curved") {
        processedPath = smoothPath(path);
      } else if (pathMode === "cardinal") {
        processedPath = cardinalSpline(path, 0.5);
      }

      const targetPosition = processedPath[processedPath.length - 1];

      const dancerData = formations[activeGroupIndex]?.[dancerId] || {
        x: 200,
        y: 200,
      };

      const updatedFormation = {
        ...formations[activeGroupIndex],
        [dancerId]: {
          ...dancerData,
          x: targetPosition.x,
          y: targetPosition.y,
          path: processedPath,
        },
      };

      onUpdateFormation(activeGroupIndex, updatedFormation);
    } else if (path === null) {
      if (formations[activeGroupIndex]?.[dancerId]) {
        const { path, ...dancerDataWithoutPath } =
          formations[activeGroupIndex][dancerId];

        const updatedFormation = {
          ...formations[activeGroupIndex],
          [dancerId]: dancerDataWithoutPath,
        };

        onUpdateFormation(activeGroupIndex, updatedFormation);
      }
    }
  };

  return {
    currentFormationIndex,
    isInTransition: isInTransitionRef.current,
    transitionProgress: transitionProgressRef.current,

    getDancerPosition,
    setDancerTransitionType,
    addDancerPath,

    pathUtils: {
      smoothPath,
      cardinalSpline,
    },
  };
};

export default useFormationController;
