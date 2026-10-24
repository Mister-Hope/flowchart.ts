import { drawPath } from "../action.js";
import type FlowChart from "../chart.js";
import type { Direction, LineStyle, SymbolOptions, SymbolType } from "../options.js";
import type {
  AttributeValue,
  PathElement,
  RectElement,
  Renderable,
  SetElement,
  TextElement,
} from "../render/index.js";
import { FlowchartSecurityError, isSafeDomId, sanitizeLineStyle } from "../security.js";
import type { Position } from "../typings.js";
import { adjustCrossingLines } from "./crossing.js";
import { routeConnection } from "./line-routing.js";
import { applyNodeCallback, applyNodeLink } from "./node-links.js";
import { placeBeside } from "./placement.js";

/** Value types of the known style/option keys, so lookups do not need casts. */
interface StyleValues {
  x: number;
  y: number;
  "text-margin": number;
  font: string;
  "font-family": string;
  "font-weight": string | number;
  "font-size": number;
  "font-color": string;
  "line-width": number;
  "line-length": number;
  "line-color": string;
  "element-color": string;
  fill: string;
  "yes-text": string;
  "no-text": string;
  "arrow-end": string;
  "arrow-start": string;
  "arrow-text": string;
  class: string;
  scale: number;
  maxWidth: number;
  roundness: number;
}

export class FlowChartSymbol {
  text: TextElement;

  params: Record<string, string>;

  leftLines: PathElement[] = [];

  rightLines: PathElement[] = [];

  topLines: PathElement[] = [];

  bottomLines: PathElement[] = [];

  group: SetElement;

  symbolType?: SymbolType;

  flowstate: string;

  key: string;

  lineStyle: Record<string, LineStyle>;

  next?: FlowChartSymbol;

  thenHandler?: (nextSymbol: FlowChartSymbol) => FlowChartSymbol;

  /** Child symbols connected through the four directions (used by condition / parallel). */
  top_symbol?: FlowChartSymbol;

  bottom_symbol?: FlowChartSymbol;

  left_symbol?: FlowChartSymbol;

  right_symbol?: FlowChartSymbol;

  direction_next: Direction | undefined;

  isPositioned?: boolean;

  width = 0;

  height = 0;

  leftEnd?: boolean;

  pathOk?: boolean;

  constructor(
    public readonly chart: FlowChart,
    options: Partial<SymbolOptions>,
    symbol?: PathElement | RectElement,
  ) {
    this.group = chart.paper.set();
    this.symbolType = options.symbolType;
    this.flowstate = options.flowstate ?? "future";
    this.lineStyle = options.lineStyle ?? {};
    this.key = options.key ?? "";
    this.params = options.params ?? {};

    if (options.next != null && options.direction_next != null)
      this.direction_next = options.direction_next;

    this.text = chart.paper.text(0, 0, options.text ?? "");

    this.setupText(options);

    if (symbol != null) this.setupSymbol(symbol, options);
  }

  /**
   * Applies the text id, class, font, link, click handler and wrapping.
   *
   * @param options Symbol options parsed from the flowchart.
   */
  private setupText(options: Partial<SymbolOptions>): void {
    if (options.key != null && isSafeDomId(options.key)) this.text.node.id = `${options.key}t`;

    this.text.node.setAttribute("class", `${this.getAttrOr<string>("class", "flowchart")}t`);

    this.text.setAttrs({
      "font-size": this.getAttrOr<number>("font-size", 14),
      fill: this.getAttrOr<string>("font-color", "black"),
      "text-anchor": "start",
      x: this.getAttrOr<number>("text-margin", 10),
    });

    this.applyFont(this.text);
    applyNodeLink(this.text, options);
    applyNodeCallback(this.chart, this.text, options);

    const maxWidth = this.getAttr("maxWidth");

    if (maxWidth != null) {
      // using this approach: http://stackoverflow.com/a/3153457/22466
      const words = (options.text ?? "").split(" ");
      let tempText = "";

      for (const word of words) {
        this.text.setAttr("text", `${tempText} ${word}`);

        tempText += this.text.getBBox().width > maxWidth ? `\n${word}` : ` ${word}`;
      }

      this.text.setAttr("text", tempText.slice(1));
    }

    this.group.push(this.text);
  }

