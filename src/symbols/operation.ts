import type FlowChart from "../chart.js";
import type { SymbolOptions } from "../options.js";
import FlowChartSymbol from "./symbol.js";

class Operation extends FlowChartSymbol {
  constructor(chart: FlowChart, options: Partial<SymbolOptions> = {}) {
    const symbol = chart.paper.rect({ x: 0, y: 0, width: 0, height: 0 }, 0);

    super(chart, { text: "Operation", ...options }, symbol);
  }
}

export default Operation;
