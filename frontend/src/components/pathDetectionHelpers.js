const pointToLineDistance = (point, lineStart, lineEnd) => {
  const A = point.x - lineStart.x;
  const B = point.y - lineStart.y;
  const C = lineEnd.x - lineStart.x;
  const D = lineEnd.y - lineStart.y;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  if (lenSq !== 0) param = dot / lenSq;

  let xx, yy;

  if (param < 0) {
    xx = lineStart.x;
    yy = lineStart.y;
  } else if (param > 1) {
    xx = lineEnd.x;
    yy = lineEnd.y;
  } else {
    xx = lineStart.x + param * C;
    yy = lineStart.y + param * D;
  }

  const dx = point.x - xx;
  const dy = point.y - yy;

  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Ramer-Douglas-Peucker algorithm for path simplification
 */
const simplifyPath = (points, epsilon = 2) => {
  if (points.length <= 2) return points;

  // Find the point with the maximum distance
  let dmax = 0;
  let index = 0;
  const end = points.length - 1;

  for (let i = 1; i < end; i++) {
    const d = pointToLineDistance(points[i], points[0], points[end]);
    if (d > dmax) {
      index = i;
      dmax = d;
    }
  }

  // If max distance is greater than epsilon, recursively simplify
  if (dmax > epsilon) {
    const recResults1 = simplifyPath(points.slice(0, index + 1), epsilon);
    const recResults2 = simplifyPath(points.slice(index), epsilon);

    // Build the result list
    return recResults1.slice(0, -1).concat(recResults2);
  } else {
    return [points[0], points[end]];
  }
};

/**
 * Chaikin's algorithm for curve smoothing
 */
const chaikinSmooth = (points, iterations = 2) => {
  if (points.length < 3) return points;

  let smoothed = [...points];

  for (let iter = 0; iter < iterations; iter++) {
    const newPoints = [smoothed[0]]; // Keep first point

    for (let i = 0; i < smoothed.length - 1; i++) {
      const p1 = smoothed[i];
      const p2 = smoothed[i + 1];

      // Quarter points
      const q = {
        x: 0.75 * p1.x + 0.25 * p2.x,
        y: 0.75 * p1.y + 0.25 * p2.y,
      };
      const r = {
        x: 0.25 * p1.x + 0.75 * p2.x,
        y: 0.25 * p1.y + 0.75 * p2.y,
      };

      newPoints.push(q, r);
    }

    newPoints.push(smoothed[smoothed.length - 1]); // Keep last point
    smoothed = newPoints;
  }

  return smoothed;
};

/**
 * Detects corner points (direction changes) in a path
 */
const detectCorners = (rawPoints, angleThreshold = 45, minSegmentLength = 20) => {
  if (rawPoints.length < 3) return [0, rawPoints.length - 1];

  const corners = [0];

  for (let i = 2; i < rawPoints.length - 1; i++) {
    const lookback = Math.min(i, 3);
    const prev = rawPoints[i - lookback];
    const curr = rawPoints[i];
    const next = rawPoints[Math.min(i + lookback, rawPoints.length - 1)];

    // Calculate angle between vectors
    const v1x = curr.x - prev.x;
    const v1y = curr.y - prev.y;
    const v2x = next.x - curr.x;
    const v2y = next.y - curr.y;

    const dot = v1x * v2x + v1y * v2y;
    const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
    const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);

    if (mag1 < 5 || mag2 < 5) continue;

    const cosAngle = dot / (mag1 * mag2);
    const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);

    if (angle > angleThreshold) {
      const lastCornerIdx = corners[corners.length - 1];
      const distFromLastCorner = Math.hypot(
        rawPoints[i].x - rawPoints[lastCornerIdx].x,
        rawPoints[i].y - rawPoints[lastCornerIdx].y
      );

      if (distFromLastCorner > minSegmentLength) {
        corners.push(i);
      }
    }
  }

  corners.push(rawPoints.length - 1);
  return corners;
};

/**
 * Snaps endpoint to nearest cardinal/diagonal angle if close enough
 */
const snapToAngleIfClose = (startPoint, endPoint, snapAngles = [0, 90, 180, 270], tolerance = 8) => {
  const dx = endPoint.x - startPoint.x;
  const dy = endPoint.y - startPoint.y;
  const distance = Math.hypot(dx, dy);

  if (distance < 5) return endPoint;

  let angle = Math.atan2(dy, dx) * (180 / Math.PI);
  if (angle < 0) angle += 360;

  let closestAngle = null;
  let minDiff = tolerance;

  for (const snapAngle of snapAngles) {
    let diff = Math.abs(angle - snapAngle);
    if (diff > 180) diff = 360 - diff;

    if (diff < minDiff) {
      minDiff = diff;
      closestAngle = snapAngle;
    }
  }

  if (closestAngle !== null) {
    const radians = closestAngle * (Math.PI / 180);
    return {
      x: startPoint.x + distance * Math.cos(radians),
      y: startPoint.y + distance * Math.sin(radians),
    };
  }

  return endPoint;
};

/**
 * Main function that analyzes a gesture and returns processed path with metadata
 */
