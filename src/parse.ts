/* eslint-disable @typescript-eslint/ban-ts-comment */
import { FlowChart } from "./chart.js";
import {
  Condition,
  End,
  FlowChartSymbol,
  InputOutput,
  Operation,
  Parallel,
  Start,
  Subroutine,
} from "./symbol/index.js";

import type {
  DrawOptions,
  SymbolOptions,
  SymbolType,
  ParsedDrawOptions,
} from "./options.js";

interface Chart {
  symbols: Record<string, SymbolOptions>;
  start: SymbolOptions | null;
  diagram: FlowChart | null;
  draw: (container: HTMLElement | string, options?: DrawOptions) => void;
  clean: () => void;
  options: () => ParsedDrawOptions | Record<string, never>;
}

const getChart = (): Chart => ({
  symbols: {} as Record<string, SymbolOptions>,
  start: null,
  diagram: null as null | FlowChart,

  draw(container: HTMLElement | string, options: DrawOptions = {}): void {
    if (this.diagram) this.diagram.clean();

    // FIXME:
    // @ts-ignore
    const diagram = new FlowChart(container, options);

    this.diagram = diagram;

    const displaySymbols: Record<string, FlowChartSymbol> = {};

    const getDisplaySymbol = (options: SymbolOptions): FlowChartSymbol => {
      if (displaySymbols[options.key]) return displaySymbols[options.key];

      switch (options.symbolType) {
        case "start":
          displaySymbols[options.key] = new Start(diagram, options);
          break;
        case "end":
          displaySymbols[options.key] = new End(diagram, options);
          break;
        case "operation":
          displaySymbols[options.key] = new Operation(diagram, options);
          break;
        case "inputoutput":
          displaySymbols[options.key] = new InputOutput(diagram, options);
          break;
        case "subroutine":
          displaySymbols[options.key] = new Subroutine(diagram, options);
          break;
        case "condition":
          displaySymbols[options.key] = new Condition(diagram, options);
          break;
        case "parallel":
          displaySymbols[options.key] = new Parallel(diagram, options);
          break;
        default:
          throw new Error(`Unknown symbol type ${options.symbolType}!`);
      }

      return displaySymbols[options.key];
    };

    const constructChart = (
      symbol: SymbolOptions,
      prevDisplay?: FlowChartSymbol,
      prev?: FlowChartSymbol
    ): FlowChartSymbol => {
      const displaySymbol = getDisplaySymbol(symbol);

      if (this.start === symbol) diagram.startWith(displaySymbol);
      else if (prevDisplay && prev && !prevDisplay.pathOk) {
        if (prevDisplay instanceof Condition) {
          // FIXME:
          // @ts-ignore
          if (prev.yes === symbol) prevDisplay.yes(displaySymbol);

          // FIXME:
          // @ts-ignore
          if (prev.no === symbol) prevDisplay.no(displaySymbol);
        } else if (prevDisplay instanceof Parallel) {
          // FIXME:
          // @ts-ignore
          if (prev.path1 === symbol) prevDisplay.path1(displaySymbol);

          // FIXME:
          // @ts-ignore
          if (prev.path2 === symbol) prevDisplay.path2(displaySymbol);

          // FIXME:
          // @ts-ignore
          if (prev.path3 === symbol) prevDisplay.path3(displaySymbol);
        }
        // FIXME:
        // @ts-ignore
        else prevDisplay.then(displaySymbol);
      }

      if (displaySymbol.pathOk) return displaySymbol;

      if (displaySymbol instanceof Condition) {
        if (symbol.yes)
          // FIXME:
          // @ts-ignore
          constructChart(symbol.yes, displaySymbol, symbol);
        if (symbol.no)
          // FIXME:
          // @ts-ignore
          constructChart(symbol.no, displaySymbol, symbol);
      } else if (displaySymbol instanceof Parallel) {
        if (symbol.path1)
          // FIXME:
          // @ts-ignore
          constructChart(symbol.path1, displaySymbol, symbol);

        if (symbol.path2)
          // FIXME:
          // @ts-ignore
          constructChart(symbol.path2, displaySymbol, symbol);

        if (symbol.path3)
          // FIXME:
          // @ts-ignore
          constructChart(symbol.path3, displaySymbol, symbol);
      } else if (symbol.next)
        // FIXME:
        // @ts-ignore
        constructChart(symbol.next, displaySymbol, symbol);

      return displaySymbol;
    };

    // FIXME:
    // @ts-ignore
    constructChart(this.start);

    diagram.render();
  },

  clean(): void {
    this.diagram?.clean();
  },

  options(): ParsedDrawOptions | Record<string, never> {
    return this.diagram?.options || {};
  },
});

