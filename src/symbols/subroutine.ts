import type FlowChart from "../chart.js";
import type { SymbolOptions } from "../options.js";
import { isSafeDomId } from "../security.js";
import { applyNodeLink } from "./node-links.js";
import { FlowChartSymbol } from "./symbol.js";

export class Subroutine extends FlowChartSymbol {
  constructor(chart: FlowChart, options: Partial<SymbolOptions> = {}) {
    const symbol = chart.paper.rect({ x: 0, y: 0, width: 0, height: 0 });

    super(chart, options, symbol);

    const textMargin = this.getAttrOr<number>("text-margin", 10);
    const textBox = this.text.getBBox();

    symbol.setAttr("width", textBox.width + 4 * textMargin);

    this.text.setAttr("x", 2 * textMargin);

    const innerWrapper = chart.paper.rect({ x: 0, y: 0, width: 0, height: 0 });

    innerWrapper.setAttrs({
      x: textMargin,
      stroke: this.getAttrOr<string>("element-color", "black"),
      "stroke-width": this.getAttrOr<number>("line-width", 3),
      width: textBox.width + 2 * textMargin,
      height: textBox.height + 2 * textMargin,
      fill: this.getAttrOr<string>("fill", "white"),
    });

    if (options.key != null && isSafeDomId(options.key)) innerWrapper.node.id = `${options.key}i`;

    this.applyFont(innerWrapper);
    applyNodeLink(innerWrapper, options);

    this.group.push(innerWrapper);
    innerWrapper.insertBefore(this.text);

    this.initialize();
  }
}
