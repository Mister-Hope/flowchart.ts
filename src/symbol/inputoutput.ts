import { FlowChartSymbol } from "./symbol.js";
import { drawPath } from "../action.js";
import { FlowChart } from "../chart.js";

import type { Position } from "./symbol.js";
import type { SymbolOptions } from "../options.js";

export class InputOutput extends FlowChartSymbol {
  then?: (nextSymbol: FlowChartSymbol) => FlowChartSymbol;
  textMargin: number;

  constructor(chart: FlowChart, options: Partial<SymbolOptions> = {}) {
    super(chart, options);
    this.textMargin = this.getAttr("text-margin") as number;

    this.text.attr({ x: this.textMargin * 3 });

    const width = this.text.getBBox().width + 4 * this.textMargin;
    const height = this.text.getBBox().height + 2 * this.textMargin;
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
      stroke: this.getAttr("element-color") as string,
      "stroke-width": this.getAttr("line-width") as number,
      fill: this.getAttr("fill") as string,
    });

    if (options.link) symbol.attr("href", options.link);

    if (options.target) symbol.attr("target", options.target);

    if (options.key) symbol.node.id = options.key;

    symbol.node.setAttribute("class", this.getAttr("class") as string);

    this.text.attr({ y: symbol.getBBox().height / 2 });

    this.group.push(symbol);
    symbol.insertBefore(this.text);

    this.initialize();
  }

  getLeft(): Position {
    const y = this.getY() + this.group.getBBox().height / 2;
    const x = this.getX() + this.textMargin;

    return { x: x, y: y };
  }

  getRight() {
    const y = this.getY() + this.group.getBBox().height / 2;
    const x = this.getX() + this.group.getBBox().width - this.textMargin;
    return { x: x, y: y };
  }
}
