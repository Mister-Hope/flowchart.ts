import { FlowChartSymbol } from "./symbol.js";
import { FlowChart } from "../chart.js";

import type { SymbolOptions } from "../options.js";

export class Operation extends FlowChartSymbol {
  then?: (nextSymbol: FlowChartSymbol) => FlowChartSymbol;
  constructor(chart: FlowChart, options: Partial<SymbolOptions> = {}) {
    const symbol = chart.paper.rect(0, 0, 0, 0, 0);

    super(chart, { text: "End", ...options }, symbol);
  }
}
