import {
  type RaphaelElement,
  type RaphaelPath,
  type RaphaelSet,
} from "raphael";

import { checkLineIntersection, drawLine } from "../action.js";
import type FlowChart from "../chart.js";
import {
  type Direction,
  type SymbolOptions,
  type SymbolType,
} from "../options.js";
import { type Position } from "../typings.js";

class FlowChartSymbol {
  chart: FlowChart;
  text: RaphaelElement<"SVG" | "VML", Element | SVGTextElement>;
  params: Record<string, string>;

  connectedTo: FlowChartSymbol[] = [];
  leftLines: RaphaelPath<"SVG" | "VML">[] = [];
  rightLines: RaphaelPath<"SVG" | "VML">[] = [];
  topLines: RaphaelPath<"SVG" | "VML">[] = [];
  bottomLines: RaphaelPath<"SVG" | "VML">[] = [];

  group: RaphaelSet<"SVG" | "VML">;

  symbol?: RaphaelElement<"SVG" | "VML", Element | SVGRectElement>;

  symbolType?: SymbolType;

  flowstate: string;
  key: string;
  lineStyle: Record<string, any>;

  bottomStart?: boolean;
  next?: FlowChartSymbol;
  next_direction: Direction | undefined;
  isPositioned?: boolean;
  width = 0;
  height = 0;
  topStart?: boolean;
  topEnd?: boolean;
  rightStart?: boolean;
  leftStart?: boolean;
  leftEnd?: boolean;
  rightEnd?: boolean;
  pathOk?: boolean;
  constructor(
    chart: FlowChart,
    options: Partial<SymbolOptions>,
    symbol?: RaphaelElement<"SVG" | "VML", Element | SVGRectElement>,
  ) {
    this.chart = chart;
    this.group = this.chart.paper.set();
    this.symbol = symbol;
    this.symbolType = options.symbolType;
    this.flowstate = options.flowstate || "future";
    this.lineStyle = options.lineStyle || {};
    this.key = options.key || "";
    this.params = options.params || {};

    this.next_direction =
      options.next && options["direction_next"]
        ? options["direction_next"]
        : undefined;

    this.text = this.chart.paper.text(0, 0, options.text || "");
    // Raphael does not support the svg group tag so setting the text node id to the symbol node id plus t
    if (options.key) this.text.node.id = `${options.key}t`;

    this.text.node.setAttribute("class", `${this.getAttr<string>("class")}t`);

    this.text.attr({
      "text-anchor": "start",
      x: this.getAttr<number>("text-margin"),
      fill: this.getAttr<string>("font-color"),
      "font-size": this.getAttr<number>("font-size"),
    });

    const font = this.getAttr("font") as string;
    const fontFamily = this.getAttr<string>("font-family");
    const fontWeight = this.getAttr<string>("font-weight");

    if (font) this.text.attr({ font: font });
    if (fontFamily) this.text.attr({ "font-family": fontFamily });
    if (fontWeight) this.text.attr({ "font-weight": fontWeight });

    if (options.link) this.text.attr("href", options.link);
    if (options.target) this.text.attr("target", options.target);

    // Add click function with event and options params
    if (options.function) {
      this.text.attr({ cursor: "pointer" });

      this.text.node.addEventListener(
        "click",
        (event) => {
          (window as Window & Record<string, any>)[options.function as string](
            event,
            options,
          );
        },
        false,
      );
    }

    const maxWidth = this.getAttr<number>("maxWidth");

    if (maxWidth) {
      // using this approach: http://stackoverflow.com/a/3153457/22466
      const words = options.text!.split(" ");
      let tempText = "";

      words.forEach((word) => {
        this.text.attr("text", `${tempText} ${word}`);

        if (this.text.getBBox().width > maxWidth) tempText += `\n${word}`;
        else tempText += ` ${word}`;
      });

      this.text.attr("text", tempText.substring(1));
    }

    this.group.push(this.text);

    if (symbol) {
      symbol.node.setAttribute("class", this.getAttr<string>("class")!);

      const tempMargin = this.getAttr<number>("text-margin")!;

      symbol.attr({
        fill: this.getAttr<string>("fill"),
        stroke: this.getAttr<string>("element-color"),
        "stroke-width": this.getAttr<number>("line-width"),
        width: this.text.getBBox().width + 2 * tempMargin,
        height: this.text.getBBox().height + 2 * tempMargin,
      });

      const roundness = this.getAttr<number>("roundness")!;

      if (!isNaN(roundness)) {
        symbol.node.setAttribute("ry", roundness.toString());
        symbol.node.setAttribute("rx", roundness.toString());
      }

      if (options.link) symbol.attr("href", options.link);
      if (options.target) symbol.attr("target", options.target);

      // Add click function with event and options params
      if (options.function) {
        symbol.node.addEventListener(
          "click",
          (event) => {
            (window as Window & Record<string, any>)[
              options.function as string
            ](event, options);
          },
          false,
        );
        symbol.attr({ cursor: "pointer" });
      }

      if (options.key) symbol.node.id = options.key;

      this.group.push(symbol);
      symbol.insertBefore(this.text);

      this.text.attr({
        y: symbol.getBBox().height / 2,
      });

      this.initialize();
    }
  }

