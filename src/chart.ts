import { defaultOptions } from "./config.js";
import type { DrawOptions, ParsedDrawOptions } from "./options.js";
import { Paper } from "./render/index.js";
import type { PathElement } from "./render/index.js";
import type { FlowChartSymbol } from "./symbols/index.js";
import { Condition, Parallel } from "./symbols/index.js";
import { deepAssign } from "./utils.js";

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

class FlowChart {
  options: ParsedDrawOptions;

  symbols: FlowChartSymbol[] = [];

  lines: PathElement[] = [];

  start: null | FlowChartSymbol = null;

  paper: Paper;

  minXFromSymbols = 0;

  // Unlike `0`, `-Infinity` lets the first connection set the bound even when it is negative
  // (a chart drawn left of the origin would otherwise clamp the right edge to `x = 0`).
  maxXFromLine = Number.NEGATIVE_INFINITY;

  constructor(container: string | HTMLElement, options: DrawOptions = {}) {
    this.paper = new Paper(container, options.width, options.height);
    this.options = deepAssign<ParsedDrawOptions>(defaultOptions, options);
  }

  startWith(symbol: FlowChartSymbol): FlowChartSymbol {
    this.start = symbol;

    return this.handle(symbol);
  }

  /**
   * Registers a symbol and binds the handler that links it to the next symbol(s).
   *
   * @param symbol Symbol to register.
   * @returns The registered symbol.
   */
  handle(symbol: FlowChartSymbol): FlowChartSymbol {
    if (!this.symbols.includes(symbol)) this.symbols.push(symbol);

    if (symbol instanceof Condition) {
      this.bindConditionHandlers(symbol);
    } else if (symbol instanceof Parallel) {
      this.bindParallelHandlers(symbol);
    } else {
      symbol.thenHandler = (nextSymbol: FlowChartSymbol): FlowChartSymbol => {
        symbol.next = nextSymbol;
        symbol.pathOk = true;

        return this.handle(nextSymbol);
      };
    }

    return symbol;
  }

  render(): void {
    if (this.start == null) return;

    try {
      this.positionSymbols();
      this.start.render();
      this.renderLines();
      this.updateCanvasSize();
    } finally {
      // Move the SVG from the offscreen measurement host into a detached container, if any.
      this.paper.attach();
    }
  }

  clean(): void {
    this.paper.canvas.remove();
  }

  private bindConditionHandlers(symbol: Condition): void {
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
  }

  private bindParallelHandlers(symbol: Parallel): void {
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
  }

  /** Aligns every symbol relative to the widest/tallest node and the configured x/y offsets. */
  private positionSymbols(): void {
    const maxWidth = this.symbols.reduce((max, { width }) => Math.max(max, width), 0);
    const maxHeight = this.symbols.reduce((max, { height }) => Math.max(max, height), 0);
    const { x, y } = this.options;
    const lineWidth = this.options["line-width"];

    for (const symbol of this.symbols) {
      symbol.shiftX(x + (maxWidth - symbol.width) / 2 + lineWidth);
      symbol.shiftY(y + (maxHeight - symbol.height) / 2 + lineWidth);
    }
  }

  private renderLines(): void {
    for (const symbol of this.symbols) symbol.renderLines();
  }

  /** Expands the SVG size/viewBox so every symbol and connection line is visible. */
  private updateCanvasSize(): void {
    const { minX, minY, maxX, maxY } = this.measureBounds();
    const { scale } = this.options;
    const lineWidth = this.options["line-width"];
    const width = maxX + lineWidth - minX;
    const height = maxY + lineWidth - minY;

    this.paper.setSize(width * scale, height * scale);
    this.paper.setViewBox({ x: minX, y: minY, width, height }, true);
  }

  private measureBounds(): Bounds {
    let maxX = this.maxXFromLine;
    let maxY = 0;
    let minX = 0;
    let minY = 0;

    for (const symbol of this.symbols) {
      const leftX = symbol.getX();
      const x = leftX + symbol.width;
      const y = symbol.getY() + symbol.height;

      if (leftX < minX) minX = leftX;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }

    for (const line of this.lines) {
      const { x, y, width, height } = line.getBBox();
      const x2 = x + width;
      const y2 = y + height;

      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x2 > maxX) maxX = x2;
      if (y2 > maxY) maxY = y2;
    }

    if (this.minXFromSymbols < minX) minX = this.minXFromSymbols;

    // Keep one line width of padding when symbols/lines extend past the origin.
    if (minX < 0) minX -= this.options["line-width"];
    if (minY < 0) minY -= this.options["line-width"];

    return { minX, minY, maxX, maxY };
  }
}

export default FlowChart;