const getLines = (input: string): string[] => {
  const lines = [];
  let prevBreak = 0;

  for (let index = 1, { length } = input; index < length; index++)
    if (input[index] === "\n" && input[index - 1] !== "\\") {
      const line = input.substring(prevBreak, index);

      prevBreak = index + 1;
      lines.push(line.replace(/\\\n/g, "\n"));
    }

  if (prevBreak < input.length) lines.push(input.substr(prevBreak));

  for (let index = 1, { length } = lines; index < length; ) {
    const currentLine = lines[index];

    if (
      currentLine.indexOf("->") < 0 &&
      currentLine.indexOf("=>") < 0 &&
      currentLine.indexOf("@>") < 0
    ) {
      lines[index - 1] += `\n${currentLine}`;
      lines.splice(index, 1);
      length--;
    } else index++;
  }

  return lines;
};

const getStyle = (line: string): string => {
  const startIndex = line.indexOf("(") + 1;
  const endIndex = line.indexOf(")");
  if (startIndex >= 0 && endIndex >= 0)
    return line.substring(startIndex, endIndex);

  return "{}";
};

const getSymbolValue = (line: string): string => {
  const startIndex = line.indexOf("(") + 1;
  const endIndex = line.indexOf(")");
  if (startIndex >= 0 && endIndex >= 0)
    return line.substring(startIndex, endIndex);

  return "";
};

const getSymbol = (line: string, chart: Chart): SymbolOptions => {
  const startIndex = line.indexOf("(") + 1;
  const endIndex = line.indexOf(")");
  if (startIndex >= 0 && endIndex >= 0)
    return chart.symbols[line.substring(0, startIndex - 1)];

  return chart.symbols[line];
};

const getAnnotation = (line: string): string => {
  const startIndex = line.indexOf("(") + 1,
    endIndex = line.indexOf(")");
  let tmp = line.substring(startIndex, endIndex);
  if (tmp.indexOf(",") > 0) {
    tmp = tmp.substring(0, tmp.indexOf(","));
  }
  const tmpSplit = tmp.split("@");

  return tmpSplit.length > 1
    ? startIndex >= 0 && endIndex >= 0
      ? tmpSplit[1]
      : ""
    : "";
};

