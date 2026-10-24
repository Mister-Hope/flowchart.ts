import { checkLineIntersection, drawLine } from "../action.js";
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
 * Binds the `options.function` click callback to a rendered element.
 *
 * @param element Element that should react to clicks.
 * @param options Parsed symbol options containing the callback name.
 */
const bindClick = (element: Renderable, options: Partial<SymbolOptions>): void => {
  const { function: functionName } = options;

  if (functionName == null) return;

  element.node.addEventListener(
    "click",
    (event) => {
      const handler = (
        globalThis as unknown as Record<
          string,
          ((event: Event, options: Partial<SymbolOptions>) => void) | undefined
        >
      )[functionName];

      handler?.(event, options);
    },
    false,
  );
};

class FlowChartSymbol {
  text: TextElement;

  params: Record<string, string>;

  connectedTo: FlowChartSymbol[] = [];

  leftLines: PathElement[] = [];

  rightLines: PathElement[] = [];

  topLines: PathElement[] = [];

  bottomLines: PathElement[] = [];

  group: SetElement;

  symbol?: PathElement | RectElement;

  symbolType?: SymbolType;

  flowstate: string;

  key: string;

  lineStyle: Record<string, LineStyle>;

  bottomStart?: boolean;

  next?: FlowChartSymbol;

  thenHandler?: (nextSymbol: FlowChartSymbol) => FlowChartSymbol;

  direction_next: Direction | undefined;

  isPositioned?: boolean;

  width = 0;

  height = 0;

  topStart?: boolean;

  topEnd?: boolean;

  rightStart?: boolean;

  leftStart?: boolean;

  leftEnd?: boolean;

  rightEnd?: boolean;

  pathOk?: boolean;

