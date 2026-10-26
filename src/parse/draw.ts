import type FlowChart from "../chart.js";
import type { SymbolOptions, SymbolType } from "../options.js";
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

type SymbolConstructor = new (chart: FlowChart, options: SymbolOptions) => FlowChartSymbol;

/** Display classes by parsed symbol type. */
const SYMBOL_CONSTRUCTORS: Record<SymbolType, SymbolConstructor> = {
  start: Start,
  end: End,
  operation: Operation,
  inputoutput: InputOutput,
  input: Input,
  output: Output,
  subroutine: Subroutine,
  condition: Condition,
  parallel: Parallel,
};

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

  const displaySymbol = new SYMBOL_CONSTRUCTORS[symbolType](diagram, symbolOptions);

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

interface BuildTask {
  symbol: SymbolOptions;
  prevDisplay?: FlowChartSymbol;
  prev?: SymbolOptions;
}

/**
 * Walks the parsed symbols depth-first and builds the display-symbol tree.
 *
 * The walk uses an explicit stack so deep chains cannot overflow the call stack, and it expands
 * every parsed symbol at most once so cyclic definitions (`c1(yes)->c2`, `c2(no)->c1`) terminate.
 *
 * @param context Diagram plus parsed chart and display-symbol cache.
 * @param start Parsed start symbol.
 * @returns The display symbol for `start`.
 */
const constructChart = (context: BuildContext, start: SymbolOptions): FlowChartSymbol => {
  const startDisplay = getDisplaySymbol(context.diagram, start, context.displaySymbols);
  const stack: BuildTask[] = [{ symbol: start }];
  const expanded = new Set<string>();

  for (let task = stack.pop(); task != null; task = stack.pop()) {
    const displaySymbol = getDisplaySymbol(context.diagram, task.symbol, context.displaySymbols);

    if (context.chart.start === task.symbol) context.diagram.startWith(displaySymbol);
    else if (task.prevDisplay != null && task.prev != null && !task.prevDisplay.pathOk)
      linkFromPrevious(displaySymbol, task.symbol, task.prevDisplay, task.prev);

    // A parsed symbol is expanded once: this stops cyclic definitions from recursing forever.
    if (displaySymbol.pathOk || expanded.has(task.symbol.key)) continue;

    expanded.add(task.symbol.key);

    const children = getChildren(task.symbol, displaySymbol);

    // Push in reverse so the first child is processed next, keeping the original DFS order.
    for (const child of [...children].reverse())
      stack.push({ symbol: child, prevDisplay: displaySymbol, prev: task.symbol });
  }

  return startDisplay;
};
/**
 * Builds the symbol tree of a parsed chart and renders the diagram.
 *
 * @param chart Parsed chart.
 * @param diagram Diagram to render into.
 * @param start Parsed start symbol (later branches are discovered from it).
 */
export const renderDiagram = (chart: Chart, diagram: FlowChart, start: SymbolOptions): void => {
  const context: BuildContext = { chart, diagram, displaySymbols: {} };
  const displayStart = constructChart(context, start);

  diagram.render(displayStart);
};
