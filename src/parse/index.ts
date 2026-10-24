import FlowChart from "../chart.js";
import type { DrawOptions, ParsedDrawOptions } from "../options.js";
import { parseDefinition } from "./definition.js";
import { renderDiagram } from "./draw.js";
import { applyFlowLine } from "./flow.js";
import { getLines } from "./lines.js";
import { applyStyleLine } from "./style.js";
import type { Chart } from "./types.js";

export type { Chart } from "./types.js";

/**
 * Parses a flowchart DSL string.
 *
 * @param input DSL text.
 * @returns The parsed chart, which can be drawn with `chart.draw(container, options)`.
 */
export const parse = (input = ""): Chart => {
  const chart: Chart = {
    symbols: {},
    start: null,
    diagram: null,

    draw(container: HTMLElement | string, options: DrawOptions = {}): void {
      // Nothing is defined in the DSL, so there is nothing to render (and no empty `<svg>` left).
      if (this.start == null) return;

      this.diagram?.clean();

      const diagram = new FlowChart(container, options);

      this.diagram = diagram;
      renderDiagram(this, diagram);
    },

    clean(): void {
      this.diagram?.clean();
    },

    options(): ParsedDrawOptions | Record<string, never> {
      return this.diagram?.options ?? {};
    },
  };

  for (const rawLine of getLines(input.trim())) {
    const line = rawLine.trim();

    if (line.includes("=>")) {
      const symbol = parseDefinition(line);

      chart.symbols[symbol.key] = symbol;
    } else if (line.includes("->")) {
      applyFlowLine(line, chart);
    } else if (line.includes("@>")) {
      applyStyleLine(line, chart);
    }
  }

  return chart;
};
