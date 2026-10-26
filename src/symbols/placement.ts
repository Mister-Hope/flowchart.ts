import type { FlowChartSymbol } from "./symbol.js";

/**
 * Moves a horizontally placed child down until it no longer overlaps another symbol.
 *
 * @param symbol Parent symbol.
 * @param child Child symbol to shift.
 * @param lineLength Minimum distance between the symbols.
 */
const shiftBeside = (symbol: FlowChartSymbol, child: FlowChartSymbol, lineLength: number): void => {
  const shift = (): void => {
    let symbolUnder: FlowChartSymbol | undefined;

    if (symbol.params["align-next"] !== "no") {
      for (const otherSymbol of symbol.chart.symbols) {
        const diff = Math.abs(otherSymbol.getCenter().x - child.getCenter().x);

        if (otherSymbol.getCenter().y > child.getCenter().y && diff <= child.width / 2) {
          symbolUnder = otherSymbol;
          break;
        }
      }
    }

    if (symbolUnder == null || child.symbolType === "end") return;

    child.setX(symbolUnder.getX() + symbolUnder.width + lineLength);
    shift();
  };

  shift();
};

/**
 * Positions the `bottom` child below a symbol.
 *
 * @param symbol Parent symbol.
 * @param lineLength Minimum distance between the symbols.
 */
export const placeBottom = (symbol: FlowChartSymbol, lineLength: number): void => {
  const bottomSymbol = symbol.bottom_symbol;

  if (bottomSymbol == null || bottomSymbol.isPositioned) return;

  const bottomPoint = symbol.getBottom();

  bottomSymbol.shiftY(symbol.getY() + symbol.height + lineLength);
  bottomSymbol.setX(bottomPoint.x - bottomSymbol.width / 2);
  bottomSymbol.isPositioned = true;

  bottomSymbol.render();
};

/**
 * Positions the `top` child above a symbol.
 *
 * @param symbol Parent symbol.
 * @param lineLength Minimum distance between the symbols.
 */
export const placeTop = (symbol: FlowChartSymbol, lineLength: number): void => {
  const topSymbol = symbol.top_symbol;

  if (topSymbol == null || topSymbol.isPositioned) return;

  const topPoint = symbol.getTop();

  topSymbol.shiftY(symbol.getY() - topSymbol.height - lineLength);
  topSymbol.setX(topPoint.x + topSymbol.width);
  topSymbol.isPositioned = true;

  topSymbol.render();
};

/**
 * Positions the `left` child next to a symbol.
 *
 * @param symbol Parent symbol.
 * @param lineLength Minimum distance between the symbols.
 */
export const placeLeft = (symbol: FlowChartSymbol, lineLength: number): void => {
  const leftSymbol = symbol.left_symbol;

  if (leftSymbol == null || leftSymbol.isPositioned) return;

  const leftPoint = symbol.getLeft();

  leftSymbol.setY(leftPoint.y - leftSymbol.height / 2);
  leftSymbol.setX(symbol.getX() - lineLength - leftSymbol.width);

  shiftBeside(symbol, leftSymbol, lineLength);

  leftSymbol.isPositioned = true;

  leftSymbol.render();
};

/**
 * Positions the `right` child next to a symbol.
 *
 * @param symbol Parent symbol.
 * @param lineLength Minimum distance between the symbols.
 */
export const placeRight = (symbol: FlowChartSymbol, lineLength: number): void => {
  const rightSymbol = symbol.right_symbol;

  if (rightSymbol == null || rightSymbol.isPositioned) return;

  const rightPoint = symbol.getRight();

  rightSymbol.setY(rightPoint.y - rightSymbol.height / 2);
  rightSymbol.shiftX(symbol.getX() + symbol.width + lineLength);

  shiftBeside(symbol, rightSymbol, lineLength);

  rightSymbol.isPositioned = true;

  rightSymbol.render();
};

/**
 * Positions the next symbol beside a symbol (used when the DSL asks for a left/right direction).
 *
 * @param symbol Source symbol.
 * @param next Symbol to position.
 * @param side Side the next symbol should be placed on.
 * @param lineLength Minimum distance between the symbols.
 */
export const placeBeside = (
  symbol: FlowChartSymbol,
  next: FlowChartSymbol,
  side: "left" | "right",
  lineLength: number,
): void => {
  const point = side === "right" ? symbol.getRight() : symbol.getLeft();

  next.setY(point.y - next.height / 2);

  if (side === "right") next.shiftX(symbol.getX() + symbol.width + lineLength);
  else next.shiftX(-(symbol.getX() + symbol.width + lineLength));
  next.isPositioned = true;
};