export const derivePathFromGesture = (rawPoints, options = {}) => {
  const {
    shiftKey = false,
    altKey = false,
    pathModeHint = "auto", // 'auto', 'direct', 'curved'
    straightThreshold = 5 * (window.devicePixelRatio || 1),
    axisLockThreshold = 5,
    simplifyEpsilon = 3,
    smoothingIterations = 2,
  } = options;

  // Validate input
  if (!rawPoints || rawPoints.length === 0) {
    return { kind: "empty", points: [] };
  }

  if (rawPoints.length === 1) {
    return { kind: "hold", points: [rawPoints[0]] };
  }

  const startPoint = rawPoints[0];
  const endPoint = rawPoints[rawPoints.length - 1];

  // If user explicitly chose linear mode, skip straight detection
  if (pathModeHint === "direct") {
    return { kind: "straight", points: [startPoint, endPoint] };
  }

  // NEW: Multi-segment straight path detection (if Shift held)
  if (shiftKey && pathModeHint !== "curved" && rawPoints.length > 10) {
    const cornerIndices = detectCorners(rawPoints, 45, 20);

    if (cornerIndices.length > 2) {
      const finalPoints = [rawPoints[0]];

      for (let i = 0; i < cornerIndices.length - 1; i++) {
        const segmentStart = rawPoints[cornerIndices[i]];
        const segmentEnd = rawPoints[cornerIndices[i + 1]];

        const dx = Math.abs(segmentEnd.x - segmentStart.x);
        const dy = Math.abs(segmentEnd.y - segmentStart.y);

        // Snap each segment to dominant axis
        if (dx > dy) {
          finalPoints.push({ x: segmentEnd.x, y: segmentStart.y });
        } else {
          finalPoints.push({ x: segmentStart.x, y: segmentEnd.y });
        }
      }

      return {
        kind: "straight",
        subKind: "multi-segment",
        points: finalPoints,
      };
    }
  }

  // Test 1: Almost straight?
  if (pathModeHint !== "curved") {
    let maxDistance = 0;

    for (let i = 1; i < rawPoints.length - 1; i++) {
      const distance = pointToLineDistance(rawPoints[i], startPoint, endPoint);
      maxDistance = Math.max(maxDistance, distance);
    }

    if (maxDistance <= straightThreshold) {
      // It's a straight line!
      // Check for axis-lock if shift key was pressed
      if (shiftKey) {
        const dx = Math.abs(endPoint.x - startPoint.x);
        const dy = Math.abs(endPoint.y - startPoint.y);

        if (dx < axisLockThreshold) {
          // Vertical line
          return {
            kind: "straight",
            subKind: "vertical",
            points: [startPoint, { x: startPoint.x, y: endPoint.y }],
          };
        } else if (dy < axisLockThreshold) {
          // Horizontal line
          return {
            kind: "straight",
            subKind: "horizontal",
            points: [startPoint, { x: endPoint.x, y: startPoint.y }],
          };
        } else {
          // NEW: Snap to cardinal + diagonal angles
          const snappedEnd = snapToAngleIfClose(
            startPoint,
            endPoint,
            [0, 45, 90, 135, 180, 225, 270, 315],
            8
          );

          return {
            kind: "straight",
            subKind: snappedEnd !== endPoint ? "angle-snapped" : "straight",
            points: [startPoint, snappedEnd],
          };
        }
      }

      return { kind: "straight", points: [startPoint, endPoint] };
    }
  }

  // Test 2: Axis-lock for curves (if shift pressed)
  if (shiftKey && pathModeHint !== "curved") {
    const dx = Math.abs(endPoint.x - startPoint.x);
    const dy = Math.abs(endPoint.y - startPoint.y);

    // Check if the path is predominantly horizontal or vertical
    const isMainlyHorizontal = dx > dy * 2;
    const isMainlyVertical = dy > dx * 2;

    if (isMainlyHorizontal || isMainlyVertical) {
      // Constrain all points to the dominant axis
      const constrainedPoints = rawPoints.map((p) => {
        if (isMainlyHorizontal) {
          return { x: p.x, y: startPoint.y };
        } else {
          return { x: startPoint.x, y: p.y };
        }
      });

      // Simplify the constrained path
      const simplified = simplifyPath(constrainedPoints, simplifyEpsilon);

      return {
        kind: "curve",
        subKind: isMainlyHorizontal ? "horizontal-locked" : "vertical-locked",
        points: simplified,
      };
    }
  }

  // Test 3: Smooth curve
  // First simplify to remove noise
  const simplified = simplifyPath(rawPoints, simplifyEpsilon);

  // Then smooth the simplified path
  const smoothed = chaikinSmooth(simplified, smoothingIterations);

  // Optional: Further reduce points if there are too many
  const finalPoints =
    smoothed.length > 50
      ? simplifyPath(smoothed, simplifyEpsilon * 1.5)
      : smoothed;

  return {
    kind: "curve",
    points: finalPoints,
  };
};

/**
 * Debug visualization helper - draws the analysis on a canvas
 */
export const visualizePathAnalysis = (ctx, rawPoints, processedResult) => {
  if (!ctx || !rawPoints || rawPoints.length === 0) return;

  // Draw raw points in light gray
  ctx.strokeStyle = "#ccc";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(rawPoints[0].x, rawPoints[0].y);
  for (let i = 1; i < rawPoints.length; i++) {
    ctx.lineTo(rawPoints[i].x, rawPoints[i].y);
  }
  ctx.stroke();

  // Draw raw points as dots
  ctx.fillStyle = "#ddd";
  rawPoints.forEach((p) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
    ctx.fill();
  });

  // Draw processed path
  if (processedResult && processedResult.points.length > 0) {
    ctx.strokeStyle = processedResult.kind === "straight" ? "#00f" : "#f00";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(processedResult.points[0].x, processedResult.points[0].y);
    for (let i = 1; i < processedResult.points.length; i++) {
      ctx.lineTo(processedResult.points[i].x, processedResult.points[i].y);
    }
    ctx.stroke();

    // Draw processed points
    ctx.fillStyle = processedResult.kind === "straight" ? "#00f" : "#f00";
    processedResult.points.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }
};
