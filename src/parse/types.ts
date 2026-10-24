import type FlowChart from "../chart.js";
import type { DrawOptions, ParsedDrawOptions, SymbolOptions } from "../options.js";

/** A parsed flowchart chart: definitions plus the lazily rendered diagram. */
export interface Chart {
  symbols: Record<string, SymbolOptions>;
  start: SymbolOptions | null;
  diagram: FlowChart | null;
  draw: (container: HTMLElement | string, options?: DrawOptions) => void;
  clean: () => void;
  options: () => ParsedDrawOptions | Record<string, never>;
}
