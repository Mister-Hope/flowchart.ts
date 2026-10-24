import { Renderable, toNumber } from "./element.js";
import type { MarkerRegistry } from "./markers.js";
import { measureNativeBBox } from "./text-metrics.js";
import type { AttributeValue, BBox, PathSegment } from "./types.js";

const PATH_COMMAND_REGEXP = /(?<command>[a-z])(?<coordinates>[^a-z]*)/giu;
const PATH_NUMBER_REGEXP = /-?\d*\.?\d+(?:e[-+]?\d+)?/giu;

export const parsePath = (path: string): PathSegment[] => {
  const segments: PathSegment[] = [];

  for (const match of path.matchAll(PATH_COMMAND_REGEXP)) {
    const command = (match.groups?.command ?? "").toUpperCase();
    const coordinates = (match.groups?.coordinates?.match(PATH_NUMBER_REGEXP) ?? []).map(Number);

    segments.push([command, ...coordinates]);
  }

  return segments;
};

export const serializePath = (segments: PathSegment[]): string =>
  segments.map(([command, ...coordinates]) => `${command}${coordinates.join(",")}`).join("");

const pathBBox = (segments: PathSegment[]): BBox => {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const [, ...coordinates] of segments) {
    for (let index = 0; index + 1 < coordinates.length; index += 2) {
      minX = Math.min(minX, coordinates[index]);
      minY = Math.min(minY, coordinates[index + 1]);
      maxX = Math.max(maxX, coordinates[index]);
      maxY = Math.max(maxY, coordinates[index + 1]);
    }
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return { x: 0, y: 0, width: 0, height: 0 };

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
};

const shortenStart = (segment: PathSegment, next: PathSegment, distance: number): PathSegment => {
  const startX = toNumber(segment[1]);
  const startY = toNumber(segment[2]);
  const endX = toNumber(next[1]);
  const endY = toNumber(next[2]);
  const length = Math.hypot(endX - startX, endY - startY);

  if (length === 0 || distance >= length) return segment;

  const ratio = distance / length;

  return ["M", startX + (endX - startX) * ratio, startY + (endY - startY) * ratio];
};

const shortenEnd = (segment: PathSegment, previous: PathSegment, distance: number): PathSegment => {
  const endX = toNumber(segment[1]);
  const endY = toNumber(segment[2]);
  const previousX = toNumber(previous[previous.length - 2]);
  const previousY = toNumber(previous[previous.length - 1]);
  const length = Math.hypot(endX - previousX, endY - previousY);

  if (length === 0 || distance >= length) return segment;

  const ratio = distance / length;

  return ["L", endX - (endX - previousX) * ratio, endY - (endY - previousY) * ratio];
};

/**
 * Cuts the arrow-trim distance off the start / end of the path, the same way raphael does when it
 * attaches a marker, so the arrow tip lands exactly on the original end point.
 *
 * @param segments Path commands to trim.
 * @param startTrim Distance to cut off the start of the path.
 * @param endTrim Distance to cut off the end of the path.
 * @returns The trimmed path commands.
 */
const trimPath = (segments: PathSegment[], startTrim: number, endTrim: number): PathSegment[] => {
  if (segments.length < 2) return segments;

  const result = segments.map(
    ([command, ...coordinates]) => [command, ...coordinates] as PathSegment,
  );

  const [first, second] = result;

  if (startTrim > 0 && first[0] === "M" && second[0] === "L")
    result[0] = shortenStart(first, second, startTrim);

  const lastIndex = result.length - 1;
  const last = result[lastIndex];
  const previous = result[lastIndex - 1];

  if (endTrim > 0 && last != null && last[0] === "L" && previous != null)
    result[lastIndex] = shortenEnd(last, previous, endTrim);

  return result;
};

export class PathElement extends Renderable {
  private segments: PathSegment[] = [];

  private startTrim = 0;

  private endTrim = 0;

  constructor(
    node: SVGPathElement,
    private readonly markers: MarkerRegistry,
  ) {
    super(node);

    this.attributes.fill = "none";
    this.attributes.stroke = "#000000";
    this.node.setAttribute("fill", "none");
    this.node.setAttribute("stroke", "#000000");
  }

  /**
   * The full path, without the arrow-trim applied.
   *
   * @returns The path commands as last set on the element.
   */
  getPath(): PathSegment[] {
    return this.segments;
  }

  setPath(segments: PathSegment[]): void {
    this.segments = segments;
    this.renderPath();
  }

  override getBBox(): BBox {
    return measureNativeBBox(this.node as unknown as SVGGraphicsElement) ?? pathBBox(this.segments);
  }

  protected override setAttribute(name: string, value: AttributeValue): void {
    this.attributes[name] = value;

    switch (name) {
      case "path": {
        this.setPath(parsePath(String(value)));
        break;
      }
      case "arrow-end":
      case "arrow-start":
      case "stroke":
      case "stroke-width": {
        if (name === "stroke" || name === "stroke-width")
          this.node.setAttribute(name, String(value));
        this.updateMarkers();
        break;
      }
      default: {
        super.setAttribute(name, value);
        break;
      }
    }
  }

  private renderPath(): void {
    this.node.setAttribute(
      "d",
      serializePath(trimPath(this.segments, this.startTrim, this.endTrim)),
    );
  }

  private updateMarkers(): void {
    const strokeWidth = toNumber(this.attributes["stroke-width"], 3);
    const stroke = String(this.attributes.stroke ?? "#000000");
    const end = this.markers.getMarker(
      "end",
      String(this.attributes["arrow-end"] ?? "none"),
      stroke,
      strokeWidth,
    );
    const start = this.markers.getMarker(
      "start",
      String(this.attributes["arrow-start"] ?? "none"),
      stroke,
      strokeWidth,
    );

    this.endTrim = end?.trim ?? 0;
    this.startTrim = start?.trim ?? 0;

    if (end == null) this.node.removeAttribute("marker-end");
    else this.node.setAttribute("marker-end", end.url);

    if (start == null) this.node.removeAttribute("marker-start");
    else this.node.setAttribute("marker-start", start.url);

    this.renderPath();
  }
}