  /* Gets the attribute based on FlowState, Symbol Name and default, first found wins */
  getAttr<T>(attName: string): T | undefined {
    if (!this.chart) return undefined;

    const rootOption = this.chart.options
      ? this.chart.options[attName]
      : undefined;
    const symbolOption = this.chart.options.symbols
      ? this.chart.options.symbols[this.symbolType!][attName]
      : undefined;

    if (
      this.chart.options.flowstate &&
      // @ts-ignore
      this.chart.options.flowstate[this.flowstate]
    ) {
      const flowStateOption: T | undefined =
        // @ts-ignore
        this.chart.options.flowstate[this.flowstate][attName];

      if (flowStateOption) return flowStateOption;
    }

    return symbolOption || rootOption;
  }

  initialize(): void {
    this.group.transform(
      `t${this.getAttr<number>("line-width")!},${this.getAttr<number>(
        "line-width",
      )!}`,
    );

    const boundingBox = this.group.getBBox();

    this.width = boundingBox.width;
    this.height = boundingBox.height;
  }

  getCenter(): Position {
    return {
      x: this.getX() + this.width / 2,
      y: this.getY() + this.height / 2,
    };
  }

  getX(): number {
    return this.group.getBBox().x;
  }

  getY(): number {
    return this.group.getBBox().y;
  }

  shiftX(x: number): void {
    this.group.transform(`t${this.getX() + x},${this.getY()}`);
  }

  setX(x: number): void {
    this.group.transform(`t${x},${this.getY()}`);
  }

  shiftY(y: number): void {
    this.group.transform(`$t${this.getX()},${this.getY() + y}`);
  }

  setY(y: number): void {
    this.group.transform(`t${this.getX()},${y}`);
  }

  getTop(): Position {
    return { x: this.getX() + this.width / 2, y: this.getY() };
  }

  getBottom(): Position {
    return { x: this.getX() + this.width / 2, y: this.getY() + this.height };
  }

  getLeft(): Position {
    return { x: this.getX(), y: this.getY() + this.group.getBBox().height / 2 };
  }

  getRight(): Position {
    return {
      x: this.getX() + this.group.getBBox().width,
      y: this.getY() + this.group.getBBox().height / 2,
    };
  }

