import FlowChartSymbol from "./symbol.js";
import FlowChart from "../chart.js";
import { type Direction, type SymbolOptions } from "../options.js";

class Parallel extends FlowChartSymbol {
  path1_direction: Direction;
  path1_symbol?: FlowChartSymbol;
  path1_annotation: string;
  path2_direction: Direction;
  path2_symbol?: FlowChartSymbol;
  path2_annotation: string;
  path3_direction: Direction;
  path3_symbol?: FlowChartSymbol;
  path3_annotation: string;

  top_symbol?: FlowChartSymbol;
  bottom_symbol?: FlowChartSymbol;
  left_symbol?: FlowChartSymbol;
  right_symbol?: FlowChartSymbol;

  path1?: (nextSymbol: FlowChartSymbol) => FlowChartSymbol;
  path2?: (nextSymbol: FlowChartSymbol) => FlowChartSymbol;
  path3?: (nextSymbol: FlowChartSymbol) => FlowChartSymbol;

  textMargin?: number;
  params: Record<string, string>;

  constructor(chart: FlowChart, options: Partial<SymbolOptions> = {}) {
    const symbol = chart.paper.rect(0, 0, 0, 0);

    super(chart, options, symbol);
    this.path1_annotation = options.path1_annotation || "";
    this.path2_annotation = options.path2_annotation || "";
    this.path3_annotation = options.path3_annotation || "";
    this.textMargin = this.getAttr("text-margin");
    this.path1_direction = "bottom";
    this.path2_direction = "right";
    this.path3_direction = "top";
    if (
      options.direction_next === "path1" &&
      !options[options.direction_next] &&
      options.next
    )
      options[options.direction_next] = options.next;

    if (
      options.direction_next === "path2" &&
      !options[options.direction_next] &&
      options.next
    )
      options[options.direction_next] = options.next;

    if (
      options.direction_next === "path3" &&
      !options[options.direction_next] &&
      options.next
    )
      options[options.direction_next] = options.next;

    if (
      options.path1 &&
      options.direction_path1 &&
      options.path2 &&
      !options.direction_path2 &&
      options.path3 &&
      !options.direction_path3
    ) {
      if (options.direction_path1 === "right") {
        this.path2_direction = "bottom";
        this.path1_direction = "right";
        this.path3_direction = "top";
      } else if (options.direction_path1 === "top") {
        this.path2_direction = "right";
        this.path1_direction = "top";
        this.path3_direction = "bottom";
      } else if (options.direction_path1 === "left") {
        this.path2_direction = "right";
        this.path1_direction = "left";
        this.path3_direction = "bottom";
      } else {
        this.path2_direction = "right";
        this.path1_direction = "bottom";
        this.path3_direction = "top";
      }
    } else if (
      options.path1 &&
      !options.direction_path1 &&
      options.path2 &&
      options.direction_path2 &&
      options.path3 &&
      !options.direction_path3
    ) {
      if (options.direction_path2 === "right") {
        this.path1_direction = "bottom";
        this.path2_direction = "right";
        this.path3_direction = "top";
      } else if (options.direction_path2 === "left") {
        this.path1_direction = "bottom";
        this.path2_direction = "left";
        this.path3_direction = "right";
      } else {
        this.path1_direction = "right";
        this.path2_direction = "bottom";
        this.path3_direction = "top";
      }
    } else if (
      options.path1 &&
      !options.direction_path1 &&
      options.path2 &&
      !options.direction_path2 &&
      options.path3 &&
      options.direction_path3
    ) {
      if (options.direction_path2 === "right") {
        this.path1_direction = "bottom";
        this.path2_direction = "top";
        this.path3_direction = "right";
      } else if (options.direction_path2 === "left") {
        this.path1_direction = "bottom";
        this.path2_direction = "right";
        this.path3_direction = "left";
      } else {
        this.path1_direction = "right";
        this.path2_direction = "bottom";
        this.path3_direction = "top";
      }
    } else {
      this.path1_direction = options.direction_path1!;
      this.path2_direction = options.direction_path2!;
      this.path3_direction = options.direction_path3!;
    }

    this.path1_direction = this.path1_direction || "bottom";
    this.path2_direction = this.path2_direction || "right";
    this.path3_direction = this.path3_direction || "top";

    this.initialize();
  }

