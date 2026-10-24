import type FlowChart from "../chart.js";
import type { SymbolOptions } from "../options.js";
import type { Position } from "../typings.js";
import { FlowChartSymbol } from "./symbol.js";

export class InputOutput extends FlowChartSymbol {
  textMargin: number;

  constructor(chart: FlowChart, options: Partial<SymbolOptions> = {}) {
    super(chart, options);

    this.textMargin = this.getAttrOr<number>("text-margin", 10);

    this.text.setAttr("x", this.textMargin * 3);

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

    this.createPathShape(start, points, options);
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
