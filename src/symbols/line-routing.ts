import { drawLine } from "../action.js";
import type { Direction } from "../options.js";
import type { PathElement } from "../render/index.js";
import type { Position } from "../typings.js";
import type { FlowChartSymbol } from "./symbol.js";

interface Geometry {
  center: Position;
  top: Position;
  right: Position;
  bottom: Position;
  left: Position;
}

interface RouteContext {
  from: FlowChartSymbol;
  to: FlowChartSymbol;
  text: string;
  lineLength: number;
  direction?: Direction;
  fromGeometry: Geometry;
  toGeometry: Geometry;
}

/** A drawn connection line plus the right-most x coordinate it occupies. */
export interface RoutedConnection {
  line: PathElement;
  maxX: number;
}

const geometryOf = (symbol: FlowChartSymbol): Geometry => ({
  center: symbol.getCenter(),
  top: symbol.getTop(),
  right: symbol.getRight(),
  bottom: symbol.getBottom(),
  left: symbol.getLeft(),
});

const isDirection = (context: RouteContext, direction: Direction): boolean =>
  context.direction == null || context.direction === direction;

const isOnSameColumn = (context: RouteContext): boolean =>
  context.fromGeometry.center.x === context.toGeometry.center.x;

const isOnSameLine = (context: RouteContext): boolean =>
  context.fromGeometry.center.y === context.toGeometry.center.y;

const isUnder = (context: RouteContext): boolean =>
  context.fromGeometry.center.y < context.toGeometry.center.y;

const isUpper = (context: RouteContext): boolean =>
  context.fromGeometry.center.y > context.toGeometry.center.y || context.from === context.to;

const isLeft = (context: RouteContext): boolean =>
  context.fromGeometry.center.x > context.toGeometry.center.x;

const isRight = (context: RouteContext): boolean =>
  context.fromGeometry.center.x < context.toGeometry.center.x;

// Extra distance applied when several connections leave the same side.
const lineOffset = (fromLines: PathElement[], toLines: PathElement[]): number =>
  Math.max(fromLines.length, toLines.length) * 10;

const routeStraightDown = (context: RouteContext): RoutedConnection => {
  const { from, to, text, fromGeometry, toGeometry } = context;

  if (to.topLines.length === 0 && from.bottomLines.length === 0) {
    const line = drawLine(from.chart, fromGeometry.bottom, [toGeometry.top], text);

    from.bottomLines.push(line);
    to.topLines.push(line);

    return { line, maxX: fromGeometry.bottom.x };
  }

  const yOffset = lineOffset(to.topLines, from.bottomLines);
  const line = drawLine(
    from.chart,
    fromGeometry.bottom,
    [
      { x: toGeometry.top.x, y: toGeometry.top.y - yOffset },
      { x: toGeometry.top.x, y: toGeometry.top.y },
    ],
    text,
  );

  from.bottomLines.push(line);
  to.topLines.push(line);

  return { line, maxX: fromGeometry.bottom.x };
};

const routeStraightRight = (context: RouteContext): RoutedConnection => {
  const { from, to, text, fromGeometry, toGeometry } = context;

  if (to.leftLines.length === 0 && from.rightLines.length === 0) {
    const line = drawLine(from.chart, fromGeometry.right, [toGeometry.left], text);

    from.rightLines.push(line);
    to.leftLines.push(line);
    to.leftEnd = true;

    return { line, maxX: toGeometry.left.x };
  }

  const yOffset = lineOffset(to.leftLines, from.rightLines);
  const line = drawLine(
    from.chart,
    fromGeometry.right,
    [
      { x: fromGeometry.right.x, y: fromGeometry.right.y - yOffset },
      { x: fromGeometry.right.x, y: toGeometry.left.y - yOffset },
      { x: toGeometry.left.x, y: toGeometry.left.y - yOffset },
      { x: toGeometry.left.x, y: toGeometry.left.y },
    ],
    text,
  );

  from.rightLines.push(line);
  to.leftLines.push(line);
  to.leftEnd = true;

  return { line, maxX: toGeometry.left.x };
};

