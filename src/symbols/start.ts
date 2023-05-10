import FlowChartSymbol from "./symbol.js";
import FlowChart from "../chart.js";

import type { SymbolOptions } from "../options.js";

class Start extends FlowChartSymbol {
  then?: (nextSymbol: FlowChartSymbol) => FlowChartSymbol;
  constructor(chart: FlowChart, options: Partial<SymbolOptions> = {}) {
    const symbol = chart.paper.rect(0, 0, 0, 0, 20);

    super(chart, { text: "Start", ...options }, symbol);
  }
}

export default Start;
