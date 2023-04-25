import Raphael from "raphael";
import { defaultConfig } from "./config.js";
import { Condition, FlowChartSymbol, Parallel } from "./symbol/index.js";
import { deepAssign } from "./utils.js";

import type { RaphaelPaper, RaphaelSet, RaphaelPath } from "raphael";
import type { ParsedDrawOptions } from "./options";

export class FlowChart {
  options: ParsedDrawOptions;

  symbols: FlowChartSymbol[] = [];
  lines: RaphaelPath<"SVG" | "VML">[] = [];
  start: null | FlowChartSymbol = null;

  paper: RaphaelPaper<"SVG" | "VML"> & RaphaelSet<"SVG" | "VML">;
  minXFromSymbols = 0;
  maxXFromLine = 0;

  constructor(container: string | HTMLElement, options: ParsedDrawOptions) {
    // width and height are not required
    // @ts-ignore
    this.paper = new Raphael(container);

    this.options = deepAssign(options, defaultConfig);
  }

  handle(symbol: FlowChartSymbol): FlowChartSymbol {
    if (this.symbols.indexOf(symbol) <= -1) this.symbols.push(symbol);

    if (symbol instanceof Condition) {
      symbol.yes = (nextSymbol: FlowChartSymbol): FlowChartSymbol => {
        symbol.yes_symbol = nextSymbol;

        if (symbol.no_symbol) symbol.pathOk = true;

        return this.handle(nextSymbol);
      };

      symbol.no = (nextSymbol: FlowChartSymbol): FlowChartSymbol => {
        symbol.no_symbol = nextSymbol;

        if (symbol.yes_symbol) symbol.pathOk = true;

        return this.handle(nextSymbol);
      };
    } else if (symbol instanceof Parallel) {
      symbol.path1 = (nextSymbol: FlowChartSymbol): FlowChartSymbol => {
        symbol.path1_symbol = nextSymbol;
        if (symbol.path2_symbol) symbol.pathOk = true;

        return this.handle(nextSymbol);
      };
      symbol.path2 = (nextSymbol: FlowChartSymbol): FlowChartSymbol => {
        symbol.path2_symbol = nextSymbol;

        if (symbol.path3_symbol) symbol.pathOk = true;

        return this.handle(nextSymbol);
      };
      symbol.path3 = (nextSymbol: FlowChartSymbol): FlowChartSymbol => {
        symbol.path3_symbol = nextSymbol;

        if (symbol.path1_symbol) symbol.pathOk = true;

        return this.handle(nextSymbol);
      };
    } else {
      // FIXME:
      // @ts-ignore
      symbol.then = (nextSymbol: FlowChartSymbol): FlowChartSymbol => {
        symbol.next = nextSymbol;
        symbol.pathOk = true;
        return this.handle(nextSymbol);
      };
    }

    return symbol;
  }

  startWith(symbol: FlowChartSymbol): FlowChartSymbol {
    this.start = symbol;

    return this.handle(symbol);
  }

  render(): void {
    let maxWidth = 0,
      maxHeight = 0,
      maxX = 0,
      maxY = 0,
      minX = 0,
      minY = 0;
    let line;

    this.symbols.forEach((symbol) => {
      if (symbol.width > maxWidth) maxWidth = symbol.width;
      if (symbol.height > maxHeight) maxHeight = symbol.height;
    });

    this.symbols.forEach((symbol) => {
      symbol.shiftX(
        this.options.x! +
          (maxWidth - symbol.width) / 2 +
          this.options["line-width"]!
      );

      symbol.shiftY(
        this.options.y! +
          (maxHeight - symbol.height) / 2 +
          this.options["line-width"]!
      );
    });

    this.start!.render();

    this.symbols.forEach((symbol) => {
      symbol.renderLines();
    });

    maxX = this.maxXFromLine;

    let x: number;
    let y: number;

    this.symbols.forEach((symbol) => {
      const leftX = symbol.getX();

      x = leftX + symbol.width;
      y = symbol.getY() + symbol.height;

      if (leftX < minX) minX = leftX;

      if (x > maxX) maxX = x;

      if (y > maxY) maxY = y;
    });

    for (let index = 0; index < this.lines.length; index++) {
      line = this.lines[index].getBBox();
      x = line.x;
      y = line.y;

      const x2 = line.x2;
      const y2 = line.y2;

      if (x < minX) minX = x;

      if (y < minY) minY = y;

      if (x2 > maxX) maxX = x2;

      if (y2 > maxY) maxY = y2;
    }

    const scale = this.options["scale"]!;
    const lineWidth = this.options["line-width"]!;

    if (this.minXFromSymbols < minX) minX = this.minXFromSymbols;

    if (minX < 0) minX -= lineWidth;
    if (minY < 0) minY -= lineWidth;

    const width = maxX + lineWidth - minX;
    const height = maxY + lineWidth - minY;

    this.paper.setSize(width * scale, height * scale);
    this.paper.setViewBox(minX, minY, width, height, true);
  }

  clean(): void {
    if (this.paper) {
      const paperDom = this.paper.canvas;

      if (paperDom.parentNode) paperDom.parentNode.removeChild(paperDom);
    }
  }
}
