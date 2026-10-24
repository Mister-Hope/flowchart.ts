/** A minimal bounding box, matching the shape returned by `SVGGraphicsElement.getBBox()`. */
export interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * A single SVG path command, in the same tuple form raphael exposed: `["M", x, y]`, `["L", x, y]`,
 * `["C", x1, y1, x2, y2, x, y]`, ...
 */
export type PathSegment = [command: string, ...coordinates: number[]];

/** Attribute values accepted by the renderer (everything ends up as a DOM attribute). */
export type AttributeValue = string | number;

export type TextAnchor = "start" | "middle" | "end";

export const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