const routeStraightLeft = (context: RouteContext): RoutedConnection => {
  const { from, to, text, fromGeometry, toGeometry } = context;

  if (to.rightLines.length === 0 && from.leftLines.length === 0) {
    const line = drawLine(from.chart, fromGeometry.left, [toGeometry.right], text);

    from.leftLines.push(line);
    to.rightLines.push(line);

    return { line, maxX: toGeometry.right.x };
  }

  const yOffset = lineOffset(to.rightLines, from.leftLines);
  // The original renderer starts this detour at the right edge; kept for identical output.
  const line = drawLine(
    from.chart,
    fromGeometry.right,
    [
      { x: fromGeometry.right.x, y: fromGeometry.right.y - yOffset },
      { x: fromGeometry.right.x, y: toGeometry.right.y - yOffset },
      { x: toGeometry.right.x, y: toGeometry.right.y - yOffset },
      { x: toGeometry.right.x, y: toGeometry.right.y },
    ],
    text,
  );

  from.leftLines.push(line);
  to.rightLines.push(line);

  return { line, maxX: toGeometry.right.x };
};

const routeRightAroundColumn = (context: RouteContext): RoutedConnection => {
  const { from, to, text, lineLength, fromGeometry, toGeometry } = context;
  const yOffset = lineOffset(to.topLines, from.rightLines);
  const line = drawLine(
    from.chart,
    fromGeometry.right,
    [
      { x: fromGeometry.right.x + lineLength / 2, y: fromGeometry.right.y - yOffset },
      {
        x: fromGeometry.right.x + lineLength / 2,
        y: toGeometry.top.y - lineLength / 2 - yOffset,
      },
      { x: toGeometry.top.x, y: toGeometry.top.y - lineLength / 2 - yOffset },
      { x: toGeometry.top.x, y: toGeometry.top.y },
    ],
    text,
  );

  from.rightLines.push(line);
  to.topLines.push(line);

  return { line, maxX: fromGeometry.right.x + lineLength / 2 };
};

const routeBottomToLeft = (context: RouteContext): RoutedConnection => {
  const { from, to, text, lineLength, fromGeometry, toGeometry } = context;
  const yOffset = lineOffset(to.topLines, from.bottomLines);
  const bendX = fromGeometry.bottom.x + (fromGeometry.bottom.x - toGeometry.top.x) / 2;

  const line =
    from.leftEnd && isUpper(context)
      ? drawLine(
          from.chart,
          fromGeometry.bottom,
          [
            { x: fromGeometry.bottom.x, y: fromGeometry.bottom.y + lineLength / 2 - yOffset },
            { x: bendX, y: fromGeometry.bottom.y + lineLength / 2 - yOffset },
            { x: bendX, y: toGeometry.top.y - lineLength / 2 - yOffset },
            { x: toGeometry.top.x, y: toGeometry.top.y - lineLength / 2 - yOffset },
            { x: toGeometry.top.x, y: toGeometry.top.y },
          ],
          text,
        )
      : drawLine(
          from.chart,
          fromGeometry.bottom,
          [
            { x: fromGeometry.bottom.x, y: toGeometry.top.y - lineLength / 2 - yOffset },
            { x: toGeometry.top.x, y: toGeometry.top.y - lineLength / 2 - yOffset },
            { x: toGeometry.top.x, y: toGeometry.top.y },
          ],
          text,
        );

  from.bottomLines.push(line);
  to.topLines.push(line);

  return { line, maxX: bendX };
};

const routeBottomToRightUnder = (context: RouteContext): RoutedConnection => {
  const { from, to, text, lineLength, fromGeometry, toGeometry } = context;
  const yOffset = lineOffset(to.topLines, from.bottomLines);
  const line = drawLine(
    from.chart,
    fromGeometry.bottom,
    [
      { x: fromGeometry.bottom.x, y: toGeometry.top.y - lineLength / 2 - yOffset },
      { x: toGeometry.top.x, y: toGeometry.top.y - lineLength / 2 - yOffset },
      { x: toGeometry.top.x, y: toGeometry.top.y },
    ],
    text,
  );

  from.bottomLines.push(line);
  to.topLines.push(line);

  return { line, maxX: Math.max(fromGeometry.bottom.x, toGeometry.top.x) };
};