  /**
   * Applies the configured fill/stroke/line-width and CSS class to a node shape.
   *
   * @param symbol Shape element.
   */
  protected styleShape(symbol: Renderable): void {
    symbol.setAttrs({
      stroke: this.getAttrOr<string>("element-color", "black"),
      "stroke-width": this.getAttrOr<number>("line-width", 3),
      fill: this.getAttrOr<string>("fill", "white"),
    });

    symbol.node.setAttribute("class", this.getAttrOr<string>("class", "flowchart"));
  }

  /**
   * Adds a finished shape before the text, centres the text and measures the node.
   *
   * @param symbol Shape element.
   */
  protected finishShape(symbol: Renderable): void {
    this.group.push(symbol);
    symbol.insertBefore(this.text);
    this.text.setAttr("y", symbol.getBBox().height / 2);
    this.initialize();
  }

  /**
   * Creates the custom path shape of condition / inputoutput nodes.
   *
   * @param start Path start point.
   * @param points Path points.
   * @param options Symbol options parsed from the flowchart.
   * @returns The created shape.
   */
  protected createPathShape(
    start: Position,
    points: Position[],
    options: Partial<SymbolOptions>,
  ): PathElement {
    const symbol = drawPath(this.chart, start, points);

    this.styleShape(symbol);
    applyNodeLink(symbol, options);

    if (options.key != null && isSafeDomId(options.key)) symbol.node.id = options.key;

    this.finishShape(symbol);

    return symbol;
  }

  /**
   * Creates the shape element around the already-set-up text.
   *
   * @param symbol Shape element the text is placed in.
   * @param options Symbol options parsed from the flowchart.
   */
  private setupSymbol(symbol: PathElement | RectElement, options: Partial<SymbolOptions>): void {
    symbol.node.setAttribute("class", this.getAttrOr<string>("class", "flowchart"));

    const tempMargin = this.getAttrOr<number>("text-margin", 10);
    const textBox = this.text.getBBox();

    symbol.setAttrs({
      fill: this.getAttrOr<string>("fill", "white"),
      stroke: this.getAttrOr<string>("element-color", "black"),
      "stroke-width": this.getAttrOr<number>("line-width", 3),
      width: textBox.width + 2 * tempMargin,
      height: textBox.height + 2 * tempMargin,
    });

    const roundness = this.getAttr("roundness");

    if (roundness != null && !Number.isNaN(roundness)) {
      symbol.node.setAttribute("ry", roundness.toString());
      symbol.node.setAttribute("rx", roundness.toString());
    }

    applyNodeLink(symbol, options);
    applyNodeCallback(this.chart, symbol, options);

    if (options.key != null && isSafeDomId(options.key)) symbol.node.id = options.key;

    this.finishShape(symbol);
  }

  /**
   * Applies configured font attributes to an element.
   *
   * @param element Element receiving the font attributes.
   */
  protected applyFont(element: Renderable): void {
    const font = this.getAttr("font");
    const fontFamily = this.getAttr("font-family");
    const fontWeight = this.getAttr("font-weight");

    if (font != null) element.setAttr("font", font);
    if (fontFamily != null) element.setAttr("font-family", fontFamily);
    if (fontWeight != null) element.setAttr("font-weight", fontWeight);
  }

  /**
   * Gets the attribute based on FlowState, Symbol Name and default, first found wins.
   *
   * @param attName Attribute name.
   * @returns The attribute value, or `null` when none is configured.
   */
  getAttr<StyleKey extends keyof StyleValues>(attName: StyleKey): StyleValues[StyleKey] | null;
  getAttr(attName: string): AttributeValue | null;
  getAttr(attName: string): AttributeValue | null {
    const { options } = this.chart;
    const symbolOptions = this.symbolType == null ? null : options.symbols[this.symbolType];
    const symbolOption = symbolOptions?.[attName];
    const flowStateOption = options.flowstate?.[this.flowstate]?.[attName];
    const value = flowStateOption ?? symbolOption ?? options[attName];

    return (value ?? null) as AttributeValue | null;
  }

  getAttrOr<StyleKey extends keyof StyleValues>(
    attName: StyleKey,
    fallback: StyleValues[StyleKey],
  ): StyleValues[StyleKey];
  getAttrOr<T>(attName: string, fallback: T): T;
  getAttrOr(attName: string, fallback: unknown): unknown {
    return this.getAttr(attName) ?? fallback;
  }

