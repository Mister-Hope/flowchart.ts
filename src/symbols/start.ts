import type FlowChart from "../chart.js";
import type { SymbolOptions } from "../options.js";
import { FlowChartSymbol } from "./symbol.js";

export class Start extends FlowChartSymbol {
  constructor(chart: FlowChart, options: SymbolOptions) {
    const symbol = chart.paper.rect({ x: 0, y: 0, width: 0, height: 0 }, 20);
    // The original renderer falls back to the default for a missing or empty text.
    const text = options.text == null || options.text === "" ? "Start" : options.text;

    super(chart, { ...options, text }, symbol);
  }
}
