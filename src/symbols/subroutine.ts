import FlowChartSymbol from "./symbol.js";
import FlowChart from "../chart.js";

import { type SymbolOptions } from "../options.js";

class Subroutine extends FlowChartSymbol {
  then?: (nextSymbol: FlowChartSymbol) => FlowChartSymbol;
  constructor(chart: FlowChart, options: Partial<SymbolOptions> = {}) {
    const symbol = chart.paper.rect(0, 0, 0, 0);
    super(chart, options, symbol);

    symbol.attr({
      width:
        this.text.getBBox().width + 4 * this.getAttr<number>("text-margin")!,
    });

    this.text.attr({
      x: 2 * this.getAttr<number>("text-margin")!,
    });

    const innerWrapper = chart.paper.rect(0, 0, 0, 0);

    innerWrapper.attr({
      x: this.getAttr<number>("text-margin"),
      stroke: this.getAttr<string>("element-color"),
      "stroke-width": this.getAttr<number>("line-width"),
      width:
        this.text.getBBox().width + 2 * this.getAttr<number>("text-margin")!,
      height:
        this.text.getBBox().height + 2 * this.getAttr<number>("text-margin")!,
      fill: this.getAttr<string>("fill"),
    });

    if (options.key) innerWrapper.node.id = `${options.key}i`;

    const font = this.getAttr<string>("font");
    const fontF = this.getAttr<string>("font-family");
    const fontW = this.getAttr<string>("font-weight");

    if (font) innerWrapper.attr({ font: font });
    if (fontF) innerWrapper.attr({ "font-family": fontF });
    if (fontW) innerWrapper.attr({ "font-weight": fontW });

    if (options.link) innerWrapper.attr("href", options.link);
    if (options.target) innerWrapper.attr("target", options.target);

    this.group.push(innerWrapper);
    innerWrapper.insertBefore(this.text);

    this.initialize();
  }
}

export default Subroutine;
