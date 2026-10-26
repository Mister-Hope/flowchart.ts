import type FlowChart from "../chart.js";
import type { SymbolOptions } from "../options.js";
import { TrapezoidSymbol } from "./trapezoid.js";

/**
 * Output node: an upright trapezoid whose bottom edge is wider than the top edge.
 *
 * ```flowchart
 * print=>output: Print result
 * ```
 */
export class Output extends TrapezoidSymbol {
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
      { x: 0, y: height },
      { x: width + slope, y: height },
      { x: width, y: 0 },
      { x: slope, y: 0 },
      { x: startX, y: startY },
    ];

    this.createPathShape(start, points, options);
  }
}
