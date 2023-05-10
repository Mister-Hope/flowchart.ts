import Raphael, {
  type RaphaelPaper,
  type RaphaelPath,
  type RaphaelSet,
} from "raphael";

import { defaultOptions } from "./config.js";
import { type ParsedDrawOptions } from "./options.js";
import Condition from "./symbols/condition";
import Parallel from "./symbols/parallel";
import FlowChartSymbol from "./symbols/symbol.js";
import { deepAssign } from "./utils.js";

class FlowChart {
  options: ParsedDrawOptions;

  symbols: FlowChartSymbol[] = [];
  lines: RaphaelPath<"SVG" | "VML">[] = [];
  start: null | FlowChartSymbol = null;

  paper: RaphaelPaper<"SVG" | "VML"> & RaphaelSet<"SVG" | "VML">;
  minXFromSymbols = 0;
  maxXFromLine = 0;

  constructor(
    container: string | HTMLElement,
    // @ts-ignore
    options: ParsedDrawOptions = {}
  ) {
    // width and height are not required
    // @ts-ignore
    this.paper = new Raphael(container, options.width, options.height);

    this.options = deepAssign(options, defaultOptions);
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
    const maxWidth = this.symbols.reduce((maxWidth, { width }) => {
      return Math.max(maxWidth, width);
    }, 0);

    const maxHeight = this.symbols.reduce((maxHeight, { height }) => {
      return Math.max(maxHeight, height);
    }, 0);

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

    let maxX = this.maxXFromLine;
    let maxY = 0,
      minX = 0,
      minY = 0;

    this.symbols.forEach((symbol) => {
      const leftX = symbol.getX();

      const x = leftX + symbol.width;
      const y = symbol.getY() + symbol.height;

      if (leftX < minX) minX = leftX;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    });

    this.lines.forEach((line) => {
      const boundingBox = line.getBBox();
      const { x, y, x2, y2 } = boundingBox;

      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x2 > maxX) maxX = x2;
      if (y2 > maxY) maxY = y2;
    });

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

export default FlowChart;
