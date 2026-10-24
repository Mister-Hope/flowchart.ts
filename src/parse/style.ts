import type { LineStyle } from "../options.js";
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

  for (let index = 0, { length } = lineStyleSymbols; index < length; index += 1) {
    if (index + 1 !== length) {
      const currentSymbol = requireSymbol(lineStyleSymbols[index] ?? "", chart);
      const nextSymbol = requireSymbol(lineStyleSymbols[index + 1] ?? "", chart);

      currentSymbol.lineStyle[nextSymbol.key] = JSON.parse(
        getStyle(lineStyleSymbols[index + 1] ?? ""),
      ) as LineStyle;
    }
  }
};
