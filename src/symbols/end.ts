import type FlowChart from "../chart.js";
import type { SymbolOptions } from "../options.js";
import FlowChartSymbol from "./symbol.js";

class End extends FlowChartSymbol {
  constructor(chart: FlowChart, options: Partial<SymbolOptions> = {}) {
    const symbol = chart.paper.rect({ x: 0, y: 0, width: 0, height: 0 }, 20);

    super(chart, { text: "End", ...options }, symbol);
  }
}

export default End;
