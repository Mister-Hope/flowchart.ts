import { SVG_NAMESPACE } from "./types.js";

type ArrowType = "block" | "classic" | "diamond" | "none" | "open" | "oval";

interface ArrowSpec {
  type: ArrowType;
  /** Marker viewport size along the line, in stroke-width units. */
  width: number;
  /** Marker viewport size across the line, in stroke-width units. */
  height: number;
  /** Marker reference point for line ends. */
  endRefX: number;
  /** Marker reference point for line starts. */
  startRefX: number;
  /** Distance to cut off the line so the arrow tip lands on the original end. */
  trim: number;
  /** Scale reference used by raphael's marker paths (5, or 7 for open arrows). */
  source: number;
}

export interface ArrowMarker {
  /** Value for `marker-start` / `marker-end`. */
  url: string;
  /** Distance to trim from the corresponding path end, in user units. */
  trim: number;
}

/** Marker shape paths, kept identical to raphael's so existing flowcharts look the same. */
const ARROW_PATHS: Record<string, string> = {
  block: "M5,0 0,2.5 5,5z",
  classic: "M5,0 0,2.5 5,5 3.5,3 3.5,2z",
  diamond: "M2.5,0 5,2.5 2.5,5 0,2.5z",
  open: "M6,1 1,3.5 6,6",
  oval: "M2.5,0A2.5,2.5,0,0,1,2.5,5 2.5,2.5,0,0,1,2.5,0z",
};

const parseArrowSpec = (spec: string, strokeWidth: number): ArrowSpec | null => {
  let type: ArrowType = "classic";
  let width = 3;
  let height = 3;
  let source = 5;

  for (const value of spec.toLowerCase().split("-")) {
    switch (value) {
      case "block":
      case "classic":
      case "diamond":
      case "none":
      case "open":
      case "oval": {
        type = value;
        break;
      }
      case "wide": {
        height = 5;
        break;
      }
      case "narrow": {
        height = 2;
        break;
      }
      case "long": {
        width = 5;
        break;
      }
      case "short": {
        width = 2;
        break;
      }
      default: {
        break;
      }
    }
  }

  if (type === "none") return null;

  if (type === "open") {
    width += 2;
    height += 2;
    source += 2;

    return { type, width, height, endRefX: 4, startRefX: 1, trim: strokeWidth, source };
  }

  const trim = type === "diamond" || type === "oval" ? 0 : (width / 2) * strokeWidth;

  return { type, width, height, endRefX: width / 2, startRefX: width / 2, trim, source };
};

/**
 * Creates and caches SVG arrow markers.
 *
 * The markup mirrors raphael's marker construction (same shape paths, viewport sizes, reference
 * points and path trimming) so migrated charts keep their arrowheads.
 */
export class MarkerRegistry {
  private readonly cache = new Map<string, string>();

  private readonly shapes = new Map<string, string>();

  private sequence = 0;

  constructor(
    private readonly defs: SVGDefsElement,
    private readonly prefix: string,
  ) {}

  getMarker(
    kind: "end" | "start",
    spec: string,
    stroke: string,
    strokeWidth: number,
  ): ArrowMarker | null {
    if (spec === "" || spec === "none" || stroke === "" || stroke === "none") return null;

    const arrow = parseArrowSpec(spec, strokeWidth);

    if (arrow == null) return null;

    const key = `${kind}|${arrow.type}|${arrow.width}|${arrow.height}|${stroke}`;
    let url = this.cache.get(key);

    if (url == null) {
      url = this.createMarker(kind, arrow, stroke);
      this.cache.set(key, url);
    }

    return { url, trim: arrow.trim };
  }

  private getShape(type: string): string {
    const shapeId = this.shapes.get(type);

    if (shapeId != null) return shapeId;

    const id = `${this.prefix}-arrow-${type}`;
    const document = this.defs.ownerDocument;
    const path = document.createElementNS(SVG_NAMESPACE, "path");

    path.setAttribute("id", id);
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("d", ARROW_PATHS[type] ?? ARROW_PATHS.classic);
    this.defs.append(path);
    this.shapes.set(type, id);

    return id;
  }

  private createMarker(kind: "end" | "start", arrow: ArrowSpec, stroke: string): string {
    this.sequence += 1;

    const document = this.defs.ownerDocument;
    const id = `${this.prefix}-marker-${this.sequence}`;
    const marker = document.createElementNS(SVG_NAMESPACE, "marker");
    const use = document.createElementNS(SVG_NAMESPACE, "use");

    marker.setAttribute("id", id);
    marker.setAttribute("markerWidth", String(arrow.width));
    marker.setAttribute("markerHeight", String(arrow.height));
    marker.setAttribute("orient", "auto");
    marker.setAttribute("refX", String(kind === "end" ? arrow.endRefX : arrow.startRefX));
    marker.setAttribute("refY", String(arrow.height / 2));

    const rotation = kind === "end" ? `rotate(180 ${arrow.width / 2} ${arrow.height / 2}) ` : "";

    use.setAttribute("href", `#${this.getShape(arrow.type)}`);
    use.setAttribute(
      "transform",
      `${rotation}scale(${arrow.width / arrow.source},${arrow.height / arrow.source})`,
    );
    use.setAttribute(
      "stroke-width",
      (1 / ((arrow.width / arrow.source + arrow.height / arrow.source) / 2)).toFixed(4),
    );

    if (arrow.type === "open") {
      use.setAttribute("fill", "none");
      use.setAttribute("stroke", stroke);
    } else {
      use.setAttribute("fill", stroke);
      use.setAttribute("stroke", "none");
    }

    marker.append(use);
    this.defs.append(marker);

    return `url(#${id})`;
  }
}
