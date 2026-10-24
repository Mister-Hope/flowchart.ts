import type FlowChart from "../chart.js";
import type { SymbolOptions } from "../options.js";
import FlowChartSymbol from "./symbol.js";

class Start extends FlowChartSymbol {
  constructor(chart: FlowChart, options: Partial<SymbolOptions> = {}) {
    const symbol = chart.paper.rect({ x: 0, y: 0, width: 0, height: 0 }, 20);

    super(chart, { text: "Start", ...options }, symbol);
  }
}

export default Start;
