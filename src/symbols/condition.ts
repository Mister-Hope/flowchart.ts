import { drawPath } from "../action.js";
import type FlowChart from "../chart.js";
import type { Direction, SymbolOptions } from "../options.js";
import { FlowChartSymbol } from "./symbol.js";

export interface ConditionSymbolOptions extends SymbolOptions {
  yes_annotation?: string | null;
  no_annotation?: string | null;
  direction_yes?: Direction | null;
  direction_no?: Direction | null;
}

export class Condition extends FlowChartSymbol {
  /** Label of the "yes" branch ("yes" by default). */
  yes_annotation?: string | null;

  /** Label of the "no" branch ("no" by default). */
  no_annotation?: string | null;

  yes_direction: Direction;

  no_direction: Direction;

  textMargin: number;

  yes_symbol?: FlowChartSymbol;

  no_symbol?: FlowChartSymbol;

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

    this.text.setAttr("x", this.textMargin * 2);

    let width = this.text.getBBox().width + 3 * this.textMargin;

    width += width / 2;

    let height = this.text.getBBox().height + 2 * this.textMargin;

    height += height / 2;
    height = Math.max(width * 0.5, height);

    const startX = width / 4;
    const startY = height / 4;

    this.text.setAttr("x", startX + this.textMargin / 2);

    const start = { x: startX, y: startY };
    const points = [
      { x: startX - width / 4, y: startY + height / 4 },
      { x: startX - width / 4 + width / 2, y: startY + height / 4 + height / 2 },
      { x: startX - width / 4 + width, y: startY + height / 4 },
      { x: startX - width / 4 + width / 2, y: startY + height / 4 - height / 2 },
      { x: startX - width / 4, y: startY + height / 4 },
    ];

    const symbol = drawPath(chart, start, points);

    symbol.setAttrs({
      stroke: this.getAttrOr<string>("element-color", "black"),
      "stroke-width": this.getAttrOr<number>("line-width", 3),
      fill: this.getAttrOr<string>("fill", "white"),
    });

    if (options.link != null) symbol.setAttr("href", options.link);
    if (options.target != null) symbol.setAttr("target", options.target);
    if (options.key != null) symbol.node.id = options.key;

    symbol.node.setAttribute("class", this.getAttrOr<string>("class", "flowchart"));

    this.text.setAttr("y", symbol.getBBox().height / 2);

    this.group.push(symbol);
    symbol.insertBefore(this.text);

    this.initialize();
  }

  override render(): void {
    this.assignDirectionalSymbol(this.yes_direction, this.yes_symbol);
    this.assignDirectionalSymbol(this.no_direction, this.no_symbol);

    const lineLength = this.getAttrOr<number>("line-length", 50);

    this.placeBottom(lineLength);
    this.placeRight(lineLength);
    this.placeLeft(lineLength);
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
}
