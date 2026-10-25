import { isSafeDomId } from "../security.js";
import { MarkerRegistry } from "./markers.js";
import { PathElement } from "./path.js";
import { RectElement } from "./rect.js";
import { SetElement } from "./set.js";
import { TextElement } from "./text.js";
import type { BBox, PathSegment } from "./types.js";
import { SVG_NAMESPACE } from "./types.js";

const DEFAULT_WIDTH = 512;
const DEFAULT_HEIGHT = 342;

/**
 * Formats an explicit outer size as a CSS length.
 *
 * @param value Size in pixels or as an already formatted CSS length.
 * @returns The CSS length.
 */
const toCssLength = (value: number | string): string =>
  typeof value === "number" ? `${value}px` : value;

let paperSequence = 0;

/**
 * Minimal SVG "paper" replacing raphael: it owns the `<svg>` element and creates shapes, text and
 * groups on demand.
 */
export class Paper {
  readonly canvas: SVGSVGElement;

  readonly defs: SVGDefsElement;

  /** Suffix appended to this chart's node ids so several charts can coexist in one document. */
  idSuffix = "";

  private readonly container: HTMLElement;

  private readonly markers: MarkerRegistry;

  private readonly document: Document;

  /** Offscreen host used to measure charts rendered into a detached container. */
  private measurementHost: HTMLElement | null = null;

  constructor(container: string | HTMLElement) {
    const element =
      typeof container === "string"
        ? document.querySelector<HTMLElement>(`#${CSS.escape(container)}`)
        : container;

    if (element == null) throw new Error("Flowchart container not found.");

    this.container = element;
    this.document = element.ownerDocument;

    const canvas = this.document.createElementNS(SVG_NAMESPACE, "svg");
    const defs = this.document.createElementNS(SVG_NAMESPACE, "defs");

    canvas.setAttribute("version", "1.1");
    canvas.setAttribute("xmlns", SVG_NAMESPACE);
    canvas.setAttribute("width", String(DEFAULT_WIDTH));
    canvas.setAttribute("height", String(DEFAULT_HEIGHT));
    canvas.style.overflow = "hidden";
    canvas.style.position = "relative";
    canvas.append(defs);

    if (element.isConnected) {
      element.prepend(canvas);
    } else {
      const host = this.createMeasurementHost();
      if (host == null) {
        element.prepend(canvas);
      } else {
        host.append(canvas);
        this.measurementHost = host;
      }
    }

    paperSequence += 1;

    this.canvas = canvas;
    this.defs = defs;
    this.markers = new MarkerRegistry(defs, `flowchart-${paperSequence}`);
  }

  /**
   * Resolves the id suffix that keeps this chart's node ids unique in the document.
   *
   * The first chart keeps the original ids (`st`, `stt`, ...). A chart whose ids are already taken
   * gets a numeric suffix (`st-2`, `stt-2`, ...), so `getElementById` and CSS id selectors keep
   * addressing the right chart when several charts share node keys.
   *
   * @param keys Node keys rendered by this chart.
   * @returns `""` when the ids are free, otherwise `-2`, `-3`, ...
   */
  resolveIdSuffix(keys: string[]): string {
    const candidates = keys.flatMap((key) => [key, `${key}t`]).filter((id) => isSafeDomId(id));
    const existingIds = new Set(
      [...this.document.querySelectorAll("[id]")].map((element) => element.id),
    );

    let index = 1;

    const collides = (): boolean => {
      const suffix = index === 1 ? "" : `-${index}`;

      return candidates.some((id) => {
        const candidate = `${id}${suffix}`;

        return isSafeDomId(candidate) && existingIds.has(candidate);
      });
    };

    while (collides()) index += 1;

    return index === 1 ? "" : `-${index}`;
  }

  /**
   * Creates a temporary offscreen host so a detached container can still use native text metrics.
   *
   * @returns The host appended to the document body, or `null` when no body is available.
   */
  private createMeasurementHost(): HTMLElement | null {
    const { body } = this.document;
    if (body == null) return null;

    const host = this.document.createElement("div");

    host.dataset.flowchartMeasure = "";
    host.style.position = "absolute";
    host.style.top = "-100000px";
    host.style.left = "0";
    host.style.pointerEvents = "none";
    body.append(host);

    return host;
  }

  /**
   * Moves the finished canvas into the target container after layout measurements are done.
   *
   * Detached containers are rendered inside an offscreen host first, so native `getBBox()` values
   * are used for layout; this moves the result into the real container and removes the host.
   */
  attach(): void {
    if (this.measurementHost == null) return;

    this.container.prepend(this.canvas);
    this.measurementHost.remove();
    this.measurementHost = null;
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

    element.setAttrs({
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

  setViewBox({ x, y, width, height }: BBox): void {
    this.canvas.setAttribute("viewBox", `${x} ${y} ${width} ${height}`);
    this.canvas.setAttribute("preserveAspectRatio", "xMidYMid meet");
  }

  /**
   * Applies the explicit outer size from the `width` / `height` draw options.
   *
   * The viewBox keeps describing the content, so the browser scales the chart into the requested
   * box and `preserveAspectRatio` keeps it undistorted. A missing dimension follows the content
   * aspect ratio; CSS lengths such as `"100%"` make the chart responsive by leaving the other
   * dimension at `auto`.
   *
   * @param width Requested width, in pixels or as a CSS length.
   * @param height Requested height, in pixels or as a CSS length.
   * @param contentWidth Width of the viewBox content.
   * @param contentHeight Height of the viewBox content.
   */
  setOuterSize(
    width: number | string | undefined,
    height: number | string | undefined,
    contentWidth: number,
    contentHeight: number,
  ): void {
    const ratio = contentHeight / contentWidth;

    if (width != null) {
      this.canvas.style.width = toCssLength(width);

      if (height == null)
        this.canvas.style.height = typeof width === "number" ? `${width * ratio}px` : "auto";
      else this.canvas.style.height = toCssLength(height);

      return;
    }

    if (height == null) return;

    this.canvas.style.height = toCssLength(height);
    this.canvas.style.width = typeof height === "number" ? `${height / ratio}px` : "auto";
  }
}