  initialize(): void {
    const lineWidth = this.getAttrOr<number>("line-width", 3);

    this.group.transform(`t${lineWidth},${lineWidth}`);

    const boundingBox = this.group.getBBox();

    this.width = boundingBox.width;
    this.height = boundingBox.height;
  }

  getCenter(): Position {
    return {
      x: this.getX() + this.width / 2,
      y: this.getY() + this.height / 2,
    };
  }

  getX(): number {
    return this.group.getBBox().x;
  }

  getY(): number {
    return this.group.getBBox().y;
  }

  shiftX(x: number): void {
    this.group.transform(`t${this.getX() + x},${this.getY()}`);
  }

  setX(x: number): void {
    this.group.transform(`t${x},${this.getY()}`);
  }

  shiftY(y: number): void {
    this.group.transform(`t${this.getX()},${this.getY() + y}`);
  }

  setY(y: number): void {
    this.group.transform(`t${this.getX()},${y}`);
  }

  getTop(): Position {
    return { x: this.getX() + this.width / 2, y: this.getY() };
  }

  getBottom(): Position {
    return { x: this.getX() + this.width / 2, y: this.getY() + this.height };
  }

  getLeft(): Position {
    return { x: this.getX(), y: this.getY() + this.group.getBBox().height / 2 };
  }

  getRight(): Position {
    return {
      x: this.getX() + this.group.getBBox().width,
      y: this.getY() + this.group.getBBox().height / 2,
    };
  }

  /**
   * Assigns the child symbol that leaves this symbol through `direction`.
   *
   * @param direction One of `top`, `bottom`, `left`, `right`.
   * @param symbol Child symbol, or `undefined` to clear the direction.
   */
  protected assignDirectionalSymbol(
    direction: Direction,
    symbol: FlowChartSymbol | undefined,
  ): void {
    switch (direction) {
      case "top": {
        this.top_symbol = symbol;
        break;
      }
      case "bottom": {
        this.bottom_symbol = symbol;
        break;
      }
      case "left": {
        this.left_symbol = symbol;
        break;
      }
      case "right": {
        this.right_symbol = symbol;
        break;
      }
      default: {
        break;
      }
    }
  }

  render(): void {
    const { next } = this;

    if (next == null) return;

    const lineLength = this.getAttrOr<number>("line-length", 50);

    if (this.direction_next === "right") {
      placeBeside(this, next, "right", lineLength);
    } else if (this.direction_next === "left") {
      placeBeside(this, next, "left", lineLength);
    } else if (!next.isPositioned) {
      const bottomPoint = this.getBottom();

      next.shiftY(this.getY() + this.height + lineLength);
      next.setX(bottomPoint.x - next.width / 2);
      next.isPositioned = true;

      next.render();
    }
  }

  renderLines(): void {
    const { next } = this;

    if (next == null) return;

    const arrowText = this.getAttr("arrow-text") ?? "";

    if (this.direction_next == null) this.drawLineTo(next, arrowText);
    else this.drawLineTo(next, arrowText, this.direction_next);
  }

  drawLineTo(symbol: FlowChartSymbol, text: string, direction?: Direction): void {
    const left = this.getLeft();
    const routed = routeConnection(this, symbol, {
      text,
      direction,
      lineLength: this.getAttrOr<number>("line-length", 50),
    });

    if (routed == null) return;

    const { line, maxX } = routed;
    const style = this.lineStyle[symbol.key];

    if (style != null) {
      // Re-sanitize at render time so programmatic changes to `chart.symbols` cannot inject
      // attributes into the DOM.
      try {
        line.setAttrs(sanitizeLineStyle(style));
      } catch (err) {
        if (!(err instanceof FlowchartSecurityError)) throw err;
      }
    }

    adjustCrossingLines(line, this.chart.lines, this.getAttrOr<number>("line-width", 3));
    this.chart.lines.push(line);

    if (this.chart.minXFromSymbols > left.x) this.chart.minXFromSymbols = left.x;
    if (maxX > this.chart.maxXFromLine) this.chart.maxXFromLine = maxX;
  }
}