  render(): void {
    if (this.next) {
      const lineLength = this.getAttr<number>("line-length")!;

      if (this.next_direction === "right") {
        const rightPoint = this.getRight();

        if (!this.next.isPositioned) {
          this.next.setY(rightPoint.y - this.next.height / 2);
          this.next.shiftX(this.group.getBBox().x + this.width + lineLength);

          const shift = (): void => {
            let hasSymbolUnder = false;
            let symbol: FlowChartSymbol;

            for (let index = 0; index < this.chart.symbols.length; index++) {
              symbol = this.chart.symbols[index];

              const diff = Math.abs(
                symbol.getCenter().x - this.next!.getCenter().x,
              );

              if (
                symbol.getCenter().y > this.next!.getCenter().y &&
                diff <= this.next!.width / 2
              ) {
                hasSymbolUnder = true;
                break;
              }
            }

            if (hasSymbolUnder) {
              if (this.next!.symbolType === "end") return;

              this.next!.setX(symbol!.getX() + symbol!.width + lineLength);
              shift();
            }
          };

          shift();

          this.next.isPositioned = true;

          this.next.render();
        }
      } else if (this.next_direction === "left") {
        const leftPoint = this.getLeft();

        if (!this.next.isPositioned) {
          this.next.setY(leftPoint.y - this.next.height / 2);
          this.next.shiftX(-(this.group.getBBox().x + this.width + lineLength));

          const shift = (): void => {
            let hasSymbolUnder = false;
            let symbol: FlowChartSymbol;

            for (let index = 0; index < this.chart.symbols.length; index++) {
              symbol = this.chart.symbols[index];

              const diff = Math.abs(
                symbol.getCenter().x - this.next!.getCenter().x,
              );

              if (
                symbol.getCenter().y > this.next!.getCenter().y &&
                diff <= this.next!.width / 2
              ) {
                hasSymbolUnder = true;
                break;
              }
            }

            if (hasSymbolUnder) {
              if (this.next!.symbolType === "end") return;
              this.next!.setX(symbol!.getX() + symbol!.width + lineLength);
              shift();
            }
          };

          shift();

          this.next.isPositioned = true;

          this.next.render();
        }
      } else {
        const bottomPoint = this.getBottom();

        if (!this.next.isPositioned) {
          this.next.shiftY(this.getY() + this.height + lineLength);
          this.next.setX(bottomPoint.x - this.next.width / 2);
          this.next.isPositioned = true;

          this.next.render();
        }
      }
    }
  }

  renderLines(): void {
    if (this.next)
      if (this.next_direction)
        this.drawLineTo(
          this.next,
          this.getAttr("arrow-text") || "",
          this.next_direction,
        );
      else this.drawLineTo(this.next, this.getAttr<string>("arrow-text") || "");
  }