const routeBottomToRight = (context: RouteContext): RoutedConnection => {
  const { from, to, text, lineLength, fromGeometry, toGeometry } = context;
  const yOffset = lineOffset(to.topLines, from.bottomLines);
  const bendX = fromGeometry.bottom.x + (fromGeometry.bottom.x - toGeometry.top.x) / 2;
  const line = drawLine(
    from.chart,
    fromGeometry.bottom,
    [
      { x: fromGeometry.bottom.x, y: fromGeometry.bottom.y + lineLength / 2 - yOffset },
      { x: bendX, y: fromGeometry.bottom.y + lineLength / 2 - yOffset },
      { x: bendX, y: toGeometry.top.y - lineLength / 2 - yOffset },
      { x: toGeometry.top.x, y: toGeometry.top.y - lineLength / 2 - yOffset },
      { x: toGeometry.top.x, y: toGeometry.top.y },
    ],
    text,
  );

  from.bottomLines.push(line);
  to.topLines.push(line);

  return { line, maxX: bendX };
};

const routeRightToLeft = (context: RouteContext): RoutedConnection => {
  const { from, to, text, lineLength, fromGeometry, toGeometry } = context;
  const yOffset = lineOffset(to.topLines, from.rightLines);
  const line = drawLine(
    from.chart,
    fromGeometry.right,
    [
      { x: fromGeometry.right.x + lineLength / 2, y: fromGeometry.right.y },
      {
        x: fromGeometry.right.x + lineLength / 2,
        y: toGeometry.top.y - lineLength / 2 - yOffset,
      },
      { x: toGeometry.top.x, y: toGeometry.top.y - lineLength / 2 - yOffset },
      { x: toGeometry.top.x, y: toGeometry.top.y },
    ],
    text,
  );

  from.rightLines.push(line);
  to.topLines.push(line);

  return { line, maxX: fromGeometry.right.x + lineLength / 2 };
};

const routeRightToRight = (context: RouteContext): RoutedConnection => {
  const { from, to, text, lineLength, fromGeometry, toGeometry } = context;
  const yOffset = lineOffset(to.topLines, from.rightLines);
  const line = drawLine(
    from.chart,
    fromGeometry.right,
    [
      { x: toGeometry.top.x, y: fromGeometry.right.y - yOffset },
      { x: toGeometry.top.x, y: toGeometry.top.y - yOffset },
    ],
    text,
  );

  from.rightLines.push(line);
  to.topLines.push(line);

  return { line, maxX: fromGeometry.right.x + lineLength / 2 };
};

const routeBottomAroundColumn = (context: RouteContext): RoutedConnection => {
  const { from, to, text, lineLength, fromGeometry, toGeometry } = context;
  const yOffset = lineOffset(to.topLines, from.bottomLines);
  const bendX = fromGeometry.right.x + lineLength / 2;
  const line = drawLine(
    from.chart,
    fromGeometry.bottom,
    [
      { x: fromGeometry.bottom.x, y: fromGeometry.bottom.y + lineLength / 2 - yOffset },
      { x: bendX, y: fromGeometry.bottom.y + lineLength / 2 - yOffset },
      { x: bendX, y: toGeometry.top.y - lineLength / 2 - yOffset },
      { x: toGeometry.top.x, y: toGeometry.top.y - lineLength / 2 - yOffset },
      { x: toGeometry.top.x, y: toGeometry.top.y },
    ],
    text,
  );

  from.bottomLines.push(line);
  to.topLines.push(line);

  return { line, maxX: fromGeometry.bottom.x + lineLength / 2 };
};

const routeLeftAroundColumn = (context: RouteContext): RoutedConnection => {
  const { from, to, text, lineLength, fromGeometry, toGeometry } = context;
  const diffX = Math.min(toGeometry.left.x, fromGeometry.left.x) - lineLength / 2;
  const yOffset = lineOffset(to.topLines, from.leftLines);
  const line = drawLine(
    from.chart,
    fromGeometry.left,
    [
      { x: diffX, y: fromGeometry.left.y - yOffset },
      { x: diffX, y: toGeometry.top.y - lineLength / 2 - yOffset },
      { x: toGeometry.top.x, y: toGeometry.top.y - lineLength / 2 - yOffset },
      { x: toGeometry.top.x, y: toGeometry.top.y },
    ],
    text,
  );

  from.leftLines.push(line);
  to.topLines.push(line);

  return { line, maxX: fromGeometry.left.x };
};

