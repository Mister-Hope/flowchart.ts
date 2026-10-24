import { checkLineIntersection } from "../action.js";
import type { PathElement, PathSegment } from "../render/index.js";

interface PathLocation {
  path: PathSegment[];
  index: number;
}

/**
 * Bends the segment at `index` around an intersection with another path, if they cross.
 *
 * @param line Line element whose path is being modified.
 * @param location Path and segment index being checked.
 * @param other Previously drawn path and segment index to check against.
 * @param lineWidth Stroke width used for the bend size.
 * @returns Whether a bend was inserted.
 */
const bendCrossing = (
  line: PathElement,
  location: PathLocation,
  other: PathLocation,
  lineWidth: number,
): boolean => {
  const { path, index } = location;
  const { path: otherPath, index: otherIndex } = other;
  const start = path[index];
  const end = path[index + 1];
  const otherStart = otherPath[otherIndex];
  const otherEnd = otherPath[otherIndex + 1];

  const res = checkLineIntersection(
    { x: otherStart[1], y: otherStart[2] },
    { x: otherEnd[1], y: otherEnd[2] },
    { x: start[1], y: start[2] },
    { x: end[1], y: end[2] },
  );

  if (!res.onLine1 || !res.onLine2 || res.x == null || res.y == null) return false;

  const intersectionX = res.x;
  const intersectionY = res.y;
  let firstSegment: PathSegment, secondSegment: PathSegment;

  if (start[2] === end[2]) {
    const direction = start[1] > end[1] ? 1 : -1;
    const x = intersectionX + direction * lineWidth * 2;

    firstSegment = ["L", x, start[2]];
    secondSegment = [
      "C",
      x,
      start[2],
      intersectionX,
      start[2] - lineWidth * 4,
      intersectionX - direction * lineWidth * 2,
      start[2],
    ];
  } else if (start[2] > end[2]) {
    firstSegment = ["L", start[1], intersectionY + lineWidth * 2];
    secondSegment = [
      "C",
      start[1],
      intersectionY + lineWidth * 2,
      start[1] + lineWidth * 4,
      intersectionY,
      start[1],
      intersectionY - lineWidth * 2,
    ];
  } else {
    firstSegment = ["L", start[1], intersectionY - lineWidth * 2];
    secondSegment = [
      "C",
      start[1],
      intersectionY - lineWidth * 2,
      start[1] + lineWidth * 4,
      intersectionY,
      start[1],
      intersectionY + lineWidth * 2,
    ];
  }

  path.splice(index + 1, 0, firstSegment);
  path.splice(index + 2, 0, secondSegment);
  line.setPath(path);

  return true;
};

/**
 * Curves lines around previously drawn lines they cross (hop-over effect).
 *
 * @param line Line being drawn.
 * @param otherLines Lines that were already drawn.
 * @param lineWidth Stroke width used for the bend size.
 */
export const adjustCrossingLines = (
  line: PathElement,
  otherLines: PathElement[],
  lineWidth: number,
): void => {
  for (const otherLine of otherLines) {
    const otherPath = otherLine.getPath();
    const path = line.getPath();

    for (
      let otherIndex = 0, otherLength = otherPath.length - 1;
      otherIndex < otherLength;
      otherIndex += 1
    ) {
      for (let index = 0, length = path.length - 1; index < length; index += 1) {
        if (bendCrossing(line, { path, index }, { path: otherPath, index: otherIndex }, lineWidth))
          index += 2;
      }
    }
  }
};