export const parse = (input = ""): Chart => {
  const chart = getChart();
  const lines = getLines(input.trim());

  while (lines.length > 0) {
    let line = lines.splice(0, 1)[0].trim();

    if (line.indexOf("=>") >= 0) {
      // definition
      const parts = line.split("=>");

      // FIXME:
      // @ts-ignore
      const symbol: SymbolOptions = {
        key: parts[0].replace(/\(.*\)/, ""),
        symbolType: <SymbolType>parts[1],
        text: null,
        link: null,
        target: null,
        flowstate: null,
        function: null,
        lineStyle: {},
        params: {},
      };

      //parse parameters
      const params = parts[0].match(/\((.*)\)/);
      if (params && params.length > 1) {
        const entries = params[1].split(",");
        for (let i = 0; i < entries.length; i++) {
          const entry = entries[i].split("=");
          if (entry.length == 2) {
            symbol.params[entry[0]] = entry[1];
          }
        }
      }

      let sub: string[];

      if (symbol.symbolType.indexOf(": ") >= 0) {
        sub = symbol.symbolType.split(": ");
        // FIXME:
        // @ts-ignore
        symbol.symbolType = <SymbolType>sub.shift();
        symbol.text = sub.join(": ");
      }

      if (symbol.text && symbol.text.indexOf(":$") >= 0) {
        sub = symbol.text.split(":$");
        symbol.text = sub.shift()!;
        symbol.function = sub.join(":$");
      } else if (symbol.symbolType.indexOf(":$") >= 0) {
        sub = symbol.symbolType.split(":$");
        symbol.symbolType = <SymbolType>sub.shift();
        symbol.function = sub.join(":$");
      } else if (symbol.text && symbol.text.indexOf(":>") >= 0) {
        sub = symbol.text.split(":>");
        symbol.text = sub.shift()!;
        symbol.link = sub.join(":>");
      } else if (symbol.symbolType.indexOf(":>") >= 0) {
        sub = symbol.symbolType.split(":>");
        symbol.symbolType = <SymbolType>sub.shift();
        symbol.link = sub.join(":>");
      }

      if (symbol.symbolType.indexOf("\n") >= 0) {
        symbol.symbolType = <SymbolType>symbol.symbolType.split("\n")[0];
      }

      /* adding support for links */
      if (symbol.link) {
        const startIndex = symbol.link.indexOf("[") + 1;
        const endIndex = symbol.link.indexOf("]");
        if (startIndex >= 0 && endIndex >= 0) {
          symbol.target = symbol.link.substring(startIndex, endIndex);
          symbol.link = symbol.link.substring(0, startIndex - 1);
        }
      }
      /* end of link support */

      /* adding support for flowstates */
      if (symbol.text) {
        if (symbol.text.indexOf("|") >= 0) {
          const txtAndState = symbol.text.split("|");

          symbol.flowstate = txtAndState.pop()!.trim();
          symbol.text = txtAndState.join("|");
        }
      }
      /* end of flowstate support */

      chart.symbols[symbol.key] = symbol;
    } else if (line.indexOf("->") >= 0) {
      let annotation: string | null = getAnnotation(line);

      if (annotation) line = line.replace("@" + annotation, "");

      // flow
      const flowSymbols = line.split("->");

      for (let iS = 0, lenS = flowSymbols.length; iS < lenS; iS++) {
        let flowSymbol = flowSymbols[iS];
        const symbolValue = getSymbolValue(flowSymbol);

        if (symbolValue === "true" || symbolValue === "false") {
          // map true or false to yes or no respectively
          flowSymbol = flowSymbol.replace("true", "yes");
          flowSymbol = flowSymbol.replace("false", "no");
        }

        const getNextPath = (line: string): string => {
          let next = "next";
          const startIndex = line.indexOf("(") + 1;
          const endIndex = line.indexOf(")");
          if (startIndex >= 0 && endIndex >= 0) {
            next = flowSymbol.substring(startIndex, endIndex);

            if (next.indexOf(",") < 0)
              if (next !== "yes" && next !== "no") next = `next, ${next}`;
          }

          return next;
        };

        let next = getNextPath(flowSymbol);
        const realSymbol = getSymbol(flowSymbol, chart);

        let direction = null;

        if (next.indexOf(",") >= 0) {
          const conditionOption = next.split(",");

          next = conditionOption[0];
          direction = conditionOption[1].trim();
        }

        if (annotation) {
          if (next == "yes" || next == "true")
            realSymbol.yes_annotation = annotation;
          else realSymbol.no_annotation = annotation;

          annotation = null;
        }

        if (!chart.start)
          if (iS + 1 < lenS) {
            // FIXME:
            // @ts-ignore
            chart.start = realSymbol;

            const nextSymbol = flowSymbols[iS + 1];

            realSymbol[next] = getSymbol(nextSymbol, chart);
            realSymbol["direction_" + next] = direction;
            direction = null;
          }
      }
    } else if (line.indexOf("@>") >= 0) {
      // line style
      const lineStyleSymbols = line.split("@>");
      for (let iSS = 0, lenSS = lineStyleSymbols.length; iSS < lenSS; iSS++) {
        if (iSS + 1 !== lenSS) {
          const currentSymbol = getSymbol(lineStyleSymbols[iSS], chart);
          const nextSymbol = getSymbol(lineStyleSymbols[iSS + 1], chart);

          currentSymbol["lineStyle"][nextSymbol.key] = JSON.parse(
            getStyle(lineStyleSymbols[iSS + 1])
          );
        }
      }
    }
  }

  return chart;
};
