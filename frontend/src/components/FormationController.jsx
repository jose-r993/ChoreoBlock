import { useState, useRef, useEffect, useCallback } from "react";

const lerp = (start, end, progress) => start + (end - start) * progress;

const getPositionAlongLinearPath = (path, progress) => {
  if (!path || path.length === 0) return null;
  if (path.length === 1) return path[0];
  let totalLength = 0;
  const segmentLengths = [];
  for (let i = 0; i < path.length - 1; i++) {
    const p1 = path[i];
    const p2 = path[i + 1];
    if (
      typeof p1?.x !== "number" ||
      typeof p1?.y !== "number" ||
      typeof p2?.x !== "number" ||
      typeof p2?.y !== "number"
    ) {
      console.error("Invalid point in path:", p1, p2);
      return path[i] || (path.length > 0 ? path[0] : null);
    }
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    segmentLengths.push(length);
    totalLength += length;
  }
  if (totalLength <= 1e-6) return path[0];

  const targetDist = totalLength * Math.max(0, Math.min(1, progress));
  let accumulatedLength = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const segmentLength = segmentLengths[i];
    if (targetDist <= accumulatedLength + segmentLength + 1e-6) {
      const segmentProgress =
        segmentLength === 0
          ? 0
          : Math.max(
              0,
              Math.min(1, (targetDist - accumulatedLength) / segmentLength)
            );
      return {
        x: lerp(path[i].x, path[i + 1].x, segmentProgress),
        y: lerp(path[i].y, path[i + 1].y, segmentProgress),
      };
    }
    accumulatedLength += segmentLength;
  }
  return path[path.length - 1];
};