  constructor(
    public readonly chart: FlowChart,
    options: Partial<SymbolOptions>,
    symbol?: PathElement | RectElement,
  ) {
    this.group = chart.paper.set();
    this.symbol = symbol;
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

    this.text.attr({
      "font-size": this.getAttrOr<number>("font-size", 14),
      fill: this.getAttrOr<string>("font-color", "black"),
      "text-anchor": "start",
      x: this.getAttrOr<number>("text-margin", 10),
    });

    this.applyFont(this.text);

    if (options.link != null) this.text.attr("href", options.link);
    if (options.target != null) this.text.attr("target", options.target);

    if (options.function != null) {
      this.text.attr("cursor", "pointer");
      bindClick(this.text, options);
    }

    const maxWidth = this.getAttr("maxWidth") as number | null;

    if (maxWidth != null) {
      // using this approach: http://stackoverflow.com/a/3153457/22466
      const words = (options.text ?? "").split(" ");
      let tempText = "";

      for (const word of words) {
        this.text.attr("text", `${tempText} ${word}`);

        tempText += this.text.getBBox().width > maxWidth ? `\n${word}` : ` ${word}`;
      }

      this.text.attr("text", tempText.slice(1));
    }

    this.group.push(this.text);
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

    symbol.attr({
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

    if (options.link != null) symbol.attr("href", options.link);
    if (options.target != null) symbol.attr("target", options.target);

    if (options.function != null) {
      bindClick(symbol, options);
      symbol.attr("cursor", "pointer");
    }

    if (options.key != null) symbol.node.id = options.key;

    this.group.push(symbol);
    symbol.insertBefore(this.text);

    this.text.attr({ y: symbol.getBBox().height / 2 });

    this.initialize();
  }

  /**
   * Applies configured font attributes to an element.
   *
   * @param element Element receiving the font attributes.
   */
  private applyFont(element: Renderable): void {
    const font = this.getAttr("font") as string | null;
    const fontFamily = this.getAttr("font-family") as string | null;
    const fontWeight = this.getAttr("font-weight");

    if (font != null) element.attr("font", font);
    if (fontFamily != null) element.attr("font-family", fontFamily);
    if (fontWeight != null) element.attr("font-weight", fontWeight);
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
    if (!this.connectedTo.includes(symbol)) this.connectedTo.push(symbol);

    const { x, y } = this.getCenter();
    const right = this.getRight();
    const bottom = this.getBottom();
    const top = this.getTop();
    const left = this.getLeft();

    const { x: symbolX, y: symbolY } = symbol.getCenter();
    const symbolTop = symbol.getTop();
    const symbolRight = symbol.getRight();
    const symbolLeft = symbol.getLeft();

    const isOnSameColumn = x === symbolX;
    const isOnSameLine = y === symbolY;
    const isUnder = y < symbolY;
    const isUpper = y > symbolY || this === symbol;
    const isLeft = x > symbolX;
    const isRight = x < symbolX;

    let maxX = 0;
    let line: PathElement | null = null;

    const lineLength = this.getAttrOr<number>("line-length", 50);
    const lineWidth = this.getAttrOr<number>("line-width", 3);

    if ((direction == null || direction === "bottom") && isOnSameColumn && isUnder) {
      if (symbol.topLines.length === 0 && this.bottomLines.length === 0) {
        line = drawLine(this.chart, bottom, [symbolTop], text);
      } else {
        const yOffset = Math.max(symbol.topLines.length, this.bottomLines.length) * 10;

        line = drawLine(
          this.chart,
          bottom,
          [
            { x: symbolTop.x, y: symbolTop.y - yOffset },
            { x: symbolTop.x, y: symbolTop.y },
          ],
          text,
        );
      }
      this.bottomLines.push(line);
      symbol.topLines.push(line);
      this.bottomStart = true;
      symbol.topEnd = true;
      maxX = bottom.x;
    } else if ((direction == null || direction === "right") && isOnSameLine && isRight) {
      if (symbol.leftLines.length === 0 && this.rightLines.length === 0) {
        line = drawLine(this.chart, right, [symbolLeft], text);
      } else {
        const yOffset = Math.max(symbol.leftLines.length, this.rightLines.length) * 10;

        line = drawLine(
          this.chart,
          right,
          [
            { x: right.x, y: right.y - yOffset },
            { x: right.x, y: symbolLeft.y - yOffset },
            { x: symbolLeft.x, y: symbolLeft.y - yOffset },
            { x: symbolLeft.x, y: symbolLeft.y },
          ],
          text,
        );
      }
      this.rightLines.push(line);
      symbol.leftLines.push(line);
      this.rightStart = true;
      symbol.leftEnd = true;
      maxX = symbolLeft.x;
    } else if ((direction == null || direction === "left") && isOnSameLine && isLeft) {
      if (symbol.rightLines.length === 0 && this.leftLines.length === 0) {
        line = drawLine(this.chart, left, [symbolRight], text);
      } else {
        const yOffset = Math.max(symbol.rightLines.length, this.leftLines.length) * 10;

        line = drawLine(
          this.chart,
          right,
          [
            { x: right.x, y: right.y - yOffset },
            { x: right.x, y: symbolRight.y - yOffset },
            { x: symbolRight.x, y: symbolRight.y - yOffset },
            { x: symbolRight.x, y: symbolRight.y },
          ],
          text,
        );
      }
      this.leftLines.push(line);
      symbol.rightLines.push(line);
      this.leftStart = true;
      symbol.rightEnd = true;
      maxX = symbolRight.x;
    } else if ((direction == null || direction === "right") && isOnSameColumn && isUpper) {
      const yOffset = Math.max(symbol.topLines.length, this.rightLines.length) * 10;

      line = drawLine(
        this.chart,
        right,
        [
          { x: right.x + lineLength / 2, y: right.y - yOffset },
          {
            x: right.x + lineLength / 2,
            y: symbolTop.y - lineLength / 2 - yOffset,
          },
          { x: symbolTop.x, y: symbolTop.y - lineLength / 2 - yOffset },
          { x: symbolTop.x, y: symbolTop.y },
        ],
        text,
      );
      this.rightLines.push(line);
      symbol.topLines.push(line);
      this.rightStart = true;
      symbol.topEnd = true;
      maxX = right.x + lineLength / 2;
    } else if ((direction == null || direction === "right") && isOnSameColumn && isUnder) {
      const yOffset = Math.max(symbol.topLines.length, this.rightLines.length) * 10;

      line = drawLine(
        this.chart,
        right,
        [
          { x: right.x + lineLength / 2, y: right.y - yOffset },
          {
            x: right.x + lineLength / 2,
            y: symbolTop.y - lineLength / 2 - yOffset,
          },
          { x: symbolTop.x, y: symbolTop.y - lineLength / 2 - yOffset },
          { x: symbolTop.x, y: symbolTop.y },
        ],
        text,
      );
      this.rightLines.push(line);
      symbol.topLines.push(line);
      this.rightStart = true;
      symbol.topEnd = true;
      maxX = right.x + lineLength / 2;
    } else if ((direction == null || direction === "bottom") && isLeft) {
      const yOffset = Math.max(symbol.topLines.length, this.bottomLines.length) * 10;

      if (this.leftEnd && isUpper) {
        line = drawLine(
          this.chart,
          bottom,
          [
            { x: bottom.x, y: bottom.y + lineLength / 2 - yOffset },
            {
              x: bottom.x + (bottom.x - symbolTop.x) / 2,
              y: bottom.y + lineLength / 2 - yOffset,
            },
            {
              x: bottom.x + (bottom.x - symbolTop.x) / 2,
              y: symbolTop.y - lineLength / 2 - yOffset,
            },
            { x: symbolTop.x, y: symbolTop.y - lineLength / 2 - yOffset },
            { x: symbolTop.x, y: symbolTop.y },
          ],
          text,
        );
      } else {
        line = drawLine(
          this.chart,
          bottom,
          [
            { x: bottom.x, y: symbolTop.y - lineLength / 2 - yOffset },
            { x: symbolTop.x, y: symbolTop.y - lineLength / 2 - yOffset },
            { x: symbolTop.x, y: symbolTop.y },
          ],
          text,
        );
      }

      this.bottomLines.push(line);
      symbol.topLines.push(line);
      this.bottomStart = true;
      symbol.topEnd = true;
      maxX = bottom.x + (bottom.x - symbolTop.x) / 2;
    } else if ((direction == null || direction === "bottom") && isRight && isUnder) {
      const yOffset = Math.max(symbol.topLines.length, this.bottomLines.length) * 10;

      line = drawLine(
        this.chart,
        bottom,
        [
          { x: bottom.x, y: symbolTop.y - lineLength / 2 - yOffset },
          { x: symbolTop.x, y: symbolTop.y - lineLength / 2 - yOffset },
          { x: symbolTop.x, y: symbolTop.y },
        ],
        text,
      );
      this.bottomLines.push(line);
      symbol.topLines.push(line);
      this.bottomStart = true;
      symbol.topEnd = true;
      maxX = bottom.x;
      if (symbolTop.x > maxX) maxX = symbolTop.x;
    } else if ((direction == null || direction === "bottom") && isRight) {
      const yOffset = Math.max(symbol.topLines.length, this.bottomLines.length) * 10;

      line = drawLine(
        this.chart,
        bottom,
        [
          { x: bottom.x, y: bottom.y + lineLength / 2 - yOffset },
          {
            x: bottom.x + (bottom.x - symbolTop.x) / 2,
            y: bottom.y + lineLength / 2 - yOffset,
          },
          {
            x: bottom.x + (bottom.x - symbolTop.x) / 2,
            y: symbolTop.y - lineLength / 2 - yOffset,
          },
          { x: symbolTop.x, y: symbolTop.y - lineLength / 2 - yOffset },
          { x: symbolTop.x, y: symbolTop.y },
        ],
        text,
      );
      this.bottomLines.push(line);
      symbol.topLines.push(line);
      this.bottomStart = true;
      symbol.topEnd = true;
      maxX = bottom.x + (bottom.x - symbolTop.x) / 2;
    } else if (direction === "right" && isLeft) {
      const yOffset = Math.max(symbol.topLines.length, this.rightLines.length) * 10;

      line = drawLine(
        this.chart,
        right,
        [
          { x: right.x + lineLength / 2, y: right.y },
          {
            x: right.x + lineLength / 2,
            y: symbolTop.y - lineLength / 2 - yOffset,
          },
          { x: symbolTop.x, y: symbolTop.y - lineLength / 2 - yOffset },
          { x: symbolTop.x, y: symbolTop.y },
        ],
        text,
      );
      this.rightLines.push(line);
      symbol.topLines.push(line);
      this.rightStart = true;
      symbol.topEnd = true;
      maxX = right.x + lineLength / 2;
    } else if (direction === "right" && isRight) {
      const yOffset = Math.max(symbol.topLines.length, this.rightLines.length) * 10;

      line = drawLine(
        this.chart,
        right,
        [
          { x: symbolTop.x, y: right.y - yOffset },
          { x: symbolTop.x, y: symbolTop.y - yOffset },
        ],
        text,
      );
      this.rightLines.push(line);
      symbol.topLines.push(line);
      this.rightStart = true;
      symbol.topEnd = true;
      maxX = right.x + lineLength / 2;
    } else if (direction === "bottom" && isOnSameColumn && isUpper) {
      const yOffset = Math.max(symbol.topLines.length, this.bottomLines.length) * 10;

      line = drawLine(
        this.chart,
        bottom,
        [
          { x: bottom.x, y: bottom.y + lineLength / 2 - yOffset },
          {
            x: right.x + lineLength / 2,
            y: bottom.y + lineLength / 2 - yOffset,
          },
          {
            x: right.x + lineLength / 2,
            y: symbolTop.y - lineLength / 2 - yOffset,
          },
          { x: symbolTop.x, y: symbolTop.y - lineLength / 2 - yOffset },
          { x: symbolTop.x, y: symbolTop.y },
        ],
        text,
      );
      this.bottomLines.push(line);
      symbol.topLines.push(line);
      this.bottomStart = true;
      symbol.topEnd = true;
      maxX = bottom.x + lineLength / 2;
    } else if (direction === "left" && isOnSameColumn && isUpper) {
      let diffX = left.x - lineLength / 2;

      if (symbolLeft.x < left.x) diffX = symbolLeft.x - lineLength / 2;

      const yOffset = Math.max(symbol.topLines.length, this.leftLines.length) * 10;

      line = drawLine(
        this.chart,
        left,
        [
          { x: diffX, y: left.y - yOffset },
          { x: diffX, y: symbolTop.y - lineLength / 2 - yOffset },
          { x: symbolTop.x, y: symbolTop.y - lineLength / 2 - yOffset },
          { x: symbolTop.x, y: symbolTop.y },
        ],
        text,
      );
      this.leftLines.push(line);
      symbol.topLines.push(line);
      this.leftStart = true;
      symbol.topEnd = true;
      maxX = left.x;
    } else if (direction === "left") {
      const yOffset = Math.max(symbol.topLines.length, this.leftLines.length) * 10;

      line = drawLine(
        this.chart,
        left,
        [
          { x: symbolTop.x + (left.x - symbolTop.x) / 2, y: left.y },
          {
            x: symbolTop.x + (left.x - symbolTop.x) / 2,
            y: symbolTop.y - lineLength / 2 - yOffset,
          },
          { x: symbolTop.x, y: symbolTop.y - lineLength / 2 - yOffset },
          { x: symbolTop.x, y: symbolTop.y },
        ],
        text,
      );
      this.leftLines.push(line);
      symbol.topLines.push(line);
      this.leftStart = true;
      symbol.topEnd = true;
      maxX = left.x;
    } else if (direction === "top") {
      const yOffset = Math.max(symbol.topLines.length, this.topLines.length) * 10;

      line = drawLine(
        this.chart,
        top,
        [
          { x: top.x, y: symbolTop.y - lineLength / 2 - yOffset },
          { x: symbolTop.x, y: symbolTop.y - lineLength / 2 - yOffset },
          { x: symbolTop.x, y: symbolTop.y },
        ],
        text,
      );
      this.topLines.push(line);
      symbol.topLines.push(line);
      this.topStart = true;
      symbol.topEnd = true;
      maxX = top.x;
    }

    // update line style
    if (line != null) {
      const style = this.lineStyle[symbol.key];

      if (style != null) line.attr(style);

      this.adjustCrossingLines(line, lineWidth);

      this.chart.lines.push(line);
      if (this.chart.minXFromSymbols > left.x) this.chart.minXFromSymbols = left.x;
    }

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

export default FlowChartSymbol;