  drawLineTo(
    symbol: FlowChartSymbol,
    text: string,
    direction?: Direction,
  ): void {
    if (this.connectedTo.indexOf(symbol) < 0) this.connectedTo.push(symbol);

    const { x, y } = this.getCenter();
    const right = this.getRight(),
      bottom = this.getBottom(),
      top = this.getTop(),
      left = this.getLeft();

    const { x: symbolX, y: symbolY } = symbol.getCenter();
    const symbolTop = symbol.getTop(),
      symbolRight = symbol.getRight(),
      symbolLeft = symbol.getLeft();

    const isOnSameColumn = x === symbolX,
      isOnSameLine = y === symbolY,
      isUnder = y < symbolY,
      isUpper = y > symbolY || this === symbol,
      isLeft = x > symbolX,
      isRight = x < symbolX;

    let maxX = 0,
      line;
    const lineLength = this.getAttr<number>("line-length")!;
    const lineWith = this.getAttr<number>("line-width")!;

    if ((!direction || direction === "bottom") && isOnSameColumn && isUnder) {
      if (symbol.topLines.length === 0 && this.bottomLines.length === 0) {
        line = drawLine(this.chart, bottom, [symbolTop], text);
      } else {
        const yOffset =
          Math.max(symbol.topLines.length, this.bottomLines.length) * 10;

        line = drawLine(
          this.chart,
          bottom,
          [
            { x: symbolTop.x, y: symbolTop.y - yOffset },
            { x: symbolTop.x, y: symbolTop.y },
          ],
          text,
        );
      }
      this.bottomLines.push(line);
      symbol.topLines.push(line);
      this.bottomStart = true;
      symbol.topEnd = true;
      maxX = bottom.x;
    } else if (
      (!direction || direction === "right") &&
      isOnSameLine &&
      isRight
    ) {
      if (symbol.leftLines.length === 0 && this.rightLines.length === 0) {
        line = drawLine(this.chart, right, [symbolLeft], text);
      } else {
        const yOffset =
          Math.max(symbol.leftLines.length, this.rightLines.length) * 10;

        line = drawLine(
          this.chart,
          right,
          [
            { x: right.x, y: right.y - yOffset },
            { x: right.x, y: symbolLeft.y - yOffset },
            { x: symbolLeft.x, y: symbolLeft.y - yOffset },
            { x: symbolLeft.x, y: symbolLeft.y },
          ],
          text,
        );
      }
      this.rightLines.push(line);
      symbol.leftLines.push(line);
      this.rightStart = true;
      symbol.leftEnd = true;
      maxX = symbolLeft.x;
    } else if ((!direction || direction === "left") && isOnSameLine && isLeft) {
      if (symbol.rightLines.length === 0 && this.leftLines.length === 0) {
        line = drawLine(this.chart, left, [symbolRight], text);
      } else {
        const yOffset =
          Math.max(symbol.rightLines.length, this.leftLines.length) * 10;

        line = drawLine(
          this.chart,
          right,
          [
            { x: right.x, y: right.y - yOffset },
            { x: right.x, y: symbolRight.y - yOffset },
            { x: symbolRight.x, y: symbolRight.y - yOffset },
            { x: symbolRight.x, y: symbolRight.y },
          ],
          text,
        );
      }
      this.leftLines.push(line);
      symbol.rightLines.push(line);
      this.leftStart = true;
      symbol.rightEnd = true;
      maxX = symbolRight.x;
    } else if (
      (!direction || direction === "right") &&
      isOnSameColumn &&
      isUpper
    ) {
      const yOffset =
        Math.max(symbol.topLines.length, this.rightLines.length) * 10;

      line = drawLine(
        this.chart,
        right,
        [
          { x: right.x + lineLength / 2, y: right.y - yOffset },
          {
            x: right.x + lineLength / 2,
            y: symbolTop.y - lineLength / 2 - yOffset,
          },
          { x: symbolTop.x, y: symbolTop.y - lineLength / 2 - yOffset },
          { x: symbolTop.x, y: symbolTop.y },
        ],
        text,
      );
      this.rightLines.push(line);
      symbol.topLines.push(line);
      this.rightStart = true;
      symbol.topEnd = true;
      maxX = right.x + lineLength / 2;
    } else if (
      (!direction || direction === "right") &&
      isOnSameColumn &&
      isUnder
    ) {
      const yOffset =
        Math.max(symbol.topLines.length, this.rightLines.length) * 10;

      line = drawLine(
        this.chart,
        right,
        [
          { x: right.x + lineLength / 2, y: right.y - yOffset },
          {
            x: right.x + lineLength / 2,
            y: symbolTop.y - lineLength / 2 - yOffset,
          },
          { x: symbolTop.x, y: symbolTop.y - lineLength / 2 - yOffset },
          { x: symbolTop.x, y: symbolTop.y },
        ],
        text,
      );
      this.rightLines.push(line);
      symbol.topLines.push(line);
      this.rightStart = true;
      symbol.topEnd = true;
      maxX = right.x + lineLength / 2;
    } else if ((!direction || direction === "bottom") && isLeft) {
      const yOffset =
        Math.max(symbol.topLines.length, this.bottomLines.length) * 10;

      if (this.leftEnd && isUpper)
        line = drawLine(
          this.chart,
          bottom,
          [
            { x: bottom.x, y: bottom.y + lineLength / 2 - yOffset },
            {
              x: bottom.x + (bottom.x - symbolTop.x) / 2,
              y: bottom.y + lineLength / 2 - yOffset,
            },
            {
              x: bottom.x + (bottom.x - symbolTop.x) / 2,
              y: symbolTop.y - lineLength / 2 - yOffset,
            },
            { x: symbolTop.x, y: symbolTop.y - lineLength / 2 - yOffset },
            { x: symbolTop.x, y: symbolTop.y },
          ],
          text,
        );
      else
        line = drawLine(
          this.chart,
          bottom,
          [
            { x: bottom.x, y: symbolTop.y - lineLength / 2 - yOffset },
            { x: symbolTop.x, y: symbolTop.y - lineLength / 2 - yOffset },
            { x: symbolTop.x, y: symbolTop.y },
          ],
          text,
        );

      this.bottomLines.push(line);
      symbol.topLines.push(line);
      this.bottomStart = true;
      symbol.topEnd = true;
      maxX = bottom.x + (bottom.x - symbolTop.x) / 2;
    } else if ((!direction || direction === "bottom") && isRight && isUnder) {
      const yOffset =
        Math.max(symbol.topLines.length, this.bottomLines.length) * 10;

      line = drawLine(
        this.chart,
        bottom,
        [
          { x: bottom.x, y: symbolTop.y - lineLength / 2 - yOffset },
          { x: symbolTop.x, y: symbolTop.y - lineLength / 2 - yOffset },
          { x: symbolTop.x, y: symbolTop.y },
        ],
        text,
      );
      this.bottomLines.push(line);
      symbol.topLines.push(line);
      this.bottomStart = true;
      symbol.topEnd = true;
      maxX = bottom.x;
      if (symbolTop.x > maxX) maxX = symbolTop.x;
    } else if ((!direction || direction === "bottom") && isRight) {
      const yOffset =
        Math.max(symbol.topLines.length, this.bottomLines.length) * 10;

      line = drawLine(
        this.chart,
        bottom,
        [
          { x: bottom.x, y: bottom.y + lineLength / 2 - yOffset },
          {
            x: bottom.x + (bottom.x - symbolTop.x) / 2,
            y: bottom.y + lineLength / 2 - yOffset,
          },
          {
            x: bottom.x + (bottom.x - symbolTop.x) / 2,
            y: symbolTop.y - lineLength / 2 - yOffset,
          },
          { x: symbolTop.x, y: symbolTop.y - lineLength / 2 - yOffset },
          { x: symbolTop.x, y: symbolTop.y },
        ],
        text,
      );
      this.bottomLines.push(line);
      symbol.topLines.push(line);
      this.bottomStart = true;
      symbol.topEnd = true;
      maxX = bottom.x + (bottom.x - symbolTop.x) / 2;
    } else if (direction && direction === "right" && isLeft) {
      const yOffset =
        Math.max(symbol.topLines.length, this.rightLines.length) * 10;

      line = drawLine(
        this.chart,
        right,
        [
          { x: right.x + lineLength / 2, y: right.y },
          {
            x: right.x + lineLength / 2,
            y: symbolTop.y - lineLength / 2 - yOffset,
          },
          { x: symbolTop.x, y: symbolTop.y - lineLength / 2 - yOffset },
          { x: symbolTop.x, y: symbolTop.y },
        ],
        text,
      );
      this.rightLines.push(line);
      symbol.topLines.push(line);
      this.rightStart = true;
      symbol.topEnd = true;
      maxX = right.x + lineLength / 2;
    } else if (direction && direction === "right" && isRight) {
      const yOffset =
        Math.max(symbol.topLines.length, this.rightLines.length) * 10;

      line = drawLine(
        this.chart,
        right,
        [
          { x: symbolTop.x, y: right.y - yOffset },
          { x: symbolTop.x, y: symbolTop.y - yOffset },
        ],
        text,
      );
      this.rightLines.push(line);
      symbol.topLines.push(line);
      this.rightStart = true;
      symbol.topEnd = true;
      maxX = right.x + lineLength / 2;
    } else if (
      direction &&
      direction === "bottom" &&
      isOnSameColumn &&
      isUpper
    ) {
      const yOffset =
        Math.max(symbol.topLines.length, this.bottomLines.length) * 10;

      line = drawLine(
        this.chart,
        bottom,
        [
          { x: bottom.x, y: bottom.y + lineLength / 2 - yOffset },
          {
            x: right.x + lineLength / 2,
            y: bottom.y + lineLength / 2 - yOffset,
          },
          {
            x: right.x + lineLength / 2,
            y: symbolTop.y - lineLength / 2 - yOffset,
          },
          { x: symbolTop.x, y: symbolTop.y - lineLength / 2 - yOffset },
          { x: symbolTop.x, y: symbolTop.y },
        ],
        text,
      );
      this.bottomLines.push(line);
      symbol.topLines.push(line);
      this.bottomStart = true;
      symbol.topEnd = true;
      maxX = bottom.x + lineLength / 2;
    } else if (direction === "left" && isOnSameColumn && isUpper) {
      let diffX = left.x - lineLength / 2;

      if (symbolLeft.x < left.x) diffX = symbolLeft.x - lineLength / 2;

      const yOffset =
        Math.max(symbol.topLines.length, this.leftLines.length) * 10;

      line = drawLine(
        this.chart,
        left,
        [
          { x: diffX, y: left.y - yOffset },
          { x: diffX, y: symbolTop.y - lineLength / 2 - yOffset },
          { x: symbolTop.x, y: symbolTop.y - lineLength / 2 - yOffset },
          { x: symbolTop.x, y: symbolTop.y },
        ],
        text,
      );
      this.leftLines.push(line);
      symbol.topLines.push(line);
      this.leftStart = true;
      symbol.topEnd = true;
      maxX = left.x;
    } else if (direction === "left") {
      const yOffset =
        Math.max(symbol.topLines.length, this.leftLines.length) * 10;

      line = drawLine(
        this.chart,
        left,
        [
          { x: symbolTop.x + (left.x - symbolTop.x) / 2, y: left.y },
          {
            x: symbolTop.x + (left.x - symbolTop.x) / 2,
            y: symbolTop.y - lineLength / 2 - yOffset,
          },
          { x: symbolTop.x, y: symbolTop.y - lineLength / 2 - yOffset },
          { x: symbolTop.x, y: symbolTop.y },
        ],
        text,
      );
      this.leftLines.push(line);
      symbol.topLines.push(line);
      this.leftStart = true;
      symbol.topEnd = true;
      maxX = left.x;
    } else if (direction === "top") {
      const yOffset =
        Math.max(symbol.topLines.length, this.topLines.length) * 10;

      line = drawLine(
        this.chart,
        top,
        [
          { x: top.x, y: symbolTop.y - lineLength / 2 - yOffset },
          { x: symbolTop.x, y: symbolTop.y - lineLength / 2 - yOffset },
          { x: symbolTop.x, y: symbolTop.y },
        ],
        text,
      );
      this.topLines.push(line);
      symbol.topLines.push(line);
      this.topStart = true;
      symbol.topEnd = true;
      maxX = top.x;
    }

    // update line style
    if (this.lineStyle[symbol.key] && line)
      line.attr(this.lineStyle[symbol.key]);

    if (line) {
      for (let l = 0, llen = this.chart.lines.length; l < llen; l++) {
        const otherLine = this.chart.lines[l];

        const ePath = otherLine.attr("path") as unknown as [
            string,
            ...number[],
          ][],
          lPath = line.attr("path") as unknown as [string, ...number[]][];

        for (let iP = 0, lenP = ePath.length - 1; iP < lenP; iP++) {
          const newPath: [string, ...number[]][] = [];

          newPath.push(["M", ePath[iP][1], ePath[iP][2]]);
          newPath.push(["L", ePath[iP + 1][1], ePath[iP + 1][2]]);

          const line1FromX = newPath[0][1];
          const line1FromY = newPath[0][2];
          const line1ToX = newPath[1][1];
          const line1ToY = newPath[1][2];

          for (let lP = 0, lenlP = lPath.length - 1; lP < lenlP; lP++) {
            const newLinePath: [string, ...number[]][] = [];

            newLinePath.push(["M", lPath[lP][1], lPath[lP][2]]);
            newLinePath.push(["L", lPath[lP + 1][1], lPath[lP + 1][2]]);

            const line2FromX = newLinePath[0][1];
            const line2FromY = newLinePath[0][2];
            const line2ToX = newLinePath[1][1];
            const line2ToY = newLinePath[1][2];

            const res = checkLineIntersection(
              line1FromX,
              line1FromY,
              line1ToX,
              line1ToY,
              line2FromX,
              line2FromY,
              line2ToX,
              line2ToY,
            );

            if (res.onLine1 && res.onLine2) {
              let newSegment: [string, ...number[]];

              if (line2FromY === line2ToY) {
                if (line2FromX > line2ToX) {
                  newSegment = ["L", res.x! + lineWith * 2, line2FromY];
                  lPath.splice(lP + 1, 0, newSegment);
                  newSegment = [
                    "C",
                    res.x! + lineWith * 2,
                    line2FromY,
                    res.x!,
                    line2FromY - lineWith * 4,
                    res.x! - lineWith * 2,
                    line2FromY,
                  ];
                  lPath.splice(lP + 2, 0, newSegment);
                  line.attr("path", lPath as unknown as string);
                } else {
                  newSegment = ["L", res.x! - lineWith * 2, line2FromY];
                  lPath.splice(lP + 1, 0, newSegment);
                  newSegment = [
                    "C",
                    res.x! - lineWith * 2,
                    line2FromY,
                    res.x!,
                    line2FromY - lineWith * 4,
                    res.x! + lineWith * 2,
                    line2FromY,
                  ];
                  lPath.splice(lP + 2, 0, newSegment);
                  line.attr("path", lPath as unknown as string);
                }
              } else if (line2FromY > line2ToY) {
                newSegment = ["L", line2FromX, res.y! + lineWith * 2];
                lPath.splice(lP + 1, 0, newSegment);
                newSegment = [
                  "C",
                  line2FromX,
                  res.y! + lineWith * 2,
                  line2FromX + lineWith * 4,
                  res.y!,
                  line2FromX,
                  res.y! - lineWith * 2,
                ];
                lPath.splice(lP + 2, 0, newSegment);
                line.attr("path", lPath as unknown as string);
              } else {
                newSegment = ["L", line2FromX, res.y! - lineWith * 2];
                lPath.splice(lP + 1, 0, newSegment);
                newSegment = [
                  "C",
                  line2FromX,
                  res.y! - lineWith * 2,
                  line2FromX + lineWith * 4,
                  res.y!,
                  line2FromX,
                  res.y! + lineWith * 2,
                ];
                lPath.splice(lP + 2, 0, newSegment);
                line.attr("path", lPath as unknown as string);
              }

              lP += 2;
            }
          }
        }
      }

      this.chart.lines.push(line);
      if (
        this.chart.minXFromSymbols === undefined ||
        this.chart.minXFromSymbols > left.x
      )
        this.chart.minXFromSymbols = left.x;
    }

    if (
      !this.chart.maxXFromLine ||
      (this.chart.maxXFromLine && maxX > this.chart.maxXFromLine)
    )
      this.chart.maxXFromLine = maxX;
  }
}

export default FlowChartSymbol;
