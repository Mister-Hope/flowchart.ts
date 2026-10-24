import { drawPath } from "../action.js";
import type FlowChart from "../chart.js";
import type { Direction, SymbolOptions } from "../options.js";
import FlowChartSymbol from "./symbol.js";

export interface ConditionSymbolOptions extends SymbolOptions {
  yes_annotation?: string | null;
  no_annotation?: string | null;
  direction_yes?: Direction | null;
  direction_no?: Direction | null;
}

class Condition extends FlowChartSymbol {
  /** Yes text */
  yes_annotation?: string | null;

  /** No text */
  no_annotation?: string | null;

  yes_direction: Direction;

  no_direction: Direction;

  textMargin: number;

  yes_symbol?: FlowChartSymbol;

  no_symbol?: FlowChartSymbol;

  top_symbol?: FlowChartSymbol;

  bottom_symbol?: FlowChartSymbol;

  right_symbol?: FlowChartSymbol;

  left_symbol?: FlowChartSymbol;

  yes?: (nextSymbol: FlowChartSymbol) => FlowChartSymbol;

  no?: (nextSymbol: FlowChartSymbol) => FlowChartSymbol;

  constructor(chart: FlowChart, options: Partial<ConditionSymbolOptions> = {}) {
    super(chart, options);

    this.yes_annotation = options.yes_annotation;
    this.no_annotation = options.no_annotation;
    this.textMargin = this.getAttrOr<number>("text-margin", 10);

    let yesDirection = options.direction_yes ?? null;
    let noDirection = options.direction_no ?? null;

    if (noDirection == null && yesDirection === "right") noDirection = "bottom";
    else if (yesDirection == null && noDirection === "bottom") yesDirection = "right";

    this.yes_direction = yesDirection ?? "bottom";
    this.no_direction = noDirection ?? "right";

    this.text.attr({ x: this.textMargin * 2 });

    let width = this.text.getBBox().width + 3 * this.textMargin;

    width += width / 2;

    let height = this.text.getBBox().height + 2 * this.textMargin;

    height += height / 2;
    height = Math.max(width * 0.5, height);

    const startX = width / 4;
    const startY = height / 4;

    this.text.attr({ x: startX + this.textMargin / 2 });

    const start = { x: startX, y: startY };
    const points = [
      { x: startX - width / 4, y: startY + height / 4 },
      {
        x: startX - width / 4 + width / 2,
        y: startY + height / 4 + height / 2,
      },
      { x: startX - width / 4 + width, y: startY + height / 4 },
      {
        x: startX - width / 4 + width / 2,
        y: startY + height / 4 - height / 2,
      },
      { x: startX - width / 4, y: startY + height / 4 },
    ];

    const symbol = drawPath(chart, start, points);

    symbol.attr({
      stroke: this.getAttrOr<string>("element-color", "black"),
      "stroke-width": this.getAttrOr<number>("line-width", 3),
      fill: this.getAttrOr<string>("fill", "white"),
    });

    if (options.link != null) symbol.attr("href", options.link);
    if (options.target != null) symbol.attr("target", options.target);
    if (options.key != null) symbol.node.id = options.key;

    symbol.node.setAttribute("class", this.getAttrOr<string>("class", "flowchart"));

    this.text.attr({ y: symbol.getBBox().height / 2 });

    this.group.push(symbol);
    symbol.insertBefore(this.text);

    this.initialize();
  }

  override render(): void {
    this.assignDirectionalSymbol(this.yes_direction, this.yes_symbol);
    this.assignDirectionalSymbol(this.no_direction, this.no_symbol);

    const lineLength = this.getAttrOr<number>("line-length", 50);
    const bottomSymbol = this.bottom_symbol;

    if (bottomSymbol != null && !bottomSymbol.isPositioned) {
      const bottomPoint = this.getBottom();

      bottomSymbol.shiftY(this.getY() + this.height + lineLength);
      bottomSymbol.setX(bottomPoint.x - bottomSymbol.width / 2);
      bottomSymbol.isPositioned = true;
      bottomSymbol.render();
    }

    const rightSymbol = this.right_symbol;

    if (rightSymbol != null && !rightSymbol.isPositioned) {
      const rightPoint = this.getRight();

      rightSymbol.setY(rightPoint.y - rightSymbol.height / 2);
      rightSymbol.shiftX(this.getX() + this.width + lineLength);

      this.shiftBeside(rightSymbol, lineLength);

      rightSymbol.isPositioned = true;
      rightSymbol.render();
    }

    const leftSymbol = this.left_symbol;

    if (leftSymbol != null && !leftSymbol.isPositioned) {
      const leftPoint = this.getLeft();

      leftSymbol.setY(leftPoint.y - leftSymbol.height / 2);
      leftSymbol.shiftX(-(this.getX() + this.width + lineLength));

      this.shiftBeside(leftSymbol, lineLength);

      leftSymbol.isPositioned = true;
      leftSymbol.render();
    }
  }

  override renderLines(): void {
    if (this.yes_symbol != null) {
      this.drawLineTo(
        this.yes_symbol,
        this.yes_annotation != null && this.yes_annotation !== ""
          ? this.yes_annotation
          : this.getAttrOr<string>("yes-text", "yes"),
        this.yes_direction,
      );
    }

    if (this.no_symbol != null) {
      this.drawLineTo(
        this.no_symbol,
        this.no_annotation != null && this.no_annotation !== ""
          ? this.no_annotation
          : this.getAttrOr<string>("no-text", "no"),
        this.no_direction,
      );
    }
  }

  private assignDirectionalSymbol(direction: Direction, symbol: FlowChartSymbol | undefined): void {
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

  private shiftBeside(symbol: FlowChartSymbol, lineLength: number): void {
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
}

export default Condition;