const useFormationController = ({
  dancers = [],
  formations = [],
  customGroups = [],
  beatTimestamps = [],
  currentTime = 0,
  activeGroupIndex = null,
  onUpdateFormation,
  initialPositions = {},
}) => {
  const currentTimelineStateRef = useRef({
    index: null,
    isInTransition: false,
    progress: 0,
    effectiveTransitionStart: -1,
    effectiveTransitionEnd: -1,
  });

  const [internalTick, setInternalTick] = useState(0);

  useEffect(() => {
    let calculatedIndex = null;
    let calculatedInTransition = false;
    let calculatedProgress = 0;
    let calculatedEffectiveStart = -1;
    let calculatedEffectiveEnd = -1;
    let stateNeedsUpdate = false;

    if (
      !beatTimestamps?.length ||
      !customGroups?.length ||
      customGroups.length !== formations.length
    ) {
      calculatedIndex = null;
      calculatedInTransition = false;
      calculatedProgress = 0;
      stateNeedsUpdate = true;
    } else {
      let foundState = false;

      for (let i = 0; i < customGroups.length; i++) {
        const group = customGroups[i];
        if (
          !group ||
          typeof group.startBeat !== "number" ||
          typeof group.groupLength !== "number"
        ) {
          console.warn(`Skipping invalid group at index ${i}:`, group);
          continue;
        }

        const groupStartBeat = group.startBeat;
        const groupLength = Math.max(1, group.groupLength);

        if (groupStartBeat < 0 || groupStartBeat >= beatTimestamps.length) {
          console.warn(
            `Skipping group ${i} with invalid startBeat: ${groupStartBeat}`
          );
          continue;
        }
        const groupStartTime = beatTimestamps[groupStartBeat];

        const nextGroup = customGroups[i + 1];
        const nextGroupStartBeat = nextGroup?.startBeat ?? -1;
        const groupEndTime =
          nextGroup &&
          nextGroupStartBeat >= 0 &&
          nextGroupStartBeat < beatTimestamps.length
            ? beatTimestamps[nextGroupStartBeat]
            : Infinity;

        const defaultTransitionStartBeat = groupStartBeat;
        const defaultTransitionLength = Math.max(0, groupLength - 1);

        const transitionStartBeat =
          typeof group.transitionStartBeat === "number" &&
          group.transitionStartBeat >= groupStartBeat &&
          group.transitionStartBeat < groupStartBeat + groupLength
            ? group.transitionStartBeat
            : defaultTransitionStartBeat;

        const transitionLength =
          typeof group.transitionLength === "number" &&
          group.transitionLength >= 0 &&
          transitionStartBeat + group.transitionLength <=
            groupStartBeat + groupLength
            ? group.transitionLength
            : defaultTransitionLength;

        const transitionEndBeat = transitionStartBeat + transitionLength;

        const safeStartBeatIndex = Math.min(
          Math.max(0, transitionStartBeat),
          beatTimestamps.length - 1
        );
        const safeEndBeatIndex = Math.min(
          Math.max(0, transitionEndBeat),
          beatTimestamps.length - 1
        );

        const transitionStartTime =
          beatTimestamps[safeStartBeatIndex] ?? groupStartTime;
        const transitionEndTime =
          safeEndBeatIndex === safeStartBeatIndex
            ? transitionStartTime
            : beatTimestamps[safeEndBeatIndex] ?? transitionStartTime;

        calculatedEffectiveStart = Math.max(
          groupStartTime,
          transitionStartTime
        );
        calculatedEffectiveEnd = Math.min(groupEndTime, transitionEndTime);
        const effectiveTransitionDuration = Math.max(
          0,
          calculatedEffectiveEnd - calculatedEffectiveStart
        );

        if (currentTime >= groupStartTime && currentTime < groupEndTime) {
          calculatedIndex = i;

          const epsilon = 1e-9;
          if (
            currentTime >= calculatedEffectiveStart &&
            currentTime < calculatedEffectiveEnd - epsilon &&
            effectiveTransitionDuration > epsilon
          ) {
            calculatedInTransition = true;
            calculatedProgress = Math.max(
              0,
              Math.min(
                1,
                (currentTime - calculatedEffectiveStart) /
                  effectiveTransitionDuration
              )
            );
          } else {
            calculatedInTransition = false;
            calculatedProgress =
              currentTime >= calculatedEffectiveEnd - epsilon ? 1 : 0;
          }
          foundState = true;
          break;
        }
      }

      if (
        !foundState &&
        customGroups.length > 0 &&
        currentTime < (beatTimestamps[customGroups[0]?.startBeat] ?? 0)
      ) {
        calculatedIndex = null;
        calculatedInTransition = false;
        calculatedProgress = 0;
        calculatedEffectiveStart = -1;
        calculatedEffectiveEnd = -1;
        foundState = true;
      }

      if (!foundState && customGroups.length > 0) {
        const lastGroupIndex = customGroups.length - 1;
        const lastGroup = customGroups[lastGroupIndex];
        if (lastGroup && typeof lastGroup.startBeat === "number") {
          const lastGroupStartTime = beatTimestamps[lastGroup.startBeat] ?? 0;
          if (currentTime >= lastGroupStartTime) {
            calculatedIndex = lastGroupIndex;
            const groupLength = Math.max(1, lastGroup.groupLength);
            const defaultTransitionStartBeat = lastGroup.startBeat;
            const defaultTransitionLength = Math.max(0, groupLength - 1);

            const transitionStartBeat =
              typeof lastGroup.transitionStartBeat === "number" &&
              lastGroup.transitionStartBeat >= lastGroup.startBeat &&
              lastGroup.transitionStartBeat < lastGroup.startBeat + groupLength
                ? lastGroup.transitionStartBeat
                : defaultTransitionStartBeat;
            const transitionLength =
              typeof lastGroup.transitionLength === "number" &&
              lastGroup.transitionLength >= 0 &&
              transitionStartBeat + lastGroup.transitionLength <=
                lastGroup.startBeat + groupLength
                ? lastGroup.transitionLength
                : defaultTransitionLength;

            const transitionEndBeat = transitionStartBeat + transitionLength;

            const safeStartBeatIndex = Math.min(
              Math.max(0, transitionStartBeat),
              beatTimestamps.length - 1
            );
            const safeEndBeatIndex = Math.min(
              Math.max(0, transitionEndBeat),
              beatTimestamps.length - 1
            );

            const transitionStartTime =
              beatTimestamps[safeStartBeatIndex] ?? lastGroupStartTime;
            const transitionEndTime =
              safeEndBeatIndex === safeStartBeatIndex
                ? transitionStartTime
                : beatTimestamps[safeEndBeatIndex] ?? transitionStartTime;

            calculatedEffectiveStart = Math.max(
              lastGroupStartTime,
              transitionStartTime
            );
            calculatedEffectiveEnd = transitionEndTime;
            const effectiveTransitionDuration = Math.max(
              0,
              calculatedEffectiveEnd - calculatedEffectiveStart
            );

            const epsilon = 1e-9;
            if (
              currentTime >= calculatedEffectiveStart &&
              currentTime < calculatedEffectiveEnd - epsilon &&
              effectiveTransitionDuration > epsilon
            ) {
              calculatedInTransition = true;
              calculatedProgress = Math.max(
                0,
                Math.min(
                  1,
                  (currentTime - calculatedEffectiveStart) /
                    effectiveTransitionDuration
                )
              );
            } else {
              calculatedInTransition = false;
              calculatedProgress =
                currentTime >= calculatedEffectiveEnd - epsilon ? 1 : 0;
            }
            foundState = true;
          }
        }
      }

      if (!foundState) {
        calculatedIndex = null;
        calculatedInTransition = false;
        calculatedProgress = 0;
        calculatedEffectiveStart = -1;
        calculatedEffectiveEnd = -1;
      }

      stateNeedsUpdate = true;
    }

    if (stateNeedsUpdate) {
      const previousState = currentTimelineStateRef.current;
      const newState = {
        index: calculatedIndex,
        isInTransition: calculatedInTransition,
        progress: calculatedProgress,
        effectiveTransitionStart: calculatedEffectiveStart,
        effectiveTransitionEnd: calculatedEffectiveEnd,
      };

      if (
        previousState.index !== newState.index ||
        previousState.isInTransition !== newState.isInTransition ||
        (newState.isInTransition &&
          Math.abs(previousState.progress - newState.progress) > 1e-6) ||
        previousState.isInTransition !== newState.isInTransition ||
        previousState.effectiveTransitionStart !==
          newState.effectiveTransitionStart ||
        previousState.effectiveTransitionEnd !== newState.effectiveTransitionEnd
      ) {
        currentTimelineStateRef.current = newState;
        setInternalTick((tick) => tick + 1);
      }
    }
  }, [currentTime, beatTimestamps, customGroups, formations?.length]);

  const getDancerPosition = useCallback(
    (dancerId) => {
      const {
        index,
        isInTransition,
        progress,
        effectiveTransitionStart,
        effectiveTransitionEnd,
      } = currentTimelineStateRef.current;
      const defaultPos = { x: 200, y: 200 };

      if (index === null) {
        return initialPositions[dancerId] || defaultPos;
      }

      let startPos;
      if (index === 0) {
        startPos = initialPositions[dancerId] || defaultPos;
      } else {
        const prevFormation = formations[index - 1];
        const prevDancerData = prevFormation?.[dancerId];
        startPos = prevDancerData
          ? { x: prevDancerData.x, y: prevDancerData.y }
          : defaultPos;
      }

      const currentFormation = formations[index];
      const currentDancerData = currentFormation?.[dancerId];
      const targetPos = currentDancerData
        ? { x: currentDancerData.x, y: currentDancerData.y }
        : defaultPos;

      const epsilon = 1e-9;
      if (currentTime < effectiveTransitionStart) {
        return startPos;
      }
      if (currentTime >= effectiveTransitionEnd - epsilon) {
        return targetPos;
      }
      if (isInTransition) {
        const path = currentDancerData?.path;
        if (path && path.length > 0) {
          const posAlongPath = getPositionAlongLinearPath(path, progress);
          return posAlongPath || targetPos;
        } else {
          return {
            x: lerp(startPos.x, targetPos.x, progress),
            y: lerp(startPos.y, targetPos.y, progress),
          };
        }
      }

      return targetPos;
    },
    [formations, initialPositions, currentTime]
  );

  const smoothPath = useCallback((points) => {
    if (!points || points.length < 3) return points;
    const smoothed = [points[0]];
    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1];
      smoothed.push({
        x: (prev.x + curr.x * 2 + next.x) / 4,
        y: (prev.y + curr.y * 2 + next.y) / 4,
      });
    }
    smoothed.push(points[points.length - 1]);
    return smoothed;
  }, []);

  const cardinalSpline = useCallback((points, tension = 0.5, segments = 10) => {
    if (!points || points.length < 2) return points;
    if (points.length === 2) return points;
    const splinePoints = [];
    const pts = [points[0], ...points, points[points.length - 1]];
    splinePoints.push(pts[1]);
    for (let i = 1; i < pts.length - 2; i++) {
      const p0 = pts[i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2];
      for (let t = 1; t <= segments; t++) {
        const tNorm = t / segments;
        const t2 = tNorm * tNorm;
        const t3 = t2 * tNorm;
        const s = (1 - tension) / 2;
        const x =
          p1.x +
          (-s * p0.x + s * p2.x) * tNorm +
          (2 * s * p0.x + (s - 3) * p1.x + (3 - 2 * s) * p2.x - s * p3.x) * t2 +
          (-s * p0.x + (2 - s) * p1.x + (s - 2) * p2.x + s * p3.x) * t3;
        const y =
          p1.y +
          (-s * p0.y + s * p2.y) * tNorm +
          (2 * s * p0.y + (s - 3) * p1.y + (3 - 2 * s) * p2.y - s * p3.y) * t2 +
          (-s * p0.y + (2 - s) * p1.y + (s - 2) * p2.y + s * p3.y) * t3;
        splinePoints.push({ x, y });
      }
    }
    if (
      splinePoints.length === 0 ||
      splinePoints[splinePoints.length - 1].x !== pts[pts.length - 2].x ||
      splinePoints[splinePoints.length - 1].y !== pts[pts.length - 2].y
    ) {
      if (pts.length >= 3) {
        splinePoints.push(pts[pts.length - 2]);
      }
    }
    return splinePoints;
  }, []);

  const addDancerPath = useCallback(
    (dancerId, path, pathMode = "direct") => {
      if (
        !dancerId ||
        activeGroupIndex === null ||
        activeGroupIndex < 0 ||
        activeGroupIndex >= formations.length
      ) {
        console.warn(
          "addDancerPath: Invalid dancerId or activeGroupIndex:",
          dancerId,
          activeGroupIndex,
          formations.length
        );
        return;
      }
      const targetFormation = formations[activeGroupIndex] || {};
      let processedPath = path;
      if (path && path.length > 1) {
        if (pathMode === "curved") {
          processedPath = smoothPath(path);
        } else if (pathMode === "cardinal") {
          processedPath = path.length >= 2 ? cardinalSpline(path, 0.5) : path;
        }
        if (!Array.isArray(processedPath)) {
          processedPath = path;
        }
      } else {
        processedPath = null;
      }
      const existingDancerData = targetFormation[dancerId] || {
        x: 200,
        y: 200,
        path: null,
      };
      const updateData = { ...existingDancerData, path: processedPath };
      if (processedPath && processedPath.length > 0) {
        const endPoint = processedPath[processedPath.length - 1];
        if (
          typeof endPoint?.x === "number" &&
          typeof endPoint?.y === "number"
        ) {
          updateData.x = endPoint.x;
          updateData.y = endPoint.y;
        } else {
          console.warn("Invalid endpoint in processed path:", endPoint);
        }
      }
      const updatedFormation = { ...targetFormation, [dancerId]: updateData };
      if (typeof onUpdateFormation === "function") {
        onUpdateFormation(activeGroupIndex, updatedFormation);
      } else {
        console.error(
          "onUpdateFormation prop is not a function in useFormationController"
        );
      }
    },
    [
      activeGroupIndex,
      formations,
      onUpdateFormation,
      smoothPath,
      cardinalSpline,
    ]
  );

  return {
    currentTimelineState: currentTimelineStateRef.current,
    getDancerPosition,
    addDancerPath,
    pathUtils: { smoothPath, cardinalSpline, getPositionAlongLinearPath, lerp },
  };
};

export default useFormationController;
