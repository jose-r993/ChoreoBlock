import { useState, useRef, useEffect, useCallback } from "react";

const lerp = (start, end, progress) => start + (end - start) * progress;

const getPositionAlongLinearPath = (path, progress) => {
  if (!path || path.length === 0) return { x: 0, y: 0 };
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
      return path[i] || (path.length > 0 ? path[0] : { x: 0, y: 0 });
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
  const actualEndPositionsMemoRef = useRef({});

  useEffect(() => {
    actualEndPositionsMemoRef.current = {};
  }, [formations, initialPositions]);

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
      !formations ||
      customGroups.length !== formations.length
    ) {
      calculatedIndex = null;
      calculatedInTransition = false;
      calculatedProgress = 0;
      calculatedEffectiveStart = -1;
      calculatedEffectiveEnd = -1;
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
          continue;
        }

        const groupStartBeat = group.startBeat;
        const groupLength = Math.max(1, group.groupLength);

        if (groupStartBeat < 0 || groupStartBeat >= beatTimestamps.length) {
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
          Math.abs(previousState.progress - newState.progress) > 1e-9) ||
        previousState.effectiveTransitionStart !==
          newState.effectiveTransitionStart ||
        previousState.effectiveTransitionEnd !== newState.effectiveTransitionEnd
      ) {
        currentTimelineStateRef.current = newState;
        setInternalTick((tick) => tick + 1);
      }
    }
  }, [currentTime, beatTimestamps, customGroups, formations, initialPositions]);

  const getActualEndPointOfFormation = useCallback(
    (dancerId, formationIndex, memo) => {
      const memoKey = `${dancerId}_${formationIndex}`;
      if (memo[memoKey] !== undefined) {
        return memo[memoKey];
      }

      if (formationIndex < 0) {
        const pos = initialPositions[dancerId] || { x: 200, y: 200 };
        memo[memoKey] = pos;
        return pos;
      }

      const prevActualEndPos = getActualEndPointOfFormation(
        dancerId,
        formationIndex - 1,
        memo
      );

      let currentFormationObjectForDancer = undefined;
      if (
        formations &&
        formationIndex < formations.length &&
        formations[formationIndex]
      ) {
        const formationAtIndex = formations[formationIndex];
        if (
          typeof formationAtIndex === "object" &&
          !Array.isArray(formationAtIndex) &&
          formationAtIndex !== null
        ) {
          currentFormationObjectForDancer = formationAtIndex[dancerId];
        }
      }

      let result = prevActualEndPos;

      if (
        currentFormationObjectForDancer &&
        currentFormationObjectForDancer.rawStagePath &&
        currentFormationObjectForDancer.rawStagePath.length > 0
      ) {
        const rawPath = currentFormationObjectForDancer.rawStagePath;
        if (rawPath.length > 0) {
          const drawnPathStartPos = rawPath[0];
          const drawnPathEndPos = rawPath[rawPath.length - 1];

          if (
            typeof drawnPathStartPos?.x === "number" &&
            typeof drawnPathStartPos?.y === "number" &&
            typeof drawnPathEndPos?.x === "number" &&
            typeof drawnPathEndPos?.y === "number" &&
            typeof prevActualEndPos?.x === "number" &&
            typeof prevActualEndPos?.y === "number"
          ) {
            const deltaX = prevActualEndPos.x - drawnPathStartPos.x;
            const deltaY = prevActualEndPos.y - drawnPathStartPos.y;
            result = {
              x: drawnPathEndPos.x + deltaX,
              y: drawnPathEndPos.y + deltaY,
            };
          }
        }
      }

      memo[memoKey] = result;
      return result;
    },
    [formations, initialPositions]
  );

  const getActualStartForFormation = useCallback(
    (dancerId, formationIdx) => {
      return getActualEndPointOfFormation(
        dancerId,
        formationIdx - 1,
        actualEndPositionsMemoRef.current
      );
    },
    [getActualEndPointOfFormation]
  );

  const getDancerPosition = useCallback(
    (dancerId) => {
      const timelineState = currentTimelineStateRef.current;
      const formationIdx = timelineState.index;

      if (
        formationIdx === null ||
        !formations ||
        formations.length <= formationIdx
      ) {
        return initialPositions[dancerId] || { x: 200, y: 200 };
      }

      const actualStartPosForCurrentFormation = getActualStartForFormation(
        dancerId,
        formationIdx
      );

      let currentDancerData = undefined;
      if (
        formations[formationIdx] &&
        typeof formations[formationIdx] === "object" &&
        !Array.isArray(formations[formationIdx]) &&
        formations[formationIdx] !== null
      ) {
        currentDancerData = formations[formationIdx][dancerId];
      }

      if (
        currentDancerData &&
        currentDancerData.rawStagePath &&
        currentDancerData.rawStagePath.length > 0
      ) {
        const rawPath = currentDancerData.rawStagePath;

        if (
          rawPath.length === 0 ||
          typeof rawPath[0]?.x !== "number" ||
          typeof rawPath[0]?.y !== "number"
        ) {
          return actualStartPosForCurrentFormation;
        }
        const drawnPathStart = rawPath[0];
        if (
          typeof actualStartPosForCurrentFormation?.x !== "number" ||
          typeof actualStartPosForCurrentFormation?.y !== "number"
        ) {
          return initialPositions[dancerId] || { x: 200, y: 200 };
        }

        const deltaX = actualStartPosForCurrentFormation.x - drawnPathStart.x;
        const deltaY = actualStartPosForCurrentFormation.y - drawnPathStart.y;

        const effectivePath = rawPath.map((p) => ({
          x: p.x + deltaX,
          y: p.y + deltaY,
        }));

        if (effectivePath.length === 0)
          return actualStartPosForCurrentFormation;
        const effectiveTargetPos = effectivePath[effectivePath.length - 1];

        const epsilon = 1e-9;
        if (currentTime < timelineState.effectiveTransitionStart) {
          return actualStartPosForCurrentFormation;
        }
        if (currentTime >= timelineState.effectiveTransitionEnd - epsilon) {
          return effectiveTargetPos;
        }
        if (timelineState.isInTransition) {
          if (effectivePath.length === 1) return effectivePath[0];
          return getPositionAlongLinearPath(
            effectivePath,
            timelineState.progress
          );
        }
        return effectiveTargetPos;
      } else {
        return actualStartPosForCurrentFormation;
      }
    },
    [
      formations,
      initialPositions,
      currentTime,
      getActualStartForFormation,
      internalTick,
    ]
  );

  const smoothPath = useCallback((points) => {
    const safePoints = points.filter(
      (p) => typeof p?.x === "number" && typeof p?.y === "number"
    );
    if (!safePoints || safePoints.length < 3) return safePoints;

    const smoothed = [safePoints[0]];
    for (let i = 1; i < safePoints.length - 1; i++) {
      const prev = safePoints[i - 1];
      const curr = safePoints[i];
      const next = safePoints[i + 1];
      smoothed.push({
        x: (prev.x + curr.x * 2 + next.x) / 4,
        y: (prev.y + curr.y * 2 + next.y) / 4,
      });
    }
    smoothed.push(safePoints[safePoints.length - 1]);
    return smoothed;
  }, []);

  const cardinalSpline = useCallback((points, tension = 0.5, segments = 10) => {
    const safePoints = points.filter(
      (p) => typeof p?.x === "number" && typeof p?.y === "number"
    );
    if (!safePoints || safePoints.length < 2) return safePoints;
    if (safePoints.length === 2) return safePoints;

    const splinePoints = [];
    const pts = [
      safePoints[0],
      ...safePoints,
      safePoints[safePoints.length - 1],
    ];

    if (typeof pts[1]?.x !== "number" || typeof pts[1]?.y !== "number")
      return safePoints;
    splinePoints.push({ ...pts[1] });

    for (let i = 1; i < pts.length - 2; i++) {
      const p0 = pts[i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2];
      if (
        typeof p0?.x !== "number" ||
        typeof p1?.x !== "number" ||
        typeof p2?.x !== "number" ||
        typeof p3?.x !== "number" ||
        typeof p0?.y !== "number" ||
        typeof p1?.y !== "number" ||
        typeof p2?.y !== "number" ||
        typeof p3?.y !== "number"
      )
        continue;

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

    const lastOriginalCtrlPoint = pts[pts.length - 2];
    if (
      typeof lastOriginalCtrlPoint?.x !== "number" ||
      typeof lastOriginalCtrlPoint?.y !== "number"
    ) {
      return splinePoints.length > 0 ? splinePoints : safePoints;
    }

    if (splinePoints.length > 0) {
      const lastSplinePt = splinePoints[splinePoints.length - 1];
      if (
        typeof lastSplinePt?.x !== "number" ||
        typeof lastSplinePt?.y !== "number"
      )
        return splinePoints;

      const isLastPointCorrect =
        Math.abs(lastSplinePt.x - lastOriginalCtrlPoint.x) < 1e-3 &&
        Math.abs(lastSplinePt.y - lastOriginalCtrlPoint.y) < 1e-3;
      if (!isLastPointCorrect) {
        splinePoints.push({ ...lastOriginalCtrlPoint });
      } else {
        splinePoints[splinePoints.length - 1] = { ...lastOriginalCtrlPoint };
      }
    } else {
      if (typeof pts[1]?.x === "number") splinePoints.push({ ...pts[1] });
      if (pts.length > 2 && typeof pts[pts.length - 2]?.x === "number")
        splinePoints.push({ ...pts[pts.length - 2] });
    }
    return splinePoints;
  }, []);

  const addDancerPath = useCallback(
    (dancerId, userInputPathPoints, pathMode = "direct") => {
      if (
        !dancerId ||
        activeGroupIndex === null ||
        activeGroupIndex < 0 ||
        !formations ||
        activeGroupIndex >= formations.length
      ) {
        return;
      }

      let finalShapePath = null;

      if (userInputPathPoints && userInputPathPoints.length > 0) {
        let processedPath;
        const validPoints = userInputPathPoints.filter(
          (p) => typeof p?.x === "number" && typeof p?.y === "number"
        );

        if (validPoints.length === 0) {
          processedPath = null;
        } else if (pathMode === "curved" && validPoints.length >= 3) {
          processedPath = smoothPath(validPoints);
        } else if (pathMode === "cardinal" && validPoints.length >= 2) {
          processedPath = cardinalSpline(validPoints, 0.5);
        } else {
          processedPath = [...validPoints];
        }

        if (Array.isArray(processedPath) && processedPath.length > 0) {
          if (processedPath.length === 1 && validPoints.length === 1) {
            finalShapePath = processedPath;
          } else if (processedPath.length >= 1) {
            finalShapePath = processedPath;
          }
        }
      }

      let targetFormationObject = {};
      if (
        formations[activeGroupIndex] &&
        typeof formations[activeGroupIndex] === "object" &&
        !Array.isArray(formations[activeGroupIndex]) &&
        formations[activeGroupIndex] !== null
      ) {
        targetFormationObject = formations[activeGroupIndex];
      }

      const existingDancerData = targetFormationObject[dancerId] || {};

      const updateData = {
        ...existingDancerData,
        rawStagePath: finalShapePath,
      };

      const updatedFormationForIndex = {
        ...targetFormationObject,
        [dancerId]: updateData,
      };

      if (typeof onUpdateFormation === "function") {
        onUpdateFormation(activeGroupIndex, updatedFormationForIndex);
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
    getActualStartForFormation,
    pathUtils: { smoothPath, cardinalSpline, getPositionAlongLinearPath, lerp },
  };
};

export default useFormationController;
