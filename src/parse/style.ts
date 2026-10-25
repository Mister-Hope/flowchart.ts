import { sanitizeLineStyle } from "../security.js";
import { getStyle, requireSymbol } from "./definition.js";
import type { Chart } from "./types.js";

/**
 * Applies a DSL line-style line such as `st@>op({"stroke":"red"})` to the parsed chart.
 *
 * @param line Line-style line.
 * @param chart Chart being built.
 */
export const applyStyleLine = (line: string, chart: Chart): void => {
  const lineStyleSymbols = line.split("@>");

  for (const [index, current] of lineStyleSymbols.entries()) {
    const next = lineStyleSymbols[index + 1];

    if (next == null) continue;

    const currentSymbol = requireSymbol(current, chart);
    const nextSymbol = requireSymbol(next, chart);
    const style = JSON.parse(getStyle(next)) as unknown;

    currentSymbol.lineStyle[nextSymbol.key] = sanitizeLineStyle(style);
  }
};
