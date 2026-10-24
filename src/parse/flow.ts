import type { Direction, SymbolOptions } from "../options.js";
import { getAnnotation, getSymbolValue, requireSymbol } from "./definition.js";
import type { Chart } from "./types.js";

const DIRECTIONS = new Set<string>(["top", "right", "left", "bottom", "path1", "path2", "path3"]);

const BRANCH_NAMES = new Set<string>(["next", "yes", "no", "path1", "path2", "path3"]);

/**
 * Splits the branch specifier of a flow fragment into a branch name and an optional direction.
 *
 * @param flowSymbol Flow fragment such as `cond(yes, right)`.
 * @returns The branch name (defaults to `next`) and the requested direction.
 */
const splitBranch = (flowSymbol: string): { next: string; direction: Direction | null } => {
  let next = "next";
  const startIndex = flowSymbol.indexOf("(") + 1;
  const endIndex = flowSymbol.indexOf(")");

  if (startIndex > 0 && endIndex > 0) {
    next = flowSymbol.slice(startIndex, endIndex);

    // A bare specifier like `(right)` is a direction for the default branch, not a branch name.
    if (!next.includes(",") && next !== "yes" && next !== "no") next = `next, ${next}`;
  }

  let direction: Direction | null = null;

  if (next.includes(",")) {
    const parts = next.split(",");

    next = parts[0] ?? "next";
    direction = (parts[1]?.trim() ?? null) as Direction | null;
  }

  return { next, direction };
};

const setLinkedSymbol = (source: SymbolOptions, name: string, target: SymbolOptions): void => {
  switch (name) {
    case "yes": {
      source.yes = target;
      break;
    }
    case "no": {
      source.no = target;
      break;
    }
    case "path1": {
      source.path1 = target;
      break;
    }
    case "path2": {
      source.path2 = target;
      break;
    }
    case "path3": {
      source.path3 = target;
      break;
    }
    default: {
      source.next = target;
      break;
    }
  }
};

const setLinkedDirection = (
  source: SymbolOptions,
  name: string,
  direction: Direction | null,
): void => {
  switch (name) {
    case "yes": {
      source.direction_yes = direction;
      break;
    }
    case "no": {
      source.direction_no = direction;
      break;
    }
    case "path1": {
      source.direction_path1 = direction;
      break;
    }
    case "path2": {
      source.direction_path2 = direction;
      break;
    }
    case "path3": {
      source.direction_path3 = direction;
      break;
    }
    default: {
      source.direction_next = direction;
      break;
    }
  }
};

const setAnnotation = (symbol: SymbolOptions, next: string, annotation: string): void => {
  if (symbol.symbolType === "condition") {
    if (next === "yes" || next === "true") symbol.yes_annotation = annotation;
    else symbol.no_annotation = annotation;
  } else if (symbol.symbolType === "parallel") {
    if (next === "path1") symbol.path1_annotation = annotation;
    else if (next === "path2") symbol.path2_annotation = annotation;
    else if (next === "path3") symbol.path3_annotation = annotation;
  }
};

/**
 * Applies a DSL flow line such as `st->op->cond` (with optional branch specifiers and annotations)
 * to the parsed chart.
 *
 * @param source Flow line.
 * @param chart Chart being built.
 */
export const applyFlowLine = (source: string, chart: Chart): void => {
  let annotation: string | null = getAnnotation(source);
  let line = source;

  if (annotation != null && annotation !== "") line = line.replace(`@${annotation}`, "");

  const flowSymbols = line.split("->");

  for (let index = 0, { length } = flowSymbols; index < length; index += 1) {
    let flowSymbol = flowSymbols[index] ?? "";
    const symbolValue = getSymbolValue(flowSymbol);

    // `true`/`false` are aliases for the condition branches `yes`/`no`.
    if (symbolValue === "true" || symbolValue === "false")
      flowSymbol = flowSymbol.replace("true", "yes").replace("false", "no");

    const { next, direction } = splitBranch(flowSymbol);
    const realSymbol = requireSymbol(flowSymbol, chart);

    if (!BRANCH_NAMES.has(next)) {
      throw new Error(
        `Unknown branch "${next}" for node "${realSymbol.key}", expected one of ${[...BRANCH_NAMES].join(", ")}!`,
      );
    }

    if (direction != null && !DIRECTIONS.has(direction)) {
      throw new Error(
        `Unknown direction "${direction}" for node "${realSymbol.key}", expected one of ${[...DIRECTIONS].join(", ")}!`,
      );
    }

    if (annotation != null && annotation !== "") {
      setAnnotation(realSymbol, next, annotation);
      annotation = null;
    }

    chart.start ??= realSymbol;

    if (index + 1 < length) {
      const nextSymbol = requireSymbol(flowSymbols[index + 1] ?? "", chart);

      setLinkedSymbol(realSymbol, next, nextSymbol);
      setLinkedDirection(realSymbol, next, direction);
    }
  }
};
