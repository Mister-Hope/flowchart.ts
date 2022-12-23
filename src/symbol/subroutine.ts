import { FlowChartSymbol } from "./symbol.js";
import { FlowChart } from "../chart.js";

import type { SymbolOptions } from "../options.js";

export class Subroutine extends FlowChartSymbol {
  then?: (nextSymbol: FlowChartSymbol) => FlowChartSymbol;
  constructor(chart: FlowChart, options: Partial<SymbolOptions> = {}) {
    const symbol = chart.paper.rect(0, 0, 0, 0);
    super(chart, options, symbol);

    symbol.attr({
      width:
        this.text.getBBox().width +
        4 * (this.getAttr<number>("text-margin") as number),
    });

    this.text.attr({
      x: 2 * (this.getAttr<number>("text-margin") as number),
    });

    const innerWrap = chart.paper.rect(0, 0, 0, 0);
    innerWrap.attr({
      x: this.getAttr<number>("text-margin"),
      stroke: this.getAttr<string>("element-color"),
      "stroke-width": this.getAttr<number>("line-width"),
      width:
        this.text.getBBox().width +
        2 * (this.getAttr<number>("text-margin") as number),
      height:
        this.text.getBBox().height +
        2 * (this.getAttr<number>("text-margin") as number),
      fill: this.getAttr<string>("fill"),
    });
    if (options.key) {
      innerWrap.node.id = options.key + "i";
    }

    const font = this.getAttr<string>("font");
    const fontF = this.getAttr<string>("font-family");
    const fontW = this.getAttr<string>("font-weight");

    if (font) innerWrap.attr({ font: font });
    if (fontF) innerWrap.attr({ "font-family": fontF });
    if (fontW) innerWrap.attr({ "font-weight": fontW });

    if (options.link) {
      innerWrap.attr("href", options.link);
    }
    if (options.target) {
      innerWrap.attr("target", options.target);
    }
    this.group.push(innerWrap);
    innerWrap.insertBefore(this.text);

    this.initialize();
  }
}