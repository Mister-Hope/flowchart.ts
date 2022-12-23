import { FlowChartSymbol } from "./symbol.js";
import { FlowChart } from "../chart.js";

import type { SymbolOptions } from "../options.js";

export class End extends FlowChartSymbol {
  then?: (nextSymbol: FlowChartSymbol) => FlowChartSymbol;
  constructor(chart: FlowChart, options: Partial<SymbolOptions> = {}) {
    const symbol = chart.paper.rect(0, 0, 0, 0, 20);
    options.text = options.text || "End";
    super(chart, options, symbol);
  }
}
