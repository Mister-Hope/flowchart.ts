import type FlowChart from "../chart.js";
import type { SymbolOptions } from "../options.js";
import { FlowChartSymbol } from "./symbol.js";

export class Subroutine extends FlowChartSymbol {
  constructor(chart: FlowChart, options: Partial<SymbolOptions> = {}) {
    const symbol = chart.paper.rect({ x: 0, y: 0, width: 0, height: 0 });

    super(chart, options, symbol);

    const textMargin = this.getAttrOr<number>("text-margin", 10);
    const textBox = this.text.getBBox();

    symbol.attr({ width: textBox.width + 4 * textMargin });

    this.text.attr({ x: 2 * textMargin });

    const innerWrapper = chart.paper.rect({ x: 0, y: 0, width: 0, height: 0 });

    innerWrapper.attr({
      x: textMargin,
      stroke: this.getAttrOr<string>("element-color", "black"),
      "stroke-width": this.getAttrOr<number>("line-width", 3),
      width: textBox.width + 2 * textMargin,
      height: textBox.height + 2 * textMargin,
      fill: this.getAttrOr<string>("fill", "white"),
    });

    if (options.key != null) innerWrapper.node.id = `${options.key}i`;

    const font = this.getAttr("font") as string | null;
    const fontFamily = this.getAttr("font-family") as string | null;
    const fontWeight = this.getAttr("font-weight");

    if (font != null) innerWrapper.attr("font", font);
    if (fontFamily != null) innerWrapper.attr("font-family", fontFamily);
    if (fontWeight != null) innerWrapper.attr("font-weight", fontWeight);

    if (options.link != null) innerWrapper.attr("href", options.link);
    if (options.target != null) innerWrapper.attr("target", options.target);

    this.group.push(innerWrapper);
    innerWrapper.insertBefore(this.text);

    this.initialize();
  }
}
