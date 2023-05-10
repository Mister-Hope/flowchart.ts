import FlowChartSymbol from "./symbol.js";
import { drawPath } from "../action.js";
import FlowChart from "../chart.js";
import { type SymbolOptions } from "../options.js";
import { type Position } from "../typings.js";

class InputOutput extends FlowChartSymbol {
  then?: (nextSymbol: FlowChartSymbol) => FlowChartSymbol;
  textMargin: number;

  constructor(chart: FlowChart, options: Partial<SymbolOptions> = {}) {
    super(chart, options);
    this.textMargin = this.getAttr<number>("text-margin")!;

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
      stroke: this.getAttr<string>("element-color")!,
      "stroke-width": this.getAttr<number>("line-width")!,
      fill: this.getAttr<string>("fill")!,
    });

    if (options.link) symbol.attr("href", options.link);

    if (options.target) symbol.attr("target", options.target);

    if (options.key) symbol.node.id = options.key;

    symbol.node.setAttribute("class", this.getAttr("class")!);

    this.text.attr({ y: symbol.getBBox().height / 2 });

    this.group.push(symbol);
    symbol.insertBefore(this.text);
    this.symbol = symbol;

    this.initialize();
  }

  getLeft(): Position {
    return {
      x: this.getX() + this.textMargin,
      y: this.getY() + this.group.getBBox().height / 2,
    };
  }

  getRight() {
    return {
      x: this.getX() + this.group.getBBox().width - this.textMargin,
      y: this.getY() + this.group.getBBox().height / 2,
    };
  }
}

export default InputOutput;