  render() {
    if (this.path1_direction)
      // FIXME:
      // @ts-ignore
      this[this.path1_direction + "_symbol"] = this.path1_symbol;

    if (this.path2_direction)
      // FIXME:
      // @ts-ignore
      this[this.path2_direction + "_symbol"] = this.path2_symbol;

    if (this.path3_direction)
      // FIXME:
      // @ts-ignore
      this[this.path3_direction + "_symbol"] = this.path3_symbol;

    const lineLength = this.getAttr<number>("line-length")!;

    if (this.bottom_symbol) {
      const bottomPoint = this.getBottom();

      if (!this.bottom_symbol.isPositioned) {
        this.bottom_symbol.shiftY(this.getY() + this.height + lineLength);
        this.bottom_symbol.setX(bottomPoint.x - this.bottom_symbol.width / 2);
        this.bottom_symbol.isPositioned = true;

        this.bottom_symbol.render();
      }
    }

    if (this.top_symbol) {
      const topPoint = this.getTop();

      if (!this.top_symbol.isPositioned) {
        this.top_symbol.shiftY(
          this.getY() - this.top_symbol.height - lineLength
        );
        this.top_symbol.setX(topPoint.x + this.top_symbol.width);
        this.top_symbol.isPositioned = true;

        this.top_symbol.render();
      }
    }

    if (this.left_symbol) {
      const leftPoint = this.getLeft();

      if (!this.left_symbol.isPositioned) {
        this.left_symbol.setY(leftPoint.y - this.left_symbol.height / 2);
        this.left_symbol.shiftX(
          -(this.group.getBBox().x + this.width + lineLength)
        );
        const shift = (): void => {
          let hasSymbolUnder = false;
          let symbol: FlowChartSymbol;

          for (let index = 0; index < this.chart.symbols.length; index++) {
            symbol = this.chart.symbols[index];

            if (
              !this.params["align-next"] ||
              this.params["align-next"] !== "no"
            ) {
              const diff = Math.abs(
                symbol.getCenter().x - this.left_symbol!.getCenter().x
              );

              if (
                symbol.getCenter().y > this.left_symbol!.getCenter().y &&
                diff <= this.left_symbol!.width / 2
              ) {
                hasSymbolUnder = true;
                break;
              }
            }
          }

          if (hasSymbolUnder) {
            if (this.left_symbol!.symbolType === "end") return;
            this.left_symbol!.setX(symbol!.getX() + symbol!.width + lineLength);
            shift();
          }
        };

        shift();

        this.left_symbol.isPositioned = true;

        this.left_symbol.render();
      }
    }

    if (this.right_symbol) {
      const rightPoint = this.getRight();

      if (!this.right_symbol.isPositioned) {
        this.right_symbol.setY(rightPoint.y - this.right_symbol.height / 2);
        this.right_symbol.shiftX(
          this.group.getBBox().x + this.width + lineLength
        );
        const shift = (): void => {
          let hasSymbolUnder = false;
          let symbol: FlowChartSymbol;

          for (let index = 0; index < this.chart.symbols.length; index++) {
            symbol = this.chart.symbols[index];

            if (
              !this.params["align-next"] ||
              this.params["align-next"] !== "no"
            ) {
              const diff = Math.abs(
                symbol.getCenter().x - this.right_symbol!.getCenter().x
              );

              if (
                symbol.getCenter().y > this.right_symbol!.getCenter().y &&
                diff <= this.right_symbol!.width / 2
              ) {
                hasSymbolUnder = true;
                break;
              }
            }
          }

          if (hasSymbolUnder) {
            if (this.right_symbol!.symbolType === "end") return;
            this.right_symbol!.setX(
              symbol!.getX() + symbol!.width + lineLength
            );
            shift();
          }
        };

        shift();

        this.right_symbol.isPositioned = true;

        this.right_symbol.render();
      }
    }
  }

  renderLines(): void {
    if (this.path1_symbol)
      this.drawLineTo(
        this.path1_symbol,
        this.path1_annotation,
        this.path1_direction
      );

    if (this.path2_symbol)
      this.drawLineTo(
        this.path2_symbol,
        this.path2_annotation,
        this.path2_direction
      );

    if (this.path3_symbol)
      this.drawLineTo(
        this.path3_symbol,
        this.path3_annotation,
        this.path3_direction
      );
  }
}

export default Parallel;
