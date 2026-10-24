import { checkLineIntersection, drawPath } from "../action.js";
import type FlowChart from "../chart.js";
import type { Direction, LineStyle, SymbolOptions, SymbolType } from "../options.js";
import type {
  AttributeValue,
  PathElement,
  PathSegment,
  RectElement,
  Renderable,
  SetElement,
  TextElement,
} from "../render/index.js";
import type { Position } from "../typings.js";
import { routeConnection } from "./line-routing.js";
import { applyNodeCallback, applyNodeLink } from "./node-links.js";

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
    if (options.key != null) this.text.node.id = `${options.key}t`;

    this.text.node.setAttribute("class", `${this.getAttrOr<string>("class", "flowchart")}t`);

    this.text.setAttrs({
      "font-size": this.getAttrOr<number>("font-size", 14),
      fill: this.getAttrOr<string>("font-color", "black"),
      "text-anchor": "start",
      x: this.getAttrOr<number>("text-margin", 10),
    });

    this.applyFont(this.text);
    applyNodeLink(this.text, options);
    applyNodeCallback(this.text, options);

    const maxWidth = this.getAttr("maxWidth") as number | null;

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

    if (options.key != null) symbol.node.id = options.key;

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

    const roundness = this.getAttr("roundness") as number | null;

    if (typeof roundness === "number" && !Number.isNaN(roundness)) {
      symbol.node.setAttribute("ry", roundness.toString());
      symbol.node.setAttribute("rx", roundness.toString());
    }

    applyNodeLink(symbol, options);
    applyNodeCallback(symbol, options);

    if (options.key != null) symbol.node.id = options.key;

    this.finishShape(symbol);
  }

  /**
   * Applies configured font attributes to an element.
   *
   * @param element Element receiving the font attributes.
   */
  protected applyFont(element: Renderable): void {
    const font = this.getAttr("font") as string | null;
    const fontFamily = this.getAttr("font-family") as string | null;
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
  getAttr(attName: string): AttributeValue | null {
    const { options } = this.chart;
    const symbolOptions = this.symbolType == null ? null : options.symbols[this.symbolType];
    const symbolOption = symbolOptions?.[attName];
    const flowStateOption = options.flowstate?.[this.flowstate]?.[attName];
    const value = flowStateOption ?? symbolOption ?? options[attName];

    return (value ?? null) as AttributeValue | null;
  }

  getAttrOr<T>(attName: string, fallback: T): T {
    return (this.getAttr(attName) ?? fallback) as T;
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

  /**
   * Positions the `bottom` child below this symbol.
   *
   * @param lineLength Minimum distance between the symbols.
   */
  protected placeBottom(lineLength: number): void {
    const bottomSymbol = this.bottom_symbol;

    if (bottomSymbol == null || bottomSymbol.isPositioned) return;

    const bottomPoint = this.getBottom();

    bottomSymbol.shiftY(this.getY() + this.height + lineLength);
    bottomSymbol.setX(bottomPoint.x - bottomSymbol.width / 2);
    bottomSymbol.isPositioned = true;

    bottomSymbol.render();
  }

  /**
   * Positions the `left` child next to this symbol.
   *
   * @param lineLength Minimum distance between the symbols.
   */
  protected placeLeft(lineLength: number): void {
    const leftSymbol = this.left_symbol;

    if (leftSymbol == null || leftSymbol.isPositioned) return;

    const leftPoint = this.getLeft();

    leftSymbol.setY(leftPoint.y - leftSymbol.height / 2);
    leftSymbol.shiftX(-(this.getX() + this.width + lineLength));

    this.shiftBeside(leftSymbol, lineLength);

    leftSymbol.isPositioned = true;

    leftSymbol.render();
  }

  /**
   * Positions the `right` child next to this symbol.
   *
   * @param lineLength Minimum distance between the symbols.
   */
  protected placeRight(lineLength: number): void {
    const rightSymbol = this.right_symbol;

    if (rightSymbol == null || rightSymbol.isPositioned) return;

    const rightPoint = this.getRight();

    rightSymbol.setY(rightPoint.y - rightSymbol.height / 2);
    rightSymbol.shiftX(this.getX() + this.width + lineLength);

    this.shiftBeside(rightSymbol, lineLength);

    rightSymbol.isPositioned = true;

    rightSymbol.render();
  }

  /**
   * Moves a horizontally placed child down until it no longer overlaps another symbol.
   *
   * @param symbol Child symbol to shift.
   * @param lineLength Minimum distance between the symbols.
   */
  protected shiftBeside(symbol: FlowChartSymbol, lineLength: number): void {
    const shift = (): void => {
      let symbolUnder: FlowChartSymbol | undefined;

      if (this.params["align-next"] !== "no") {
        for (const otherSymbol of this.chart.symbols) {
          const diff = Math.abs(otherSymbol.getCenter().x - symbol.getCenter().x);

          if (otherSymbol.getCenter().y > symbol.getCenter().y && diff <= symbol.width / 2) {
            symbolUnder = otherSymbol;
            break;
          }
        }
      }

      if (symbolUnder == null || symbol.symbolType === "end") return;

      symbol.setX(symbolUnder.getX() + symbolUnder.width + lineLength);
      shift();
    };

    shift();
  }

  render(): void {
    const { next } = this;

    if (next == null) return;

    const lineLength = this.getAttrOr<number>("line-length", 50);

    if (this.direction_next === "right") {
      this.placeBeside(next, "right", lineLength);
    } else if (this.direction_next === "left") {
      this.placeBeside(next, "left", lineLength);
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

    const arrowText = (this.getAttr("arrow-text") as string | null) ?? "";

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

    if (style != null) line.setAttrs(style);

    this.adjustCrossingLines(line, this.getAttrOr<number>("line-width", 3));
    this.chart.lines.push(line);

    if (this.chart.minXFromSymbols > left.x) this.chart.minXFromSymbols = left.x;
    if (maxX > this.chart.maxXFromLine) this.chart.maxXFromLine = maxX;
  }

  private placeBeside(next: FlowChartSymbol, side: "left" | "right", lineLength: number): void {
    if (next.isPositioned) return;

    const point = side === "right" ? this.getRight() : this.getLeft();

    next.setY(point.y - next.height / 2);

    if (side === "right") next.shiftX(this.getX() + this.width + lineLength);
    else next.shiftX(-(this.getX() + this.width + lineLength));

    const shift = (): void => {
      let symbolUnder: FlowChartSymbol | undefined;

      for (const symbol of this.chart.symbols) {
        const diff = Math.abs(symbol.getCenter().x - next.getCenter().x);

        if (symbol.getCenter().y > next.getCenter().y && diff <= next.width / 2) {
          symbolUnder = symbol;
          break;
        }
      }

      if (symbolUnder == null || next.symbolType === "end") return;

      next.setX(symbolUnder.getX() + symbolUnder.width + lineLength);
      shift();
    };

    shift();

    next.isPositioned = true;

    next.render();
  }

  /**
   * Curves lines around previously drawn lines they cross (hop-over effect).
   *
   * @param line Line being drawn.
   * @param lineWidth Stroke width used for the bend size.
   */
  private adjustCrossingLines(line: PathElement, lineWidth: number): void {
    for (const otherLine of this.chart.lines) {
      const otherPath = otherLine.getPath();
      const path = line.getPath();

      for (
        let otherIndex = 0, otherLength = otherPath.length - 1;
        otherIndex < otherLength;
        otherIndex += 1
      ) {
        for (let index = 0, length = path.length - 1; index < length; index += 1) {
          if (
            bendCrossing(line, { path, index }, { path: otherPath, index: otherIndex }, lineWidth)
          )
            index += 2;
        }
      }
    }
  }
}
