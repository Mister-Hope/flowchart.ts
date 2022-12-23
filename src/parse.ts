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

import type { DrawOptions, SymbolOptions } from "./options";

const chart = {
  symbols: {} as Record<string, SymbolOptions>,
  start: null,
  diagram: null as null | FlowChart,

  drawSVG(container: HTMLElement | string, options: DrawOptions = {}): void {
    if (this.diagram) this.diagram.clean();

    const diagram = new FlowChart(container, options);
    this.diagram = diagram;

    const dispSymbols: Record<string, FlowChartSymbol> = {};

    const getDisplaySymbol = (options: SymbolOptions): FlowChartSymbol => {
      if (dispSymbols[options.key]) return dispSymbols[options.key];

      switch (options.symbolType) {
        case "start":
          dispSymbols[options.key] = new Start(diagram, options);
          break;
        case "end":
          dispSymbols[options.key] = new End(diagram, options);
          break;
        case "operation":
          dispSymbols[options.key] = new Operation(diagram, options);
          break;
        case "inputoutput":
          dispSymbols[options.key] = new InputOutput(diagram, options);
          break;
        case "subroutine":
          dispSymbols[options.key] = new Subroutine(diagram, options);
          break;
        case "condition":
          dispSymbols[options.key] = new Condition(diagram, options);
          break;
        case "parallel":
          dispSymbols[options.key] = new Parallel(diagram, options);
          break;
        default:
          throw new Error("Wrong symbol type!");
      }

      return dispSymbols[options.key];
    };

    const constructChart = (
      symbol: SymbolOptions,
      prevDisplay: FlowChartSymbol,
      prev: FlowChartSymbol
    ) => {
      const displaySymbol = getDisplaySymbol(symbol);

      if (this.start === symbol) diagram.startWith(displaySymbol);
      else if (prevDisplay && prev && !prevDisplay.pathOk) {
        if (prevDisplay instanceof Condition) {
          if (prev.yes === symbol) prevDisplay.yes(displaySymbol);

          if (prev.no === symbol) prevDisplay.no(displaySymbol);
        } else if (prevDisplay instanceof Parallel) {
          if (prev.path1 === symbol) prevDisplay.path1(displaySymbol);

          if (prev.path2 === symbol) prevDisplay.path2(displaySymbol);

          if (prev.path3 === symbol) prevDisplay.path3(displaySymbol);
        } else prevDisplay.then(displaySymbol);
      }

      if (displaySymbol.pathOk) return displaySymbol;

      if (displaySymbol instanceof Condition) {
        if (symbol.yes) constructChart(symbol.yes, displaySymbol, symbol);
        if (symbol.no) constructChart(symbol.no, displaySymbol, symbol);
      } else if (displaySymbol instanceof Parallel) {
        if (symbol.path1) constructChart(symbol.path1, displaySymbol, symbol);

        if (symbol.path2) constructChart(symbol.path2, displaySymbol, symbol);

        if (symbol.path3) constructChart(symbol.path3, displaySymbol, symbol);
      } else if (symbol.next)
        constructChart(symbol.next, displaySymbol, symbol);

      return displaySymbol;
    };

    constructChart(this.start);

    diagram.render();
  },

  clean(): void {
    this.diagram.clean();
  },

  options(): void {
    return this.diagram.options;
  },
};

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

const getSymbol = (line: string) => {
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

export const parse = (input = ""): void => {
  const lines = getLines(input.trim());

  const getNextPath = (line: string): string => {
    let next = "next";
    const startIndex = line.indexOf("(") + 1;
    const endIndex = line.indexOf(")");
    if (startIndex >= 0 && endIndex >= 0) {
      next = flowSymb.substring(startIndex, endIndex);

      if (next.indexOf(",") < 0)
        if (next !== "yes" && next !== "no") next = `next, ${next}`;
    }

    return next;
  };

  while (lines.length > 0) {
    let line = lines.splice(0, 1)[0].trim();

    if (line.indexOf("=>") >= 0) {
      // definition
      const parts = line.split("=>");

      const symbol: SymbolOptions = {
        key: parts[0].replace(/\(.*\)/, ""),
        symbolType: parts[1],
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

      var sub;

      if (symbol.symbolType.indexOf(": ") >= 0) {
        sub = symbol.symbolType.split(": ");
        symbol.symbolType = sub.shift();
        symbol.text = sub.join(": ");
      }

      if (symbol.text && symbol.text.indexOf(":$") >= 0) {
        sub = symbol.text.split(":$");
        symbol.text = sub.shift();
        symbol.function = sub.join(":$");
      } else if (symbol.symbolType.indexOf(":$") >= 0) {
        sub = symbol.symbolType.split(":$");
        symbol.symbolType = sub.shift();
        symbol.function = sub.join(":$");
      } else if (symbol.text && symbol.text.indexOf(":>") >= 0) {
        sub = symbol.text.split(":>");
        symbol.text = sub.shift();
        symbol.link = sub.join(":>");
      } else if (symbol.symbolType.indexOf(":>") >= 0) {
        sub = symbol.symbolType.split(":>");
        symbol.symbolType = sub.shift();
        symbol.link = sub.join(":>");
      }

      if (symbol.symbolType.indexOf("\n") >= 0) {
        symbol.symbolType = symbol.symbolType.split("\n")[0];
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
          symbol.flowstate = txtAndState.pop().trim();
          symbol.text = txtAndState.join("|");
        }
      }
      /* end of flowstate support */

      chart.symbols[symbol.key] = symbol;
    } else if (line.indexOf("->") >= 0) {
      let ann = getAnnotation(line);
      if (ann) {
        line = line.replace("@" + ann, "");
      }
      // flow
      const flowSymbols = line.split("->");
      for (let iS = 0, lenS = flowSymbols.length; iS < lenS; iS++) {
        var flowSymb = flowSymbols[iS];
        const symbVal = getSymbolValue(flowSymb);

        if (symbVal === "true" || symbVal === "false") {
          // map true or false to yes or no respectively
          flowSymb = flowSymb.replace("true", "yes");
          flowSymb = flowSymb.replace("false", "no");
        }

        let next = getNextPath(flowSymb);
        const realSymb = getSymbol(flowSymb);

        let direction = null;
        if (next.indexOf(",") >= 0) {
          const condOpt = next.split(",");
          next = condOpt[0];
          direction = condOpt[1].trim();
        }

        if (ann) {
          if (next == "yes" || next == "true") realSymb.yes_annotation = ann;
          else realSymb.no_annotation = ann;
          ann = null;
        }

        if (!chart.start) {
          chart.start = realSymb;
        }

        if (iS + 1 < lenS) {
          const nextSymb = flowSymbols[iS + 1];
          realSymb[next] = getSymbol(nextSymb);
          realSymb["direction_" + next] = direction;
          direction = null;
        }
      }
    } else if (line.indexOf("@>") >= 0) {
      // line style
      const lineStyleSymbols = line.split("@>");
      for (let iSS = 0, lenSS = lineStyleSymbols.length; iSS < lenSS; iSS++) {
        if (iSS + 1 !== lenSS) {
          const curSymb = getSymbol(lineStyleSymbols[iSS]);
          const nextSymbol = getSymbol(lineStyleSymbols[iSS + 1]);

          curSymb["lineStyle"][nextSymbol.key] = JSON.parse(
            getStyle(lineStyleSymbols[iSS + 1])
          );
        }
      }
    }
  }

  return chart;
};
