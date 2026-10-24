import type FlowChart from "../chart.js";
import type { SymbolOptions } from "../options.js";
import type { FlowChartSymbol } from "../symbols/index.js";
import {
  Condition,
  End,
  Input,
  InputOutput,
  Operation,
  Output,
  Parallel,
  Start,
  Subroutine,
} from "../symbols/index.js";
import type { Chart } from "./types.js";

interface BuildContext {
  chart: Chart;
  diagram: FlowChart;
  displaySymbols: Record<string, FlowChartSymbol>;
}

const getDisplaySymbol = (
  diagram: FlowChart,
  symbolOptions: SymbolOptions,
  displaySymbols: Record<string, FlowChartSymbol>,
): FlowChartSymbol => {
  const { key, symbolType } = symbolOptions;
  const existing = displaySymbols[key];

  if (existing != null) return existing;

  let displaySymbol: FlowChartSymbol;

  switch (symbolType) {
    case "start": {
      displaySymbol = new Start(diagram, symbolOptions);
      break;
    }
    case "end": {
      displaySymbol = new End(diagram, symbolOptions);
      break;
    }
    case "operation": {
      displaySymbol = new Operation(diagram, symbolOptions);
      break;
    }
    case "inputoutput": {
      displaySymbol = new InputOutput(diagram, symbolOptions);
      break;
    }
    case "input": {
      displaySymbol = new Input(diagram, symbolOptions);
      break;
    }
    case "output": {
      displaySymbol = new Output(diagram, symbolOptions);
      break;
    }
    case "subroutine": {
      displaySymbol = new Subroutine(diagram, symbolOptions);
      break;
    }
    case "condition": {
      displaySymbol = new Condition(diagram, symbolOptions);
      break;
    }
    case "parallel": {
      displaySymbol = new Parallel(diagram, symbolOptions);
      break;
    }
    default: {
      throw new Error(`Unknown symbol type "${String(symbolType)}"!`);
    }
  }

  displaySymbols[key] = displaySymbol;

  return displaySymbol;
};

// Connects the display symbol to the symbol it was reached from.
const linkFromPrevious = (
  displaySymbol: FlowChartSymbol,
  symbol: SymbolOptions,
  prevDisplay: FlowChartSymbol,
  prev: SymbolOptions,
): void => {
  if (prevDisplay instanceof Condition) {
    if (prev.yes === symbol) prevDisplay.yes?.(displaySymbol);
    if (prev.no === symbol) prevDisplay.no?.(displaySymbol);
  } else if (prevDisplay instanceof Parallel) {
    if (prev.path1 === symbol) prevDisplay.path1?.(displaySymbol);
    if (prev.path2 === symbol) prevDisplay.path2?.(displaySymbol);
    if (prev.path3 === symbol) prevDisplay.path3?.(displaySymbol);
  } else {
    prevDisplay.thenHandler?.(displaySymbol);
  }
};

// Returns the parsed children of a symbol for its display-symbol kind.
const getChildren = (symbol: SymbolOptions, displaySymbol: FlowChartSymbol): SymbolOptions[] => {
  if (displaySymbol instanceof Condition)
    return [symbol.yes, symbol.no].filter((child): child is SymbolOptions => child != null);

  if (displaySymbol instanceof Parallel) {
    return [symbol.path1, symbol.path2, symbol.path3].filter(
      (child): child is SymbolOptions => child != null,
    );
  }

  return symbol.next == null ? [] : [symbol.next];
};

/**
 * Walks the parsed symbols depth-first and builds the display-symbol tree.
 *
 * @param context Diagram plus parsed chart and display-symbol cache.
 * @param symbol Symbol to build.
 * @param prevDisplay Display symbol the current one is linked from.
 * @param prev Parsed symbol the current one is linked from.
 * @returns The display symbol for `symbol`.
 */
const constructChart = (
  context: BuildContext,
  symbol: SymbolOptions,
  prevDisplay?: FlowChartSymbol,
  prev?: SymbolOptions,
): FlowChartSymbol => {
  const displaySymbol = getDisplaySymbol(context.diagram, symbol, context.displaySymbols);

  if (context.chart.start === symbol) context.diagram.startWith(displaySymbol);
  else if (prevDisplay != null && prev != null && !prevDisplay.pathOk)
    linkFromPrevious(displaySymbol, symbol, prevDisplay, prev);

  if (!displaySymbol.pathOk) {
    for (const child of getChildren(symbol, displaySymbol))
      constructChart(context, child, displaySymbol, symbol);
  }

  return displaySymbol;
};

/**
 * Builds the symbol tree of a parsed chart and renders the diagram.
 *
 * @param chart Parsed chart.
 * @param diagram Diagram to render into.
 */
export const renderDiagram = (chart: Chart, diagram: FlowChart): void => {
  const context: BuildContext = { chart, diagram, displaySymbols: {} };

  if (chart.start != null) constructChart(context, chart.start);

  diagram.render();
};
