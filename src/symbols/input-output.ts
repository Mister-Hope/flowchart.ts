import { drawPath } from "../action.js";
import type FlowChart from "../chart.js";
import type { SymbolOptions } from "../options.js";
import type { Position } from "../typings.js";
import { FlowChartSymbol } from "./symbol.js";

export class InputOutput extends FlowChartSymbol {
  textMargin: number;

  constructor(chart: FlowChart, options: Partial<SymbolOptions> = {}) {
    super(chart, options);

    this.textMargin = this.getAttrOr<number>("text-margin", 10);

    this.text.attr({ x: this.textMargin * 3 });

    const textBox = this.text.getBBox();
    const width = textBox.width + 4 * this.textMargin;
    const height = textBox.height + 2 * this.textMargin;
    const startX = this.textMargin;
    const startY = height / 2;

    const start = { x: startX, y: startY };
    const points = [
      { x: startX - this.textMargin, y: height },
      { x: startX - this.textMargin + width, y: height },
      { x: startX - this.textMargin + width + 2 * this.textMargin, y: 0 },
      { x: startX - this.textMargin + 2 * this.textMargin, y: 0 },
      { x: startX, y: startY },
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
    this.symbol = symbol;

    this.initialize();
  }

  override getLeft(): Position {
    return {
      x: this.getX() + this.textMargin,
      y: this.getY() + this.group.getBBox().height / 2,
    };
  }

  override getRight(): Position {
    return {
      x: this.getX() + this.group.getBBox().width - this.textMargin,
      y: this.getY() + this.group.getBBox().height / 2,
    };
  }
}
