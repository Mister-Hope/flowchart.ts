import { defaultOptions } from "./config.js";
import type { DrawOptions, ParsedDrawOptions } from "./options.js";
import { Paper } from "./render/index.js";
import type { PathElement } from "./render/index.js";
import Condition from "./symbols/condition.js";
import Parallel from "./symbols/parallel.js";
import type FlowChartSymbol from "./symbols/symbol.js";
import { deepAssign } from "./utils.js";

class FlowChart {
  options: ParsedDrawOptions;

  symbols: FlowChartSymbol[] = [];

  lines: PathElement[] = [];

  start: null | FlowChartSymbol = null;

  paper: Paper;

  minXFromSymbols = 0;

  maxXFromLine = 0;

  constructor(container: string | HTMLElement, options: DrawOptions = {}) {
    this.paper = new Paper(container, options.width, options.height);
    this.options = deepAssign<ParsedDrawOptions>(defaultOptions, options);
  }

  handle(symbol: FlowChartSymbol): FlowChartSymbol {
    if (!this.symbols.includes(symbol)) this.symbols.push(symbol);

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
      symbol.thenHandler = (nextSymbol: FlowChartSymbol): FlowChartSymbol => {
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
    if (this.start == null) return;

    const maxWidth = this.symbols.reduce((max, { width }) => Math.max(max, width), 0);

    const maxHeight = this.symbols.reduce((max, { height }) => Math.max(max, height), 0);

    this.symbols.forEach((symbol) => {
      symbol.shiftX(this.options.x + (maxWidth - symbol.width) / 2 + this.options["line-width"]);

      symbol.shiftY(this.options.y + (maxHeight - symbol.height) / 2 + this.options["line-width"]);
    });

    this.start.render();

    this.symbols.forEach((symbol) => {
      symbol.renderLines();
    });

    let maxX = this.maxXFromLine;
    let maxY = 0;
    let minX = 0;
    let minY = 0;

    this.symbols.forEach((symbol) => {
      const leftX = symbol.getX();

      const x = leftX + symbol.width;
      const y = symbol.getY() + symbol.height;

      if (leftX < minX) minX = leftX;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    });

    this.lines.forEach((line) => {
      const { x, y, width, height } = line.getBBox();
      const x2 = x + width;
      const y2 = y + height;

      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x2 > maxX) maxX = x2;
      if (y2 > maxY) maxY = y2;
    });

    const { scale } = this.options;
    const lineWidth = this.options["line-width"];

    if (this.minXFromSymbols < minX) minX = this.minXFromSymbols;

    if (minX < 0) minX -= lineWidth;
    if (minY < 0) minY -= lineWidth;

    const width = maxX + lineWidth - minX;
    const height = maxY + lineWidth - minY;

    this.paper.setSize(width * scale, height * scale);
    this.paper.setViewBox({ x: minX, y: minY, width, height }, true);
  }

  clean(): void {
    this.paper.canvas.remove();
  }
}

export default FlowChart;
