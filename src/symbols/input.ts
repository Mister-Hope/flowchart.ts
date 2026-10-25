import type FlowChart from "../chart.js";
import type { SymbolOptions } from "../options.js";
import { TrapezoidSymbol } from "./trapezoid.js";

/**
 * Input node: an inverted trapezoid whose top edge is wider than the bottom edge.
 *
 * ```flowchart
 * read=>input: Read data
 * ```
 */
export class Input extends TrapezoidSymbol {
  constructor(chart: FlowChart, options: SymbolOptions) {
    super(chart, options);

    const textBox = this.text.getBBox();
    const slope = 2 * this.textMargin;
    const width = textBox.width + 4 * this.textMargin;
    const height = textBox.height + 2 * this.textMargin;
    const startX = this.textMargin;
    const startY = height / 2;

    const start = { x: startX, y: startY };
    const points = [
      { x: startX + this.textMargin, y: height },
      { x: width, y: height },
      { x: width + slope, y: 0 },
      { x: 0, y: 0 },
      { x: startX, y: startY },
    ];

    this.createPathShape(start, points, options);
  }
}
