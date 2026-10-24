import FlowChart from "./chart.js";
import type {
  Direction,
  DrawOptions,
  LineStyle,
  ParsedDrawOptions,
  SymbolOptions,
  SymbolType,
} from "./options.js";
import type { FlowChartSymbol } from "./symbols/index.js";
import {
  Condition,
  End,
  InputOutput,
  Operation,
  Parallel,
  Start,
  Subroutine,
} from "./symbols/index.js";

export interface Chart {
  symbols: Record<string, SymbolOptions>;
  start: SymbolOptions | null;
  diagram: FlowChart | null;
  draw: (container: HTMLElement | string, options?: DrawOptions) => void;
  clean: () => void;
  options: () => ParsedDrawOptions | Record<string, never>;
}

const getChart = (): Chart => ({
  symbols: {},
  start: null,
  diagram: null,

  draw(container: HTMLElement | string, options: DrawOptions = {}): void {
    // Nothing is defined in the DSL, so there is nothing to render (and no empty `<svg>` left).
    if (this.start == null) return;

    if (this.diagram != null) this.diagram.clean();

    const diagram = new FlowChart(container, options);

    this.diagram = diagram;

    const displaySymbols: Record<string, FlowChartSymbol> = {};

    const getDisplaySymbol = (symbolOptions: SymbolOptions): FlowChartSymbol => {
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

    const constructChart = (
      symbol: SymbolOptions,
      prevDisplay?: FlowChartSymbol,
      prev?: SymbolOptions,
    ): FlowChartSymbol => {
      const displaySymbol = getDisplaySymbol(symbol);

      if (this.start === symbol) {
        diagram.startWith(displaySymbol);
      } else if (prevDisplay != null && prev != null && !prevDisplay.pathOk) {
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
      }

      if (displaySymbol.pathOk) return displaySymbol;

      if (displaySymbol instanceof Condition) {
        if (symbol.yes != null) constructChart(symbol.yes, displaySymbol, symbol);
        if (symbol.no != null) constructChart(symbol.no, displaySymbol, symbol);
      } else if (displaySymbol instanceof Parallel) {
        if (symbol.path1 != null) constructChart(symbol.path1, displaySymbol, symbol);
        if (symbol.path2 != null) constructChart(symbol.path2, displaySymbol, symbol);
        if (symbol.path3 != null) constructChart(symbol.path3, displaySymbol, symbol);
      } else if (symbol.next != null) {
        constructChart(symbol.next, displaySymbol, symbol);
      }

      return displaySymbol;
    };

    if (this.start != null) constructChart(this.start);

    diagram.render();
  },

  clean(): void {
    this.diagram?.clean();
  },

  options(): ParsedDrawOptions | Record<string, never> {
    return this.diagram?.options ?? {};
  },
});

const getLines = (input: string): string[] => {
  const lines: string[] = [];
  let prevBreak = 0;

  for (let index = 1; index < input.length; index += 1) {
    if (input[index] === "\n" && input[index - 1] !== "\\") {
      const line = input.slice(prevBreak, index);

      prevBreak = index + 1;
      lines.push(line.replaceAll("\\\n", "\n"));
    }
  }

  if (prevBreak < input.length) lines.push(input.slice(prevBreak));

  for (let index = 1, { length } = lines; index < length;) {
    const currentLine = lines[index] ?? "";

    if (!currentLine.includes("->") && !currentLine.includes("=>") && !currentLine.includes("@>")) {
      lines[index - 1] += `\n${currentLine}`;
      lines.splice(index, 1);
      length -= 1;
    } else {
      index += 1;
    }
  }

  return lines;
};

const getStyle = (line: string): string => {
  const startIndex = line.indexOf("(") + 1;
  const endIndex = line.indexOf(")");

  if (startIndex > 0 && endIndex > 0) return line.slice(startIndex, endIndex);

  return "{}";
};

const getSymbolValue = (line: string): string => {
  const startIndex = line.indexOf("(") + 1;
  const endIndex = line.indexOf(")");

  if (startIndex > 0 && endIndex > 0) return line.slice(startIndex, endIndex);

  return "";
};

const getSymbol = (line: string, chart: Chart): SymbolOptions | undefined => {
  const startIndex = line.indexOf("(") + 1;
  const endIndex = line.indexOf(")");

  if (startIndex > 0 && endIndex > 0) return chart.symbols[line.slice(0, startIndex - 1)];

  return chart.symbols[line];
};

const requireSymbol = (line: string, chart: Chart): SymbolOptions => {
  const symbol = getSymbol(line, chart);

  if (symbol == null) throw new Error(`Unknown symbol "${line}" in flowchart definition.`);

  return symbol;
};

const getAnnotation = (line: string): string => {
  const startIndex = line.indexOf("(") + 1;
  const endIndex = line.indexOf(")");
  let temp = line.slice(startIndex, endIndex);

  if (temp.indexOf(",") > 0) temp = temp.slice(0, temp.indexOf(","));

  const tempSplit = temp.split("@");

  return tempSplit.length > 1 ? (startIndex > 0 && endIndex > 0 ? (tempSplit[1] ?? "") : "") : "";
};

const DIRECTIONS = new Set<string>(["top", "right", "left", "bottom", "path1", "path2", "path3"]);

const BRANCH_NAMES = new Set<string>(["next", "yes", "no", "path1", "path2", "path3"]);

const SYMBOL_TYPES = new Set<string>([
  "start",
  "end",
  "operation",
  "inputoutput",
  "subroutine",
  "condition",
  "parallel",
]);

const isSymbolType = (value: string): value is SymbolType => SYMBOL_TYPES.has(value);

const setLinkedSymbol = (source: SymbolOptions, name: string, target: SymbolOptions): void => {
  switch (name) {
    case "yes": {
      source.yes = target;
      break;
    }
    case "no": {
      source.no = target;
      break;
    }
    case "path1": {
      source.path1 = target;
      break;
    }
    case "path2": {
      source.path2 = target;
      break;
    }
    case "path3": {
      source.path3 = target;
      break;
    }
    default: {
      source.next = target;
      break;
    }
  }
};

const setLinkedDirection = (
  source: SymbolOptions,
  name: string,
  direction: Direction | null,
): void => {
  switch (name) {
    case "yes": {
      source.direction_yes = direction;
      break;
    }
    case "no": {
      source.direction_no = direction;
      break;
    }
    case "path1": {
      source.direction_path1 = direction;
      break;
    }
    case "path2": {
      source.direction_path2 = direction;
      break;
    }
    case "path3": {
      source.direction_path3 = direction;
      break;
    }
    default: {
      source.direction_next = direction;
      break;
    }
  }
};

const parseDefinition = (line: string): SymbolOptions => {
  const parts = line.split("=>");
  const key = (parts[0] ?? "").replace(/\(.*\)/u, "");
  let rawType = parts[1] ?? "";
  let text: string | null = null;
  let link: string | null = null;
  let target: string | null = null;
  let flowstate: string | null = null;
  let functionName: string | null = null;

  const params: Record<string, string> = {};
  const paramsMatch = /\((?<params>.*)\)/u.exec(parts[0] ?? "");

  const paramsText = paramsMatch?.groups?.params;

  if (paramsText != null) {
    for (const entry of paramsText.split(",")) {
      const entryParts = entry.split("=");
      const [paramKey, paramValue] = entryParts;

      if (entryParts.length === 2 && paramKey != null && paramValue != null)
        params[paramKey.trim()] = paramValue.trim();
    }
  }

  if (rawType.includes(": ")) {
    const sub = rawType.split(": ");

    rawType = sub.shift() ?? "";
    text = sub.join(": ");
  }

  if (text != null && text.includes(":$")) {
    const sub = text.split(":$");

    text = sub.shift() ?? null;
    functionName = sub.join(":$");
  } else if (rawType.includes(":$")) {
    const sub = rawType.split(":$");

    rawType = sub.shift() ?? "";
    functionName = sub.join(":$");
  } else if (text != null && text.includes(":>")) {
    const sub = text.split(":>");

    text = sub.shift() ?? null;
    link = sub.join(":>");
  } else if (rawType.includes(":>")) {
    const sub = rawType.split(":>");

    rawType = sub.shift() ?? "";
    link = sub.join(":>");
  }

  if (rawType.includes("\n")) rawType = rawType.split("\n")[0] ?? "";

  if (link != null) {
    const startIndex = link.indexOf("[") + 1;
    const endIndex = link.indexOf("]");

    if (startIndex > 0 && endIndex > 0) {
      target = link.slice(startIndex, endIndex);
      link = link.slice(0, startIndex - 1);
    }
  }

  if (text != null && text.includes("|")) {
    const textAndState = text.split("|");

    flowstate = textAndState.pop()?.trim() ?? null;
    text = textAndState.join("|");
  }

  if (!isSymbolType(rawType))
    throw new Error(`Unknown symbol type "${rawType}" for node "${key}"!`);

  return {
    key,
    symbolType: rawType,
    text,
    link,
    target,
    function: functionName,
    flowstate,
    lineStyle: {},
    params,
  };
};

const setAnnotation = (symbol: SymbolOptions, next: string, annotation: string): void => {
  if (symbol.symbolType === "condition") {
    if (next === "yes" || next === "true") symbol.yes_annotation = annotation;
    else symbol.no_annotation = annotation;
  } else if (symbol.symbolType === "parallel") {
    if (next === "path1") symbol.path1_annotation = annotation;
    else if (next === "path2") symbol.path2_annotation = annotation;
    else if (next === "path3") symbol.path3_annotation = annotation;
  }
};

export const parse = (input = ""): Chart => {
  const chart = getChart();
  const lines = getLines(input.trim());

  while (lines.length > 0) {
    const rawLine = lines.shift();

    if (rawLine == null) break;

    let line = rawLine.trim();

    if (line.includes("=>")) {
      const symbol = parseDefinition(line);

      chart.symbols[symbol.key] = symbol;
    } else if (line.includes("->")) {
      let annotation: string | null = getAnnotation(line);

      if (annotation != null && annotation !== "") line = line.replace(`@${annotation}`, "");

      // flow
      const flowSymbols = line.split("->");

      for (let index = 0, { length } = flowSymbols; index < length; index += 1) {
        let flowSymbol = flowSymbols[index] ?? "";
        const symbolValue = getSymbolValue(flowSymbol);

        if (symbolValue === "true" || symbolValue === "false") {
          // map true or false to yes or no respectively
          flowSymbol = flowSymbol.replace("true", "yes").replace("false", "no");
        }

        const getNextPath = (): string => {
          let next = "next";
          const startIndex = flowSymbol.indexOf("(") + 1;
          const endIndex = flowSymbol.indexOf(")");

          if (startIndex > 0 && endIndex > 0) {
            next = flowSymbol.slice(startIndex, endIndex);

            if (!next.includes(",") && next !== "yes" && next !== "no") next = `next, ${next}`;
          }

          return next;
        };

        let next = getNextPath();
        const realSymbol = requireSymbol(flowSymbol, chart);

        let direction: Direction | null = null;

        if (next.includes(",")) {
          const conditionOption = next.split(",");

          next = conditionOption[0] ?? "next";
          direction = (conditionOption[1]?.trim() ?? null) as Direction | null;
        }

        if (!BRANCH_NAMES.has(next)) {
          throw new Error(
            `Unknown branch "${next}" for node "${realSymbol.key}", expected one of ${[...BRANCH_NAMES].join(", ")}!`,
          );
        }

        if (direction != null && !DIRECTIONS.has(direction)) {
          throw new Error(
            `Unknown direction "${direction}" for node "${realSymbol.key}", expected one of ${[...DIRECTIONS].join(", ")}!`,
          );
        }

        if (annotation != null && annotation !== "") {
          setAnnotation(realSymbol, next, annotation);

          annotation = null;
        }

        chart.start ??= realSymbol;

        if (index + 1 < length) {
          const nextSymbol = requireSymbol(flowSymbols[index + 1] ?? "", chart);

          setLinkedSymbol(realSymbol, next, nextSymbol);
          setLinkedDirection(realSymbol, next, direction);
          direction = null;
        }
      }
    } else if (line.includes("@>")) {
      // line style
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
    }
  }

  return chart;
};