const routeLeft = (context: RouteContext): RoutedConnection => {
  const { from, to, text, lineLength, fromGeometry, toGeometry } = context;
  const yOffset = lineOffset(to.topLines, from.leftLines);
  const bendX = toGeometry.top.x + (fromGeometry.left.x - toGeometry.top.x) / 2;
  const line = drawLine(
    from.chart,
    fromGeometry.left,
    [
      { x: bendX, y: fromGeometry.left.y },
      { x: bendX, y: toGeometry.top.y - lineLength / 2 - yOffset },
      { x: toGeometry.top.x, y: toGeometry.top.y - lineLength / 2 - yOffset },
      { x: toGeometry.top.x, y: toGeometry.top.y },
    ],
    text,
  );

  from.leftLines.push(line);
  to.topLines.push(line);

  return { line, maxX: fromGeometry.left.x };
};

const routeTop = (context: RouteContext): RoutedConnection => {
  const { from, to, text, lineLength, fromGeometry, toGeometry } = context;
  const yOffset = lineOffset(to.topLines, from.topLines);
  const line = drawLine(
    from.chart,
    fromGeometry.top,
    [
      { x: fromGeometry.top.x, y: toGeometry.top.y - lineLength / 2 - yOffset },
      { x: toGeometry.top.x, y: toGeometry.top.y - lineLength / 2 - yOffset },
      { x: toGeometry.top.x, y: toGeometry.top.y },
    ],
    text,
  );

  from.topLines.push(line);
  to.topLines.push(line);

  return { line, maxX: fromGeometry.top.x };
};

interface RouteRule {
  matches: (context: RouteContext) => boolean;
  route: (context: RouteContext) => RoutedConnection;
}

const ROUTE_RULES: RouteRule[] = [
  {
    matches: (context) =>
      isDirection(context, "bottom") && isOnSameColumn(context) && isUnder(context),
    route: routeStraightDown,
  },
  {
    matches: (context) =>
      isDirection(context, "right") && isOnSameLine(context) && isRight(context),
    route: routeStraightRight,
  },
  {
    matches: (context) => isDirection(context, "left") && isOnSameLine(context) && isLeft(context),
    route: routeStraightLeft,
  },
  {
    matches: (context) =>
      isDirection(context, "right") &&
      isOnSameColumn(context) &&
      (isUpper(context) || isUnder(context)),
    route: routeRightAroundColumn,
  },
  {
    matches: (context) => isDirection(context, "bottom") && isLeft(context),
    route: routeBottomToLeft,
  },
  {
    matches: (context) => isDirection(context, "bottom") && isRight(context) && isUnder(context),
    route: routeBottomToRightUnder,
  },
  {
    matches: (context) => isDirection(context, "bottom") && isRight(context),
    route: routeBottomToRight,
  },
  {
    matches: (context) => context.direction === "right" && isLeft(context),
    route: routeRightToLeft,
  },
  {
    matches: (context) => context.direction === "right" && isRight(context),
    route: routeRightToRight,
  },
  {
    matches: (context) =>
      context.direction === "bottom" && isOnSameColumn(context) && isUpper(context),
    route: routeBottomAroundColumn,
  },
  {
    matches: (context) =>
      context.direction === "left" && isOnSameColumn(context) && isUpper(context),
    route: routeLeftAroundColumn,
  },
  {
    matches: (context) => context.direction === "left",
    route: routeLeft,
  },
  {
    matches: (context) => context.direction === "top",
    route: routeTop,
  },
];

/**
 * Draws the connection between two symbols using the same routing rules as the original renderer.
 *
 * @param from Symbol the connection leaves.
 * @param to Symbol the connection enters.
 * @param options Label, DSL direction and detour length of the connection.
 * @returns The drawn line and its right-most x coordinate, or `null` when the pair is not
 *   connected.
 */
export interface ConnectionOptions {
  text: string;
  direction?: Direction;
  lineLength: number;
}

export const routeConnection = (
  from: FlowChartSymbol,
  to: FlowChartSymbol,
  { text, direction, lineLength }: ConnectionOptions,
): RoutedConnection | null => {
  const context: RouteContext = {
    from,
    to,
    text,
    direction,
    lineLength,
    fromGeometry: geometryOf(from),
    toGeometry: geometryOf(to),
  };
  return ROUTE_RULES.find((rule) => rule.matches(context))?.route(context) ?? null;
};
