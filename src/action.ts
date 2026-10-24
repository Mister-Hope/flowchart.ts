import type FlowChart from "./chart.js";
import type { PathElement, PathSegment, Renderable, TextAnchor } from "./render/index.js";
import type { Position } from "./typings.js";

export interface LineIntersectionResult {
  x: number | null;
  y: number | null;
  onLine1: boolean;
  onLine2: boolean;
}

// eslint-disable-next-line max-params -- the 8 positional coordinates are part of the existing call signature
export const checkLineIntersection = (
  line1StartX: number,
  line1StartY: number,
  line1EndX: number,
  line1EndY: number,
  line2StartX: number,
  line2StartY: number,
  line2EndX: number,
  line2EndY: number,
): LineIntersectionResult => {
  // if the lines intersect, the result contains the x and y of the intersection (treating the lines as infinite) and booleans for whether line segment 1 or line segment 2 contain the point
  const result: LineIntersectionResult = {
    x: null,
    y: null,
    onLine1: false,
    onLine2: false,
  };
  const denominator =
    (line2EndY - line2StartY) * (line1EndX - line1StartX) -
    (line2EndX - line2StartX) * (line1EndY - line1StartY);

  if (denominator === 0) return result;

  const yDistance = line1StartY - line2StartY;
  const xDistance = line1StartX - line2StartX;
  const numerator1 = (line2EndX - line2StartX) * yDistance - (line2EndY - line2StartY) * xDistance;
  const numerator2 = (line1EndX - line1StartX) * yDistance - (line1EndY - line1StartY) * xDistance;

  const a = numerator1 / denominator;
  const b = numerator2 / denominator;

  // if we cast these lines infinitely in both directions, they intersect here:
  result.x = line1StartX + a * (line1EndX - line1StartX);
  result.y = line1StartY + a * (line1EndY - line1StartY);

  // if line1 is a segment and line2 is infinite, they intersect if:
  if (a > 0 && a < 1) result.onLine1 = true;

  // if line2 is a segment and line1 is infinite, they intersect if:
  if (b > 0 && b < 1) result.onLine2 = true;

  // if line1 and line2 are segments, they intersect if both of the above are true
  return result;
};

const buildPath = (points: Position[]): PathSegment[] =>
  points.map(({ x, y }, index): PathSegment => (index === 0 ? ["M", x, y] : ["L", x, y]));

const applyFont = (chart: FlowChart, element: Renderable): void => {
  const { font } = chart.options;
  const fontFamily = chart.options["font-family"];
  const fontWeight = chart.options["font-weight"];

  if (font != null) element.attr("font", font);
  if (fontFamily != null) element.attr("font-family", fontFamily);
  if (fontWeight != null) element.attr("font-weight", fontWeight);
};

export const drawPath = (chart: FlowChart, location: Position, points: Position[]): PathElement => {
  const symbol = chart.paper.path(buildPath([location, ...points]));

  symbol.attr({
    stroke: chart.options["element-color"],
    "stroke-width": chart.options["line-width"],
  });

  applyFont(chart, symbol);

  return symbol;
};

export const drawLine = (
  chart: FlowChart,
  from: Position,
  to: Position[],
  text: string,
): PathElement => {
  const line = chart.paper.path(buildPath([from, ...to]));

  line.attr({
    stroke: chart.options["line-color"],
    "stroke-width": chart.options["line-width"],
    "arrow-end": chart.options["arrow-end"],
  });

  applyFont(chart, line);

  if (text !== "") {
    const textPath = chart.paper.text(0, 0, text);
    let textAnchor: TextAnchor = "start";

    const [firstTo] = to;
    const isHorizontal = firstTo != null && from.y === firstTo.y;

    let { x } = from;
    let { y } = from;

    if (isHorizontal) {
      if (firstTo != null && from.x > firstTo.x) {
        x -= chart.options["text-margin"] / 2;
        textAnchor = "end";
      } else {
        x += chart.options["text-margin"] / 2;
      }

      y -= chart.options["text-margin"];
    } else {
      x += chart.options["text-margin"] / 2;
      y += chart.options["text-margin"];
      if (firstTo != null && from.y > firstTo.y) y -= chart.options["text-margin"] * 2;
    }

    textPath.attr({
      "text-anchor": textAnchor,
      "font-size": chart.options["font-size"],
      fill: chart.options["font-color"],
      x,
      y,
    });

    applyFont(chart, textPath);
  }

  return line;
};
