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
  if (typeof input !== "string") throw new TypeError("parse() expects a string.");

  const chart: Chart = {
    symbols: {},
    start: null,
    diagram: null,

    draw(container: HTMLElement | string, options: DrawOptions = {}): void {
      // Nothing is defined in the DSL, so there is nothing to render (and no empty `<svg>` left).
      const { start } = this;

      if (start == null) return;

      this.diagram?.clean();

      const diagram = new FlowChart(container, options);

      // Node ids are document-global: suffix them when another chart already uses the same keys.
      diagram.paper.idSuffix = diagram.paper.resolveIdSuffix(Object.keys(this.symbols));

      this.diagram = diagram;
      renderDiagram(this, diagram, start);

      const renderedKeys = new Set(diagram.symbols.map((symbol) => symbol.key));
      const unreachable = Object.keys(this.symbols).filter((key) => !renderedKeys.has(key));

      if (unreachable.length > 0) {
        globalThis.console.warn(
          `[flowchart.ts] ${unreachable.length} node(s) are not reachable from the start node and were not rendered: ${unreachable.join(", ")}.`,
        );
      }
    },

    clean(): void {
      this.diagram?.clean();
    },

    options(): Partial<ParsedDrawOptions> {
      return this.diagram?.options ?? {};
    },
  };

  for (const [index, rawLine] of getLines(input.trim()).entries()) {
    const line = rawLine.trim();

    try {
      if (line.includes("=>")) {
        const symbol = parseDefinition(line);

        chart.symbols[symbol.key] = symbol;
      } else if (line.includes("->")) {
        applyFlowLine(line, chart);
      } else if (line.includes("@>")) {
        applyStyleLine(line, chart);
      }
    } catch (err) {
      // Keep the original error class (SyntaxError / FlowchartSecurityError) and stack.
      (err as Error).message = `Line ${index + 1}: ${(err as Error).message}`;
      throw err;
    }
  }

  return chart;
};
