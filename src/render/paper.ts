import { MarkerRegistry } from "./markers.js";
import { PathElement } from "./path.js";
import { RectElement } from "./rect.js";
import { SetElement } from "./set.js";
import { TextElement } from "./text.js";
import type { BBox, PathSegment } from "./types.js";
import { SVG_NAMESPACE } from "./types.js";

const DEFAULT_WIDTH = 512;
const DEFAULT_HEIGHT = 342;

let paperSequence = 0;

/**
 * Minimal SVG "paper" replacing raphael: it owns the `<svg>` element and creates shapes, text and
 * groups on demand.
 */
export class Paper {
  readonly canvas: SVGSVGElement;

  readonly defs: SVGDefsElement;

  private readonly markers: MarkerRegistry;

  private readonly document: Document;

  constructor(container: string | HTMLElement, width?: number, height?: number) {
    const element =
      typeof container === "string"
        ? // Oxc prefers querySelector, but container ids come from users and are not
          // guaranteed to be valid CSS selectors; getElementById handles every id.
          // oxlint-disable-next-line unicorn/prefer-query-selector
          document.getElementById(container)
        : container;

    if (element == null) {
      throw new Error(
        `Flowchart container not found: ${typeof container === "string" ? container : container.tagName}`,
      );
    }

    this.document = element.ownerDocument;

    const canvas = this.document.createElementNS(SVG_NAMESPACE, "svg");
    const defs = this.document.createElementNS(SVG_NAMESPACE, "defs");

    canvas.setAttribute("version", "1.1");
    canvas.setAttribute("xmlns", SVG_NAMESPACE);
    canvas.setAttribute("width", String(width ?? DEFAULT_WIDTH));
    canvas.setAttribute("height", String(height ?? DEFAULT_HEIGHT));
    canvas.style.overflow = "hidden";
    canvas.style.position = "relative";
    canvas.append(defs);

    element.prepend(canvas);

    paperSequence += 1;

    this.canvas = canvas;
    this.defs = defs;
    this.markers = new MarkerRegistry(defs, `flowchart-${paperSequence}`);
  }

  path(segments: PathSegment[]): PathElement {
    const node = this.document.createElementNS(SVG_NAMESPACE, "path");
    const element = new PathElement(node, this.markers);

    element.setPath(segments);
    this.canvas.append(node);

    return element;
  }

  rect({ x, y, width, height }: BBox, radius = 0): RectElement {
    const node = this.document.createElementNS(SVG_NAMESPACE, "rect");
    const element = new RectElement(node, radius);

    element.attr({
      x,
      y,
      width,
      height,
      fill: "#ffffff",
      stroke: "#000000",
      "stroke-width": 1,
    });
    this.canvas.append(node);

    return element;
  }

  text(x: number, y: number, text: string): TextElement {
    const node = this.document.createElementNS(SVG_NAMESPACE, "text");
    const element = new TextElement(node, x, y, text);

    this.canvas.append(node);

    return element;
  }

  set(): SetElement {
    const element = new SetElement(this.document);

    this.canvas.append(element.node);

    return element;
  }

  setSize(width: number, height: number): void {
    this.canvas.setAttribute("width", String(width));
    this.canvas.setAttribute("height", String(height));
  }

  setViewBox({ x, y, width, height }: BBox, fit = false): void {
    this.canvas.setAttribute("viewBox", `${x} ${y} ${width} ${height}`);
    this.canvas.setAttribute("preserveAspectRatio", fit ? "xMidYMid meet" : "xMinYMin");
  }
}
