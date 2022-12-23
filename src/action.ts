import { FlowChart } from "./chart";

import type { RaphaelPath, RaphaelTextAnchorType } from "raphael";
import type { Position } from "./symbol/symbol";

export const drawPath = (
  chart: FlowChart,
  location: Position,
  points: Position[]
): RaphaelPath<"SVG" | "VML"> => {
  let path = "M{0},{1}";

  for (let i = 2; i < 2 * points.length + 2; i += 2)
    path += ` L{${i}},{${i + 1}}`;

  const pathValues = [location.x, location.y];

  for (let i = 0; i < points.length; i++)
    pathValues.push(points[i].x, points[i].y);

  // @ts-ignore
  const symbol = chart.paper.path(path, pathValues);
  symbol.attr("stroke", chart.options["element-color"]);
  symbol.attr("stroke-width", chart.options["line-width"]);

  const font = chart.options.font;
  const fontFamily = chart.options["font-family"];
  const fontWeight = chart.options["font-weight"];

  if (font) symbol.attr({ font: font });
  if (fontFamily) symbol.attr({ "font-family": fontFamily });
  if (fontWeight) symbol.attr({ "font-weight": fontWeight });

  return symbol;
};

export const drawLine = (
  chart: FlowChart,
  from: Position,
  to: Position[],
  text: string
): RaphaelPath<"SVG" | "VML"> => {
  let path = "M{0},{1}";

  for (let i = 2; i < 2 * to.length + 2; i += 2) path += ` L{${i}},{${i + 1}}`;

  const pathValues = [from.x, from.y];

  for (let i = 0; i < to.length; i++) pathValues.push(to[i].x, to[i].y);

  // @ts-ignore
  const line = chart.paper.path(path, pathValues);
  line.attr({
    stroke: chart.options["line-color"],
    "stroke-width": chart.options["line-width"],
    "arrow-end": chart.options["arrow-end"],
  });

  const font = chart.options.font;
  const fontFamily = chart.options["font-family"];
  const fontWeight = chart.options["font-weight"];

  if (font) line.attr({ font: font });
  if (fontFamily) line.attr({ "font-family": fontFamily });
  if (fontWeight) line.attr({ "font-weight": fontWeight });

  if (text) {
    const centerText = false;

    const textPath = chart.paper.text(0, 0, text);
    let textAnchor: RaphaelTextAnchorType = "start";

    let isHorizontal = false;
    const firstTo = to[0];

    if (from.y === firstTo.y) isHorizontal = true;

    let x = 0,
      y = 0;

    if (centerText) {
      if (from.x > firstTo.x) x = from.x - (from.x - firstTo.x) / 2;
      else x = firstTo.x - (firstTo.x - from.x) / 2;

      if (from.y > firstTo.y) y = from.y - (from.y - firstTo.y) / 2;
      else y = firstTo.y - (firstTo.y - from.y) / 2;

      if (isHorizontal) {
        x -= textPath.getBBox().width / 2;
        y -= chart.options["text-margin"];
      } else {
        x += chart.options["text-margin"];
        y -= textPath.getBBox().height / 2;
      }
    } else {
      x = from.x;
      y = from.y;

      if (isHorizontal) {
        if (from.x > firstTo.x) {
          x -= chart.options["text-margin"] / 2;
          textAnchor = "end";
        } else x += chart.options["text-margin"] / 2;

        y -= chart.options["text-margin"];
      } else {
        x += chart.options["text-margin"] / 2;
        y += chart.options["text-margin"];
        if (from.y > firstTo.y) y -= chart.options["text-margin"] * 2;
      }
    }

    textPath.attr({
      "text-anchor": textAnchor,
      "font-size": chart.options["font-size"],
      fill: chart.options["font-color"],
      x,
      y,
    });

    if (font) textPath.attr({ font: font });
    if (fontFamily) textPath.attr({ "font-family": fontFamily });
    if (fontWeight) textPath.attr({ "font-weight": fontWeight });
  }

  return line;
};

export interface LineIntersectionResult {
  x: number | null;
  y: number | null;
  onLine1: boolean;
  onLine2: boolean;
}

export const checkLineIntersection = (
  line1StartX: number,
  line1StartY: number,
  line1EndX: number,
  line1EndY: number,
  line2StartX: number,
  line2StartY: number,
  line2EndX: number,
  line2EndY: number
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
  const numerator1 =
    (line2EndX - line2StartX) * yDistance -
    (line2EndY - line2StartY) * xDistance;
  const numerator2 =
    (line1EndX - line1StartX) * yDistance -
    (line1EndY - line1StartY) * xDistance;

  const a = numerator1 / denominator;
  const b = numerator2 / denominator;

  // if we cast these lines infinitely in both directions, they intersect here:
  result.x = line1StartX + a * (line1EndX - line1StartX);
  result.y = line1StartY + a * (line1EndY - line1StartY);
  /*
  // it is worth noting that this should be the same as:
  x = line2StartX + (b * (line2EndX - line2StartX));
  y = line2StartX + (b * (line2EndY - line2StartY));
  */
  // if line1 is a segment and line2 is infinite, they intersect if:
  if (a > 0 && a < 1) result.onLine1 = true;

  // if line2 is a segment and line1 is infinite, they intersect if:
  if (b > 0 && b < 1) result.onLine2 = true;

  // if line1 and line2 are segments, they intersect if both of the above are true
  return result;
};
