import type { Direction, SymbolOptions, SymbolType } from "../options.js";
import { getAnnotation, getSymbolValue, requireSymbol } from "./definition.js";
import type { Chart } from "./types.js";

const DIRECTIONS = new Set<string>(["top", "right", "left", "bottom", "path1", "path2", "path3"]);

const BRANCH_NAMES = new Set<string>(["next", "yes", "no", "path1", "path2", "path3"]);

/** Branch specifiers that are valid without an explicit direction (e.g. `cond(yes)`). */
const BARE_BRANCH_NAMES = new Set<string>(["yes", "no", "path1", "path2", "path3"]);

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

    // A bare specifier like `(right)` is a direction for the default branch; `yes`/`no` and
    // `path1`-`path3` are branch names on their own.
    if (!next.includes(",") && !BARE_BRANCH_NAMES.has(next)) next = `next, ${next}`;
  }

  const separator = next.indexOf(",");

  if (separator === -1) return { next, direction: null };

  const rawDirection = next.slice(separator + 1).trim();

  return {
    next: next.slice(0, separator),
    direction: rawDirection === "" ? null : (rawDirection as Direction),
  };
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

/** Annotation slots per symbol type and branch name. */
const ANNOTATION_KEYS: Partial<Record<SymbolType, Record<string, keyof SymbolOptions>>> = {
  condition: {
    yes: "yes_annotation",
    true: "yes_annotation",
    no: "no_annotation",
  },
  parallel: {
    path1: "path1_annotation",
    path2: "path2_annotation",
    path3: "path3_annotation",
  },
};

const setAnnotation = (symbol: SymbolOptions, next: string, annotation: string): void => {
  const keys = ANNOTATION_KEYS[symbol.symbolType];
  if (keys == null) return;

  const key = keys[next];
  if (key == null) return;

  (symbol as unknown as Record<string, string>)[key] = annotation;
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

  for (const [index, flowSymbolValue] of flowSymbols.entries()) {
    let flowSymbol = flowSymbolValue;
    const symbolValue = getSymbolValue(flowSymbol);

    // `true`/`false` are aliases for the condition branches `yes`/`no`.
    if (symbolValue === "true" || symbolValue === "false")
      flowSymbol = flowSymbol.replace("true", "yes").replace("false", "no");

    const { next, direction } = splitBranch(flowSymbol);
    const realSymbol = requireSymbol(flowSymbol, chart);

    if (annotation != null && annotation !== "") {
      setAnnotation(realSymbol, next, annotation);
      annotation = null;
    }

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

    chart.start ??= realSymbol;

    const followingSymbol = flowSymbols[index + 1];

    if (followingSymbol != null) {
      const nextSymbol = requireSymbol(followingSymbol, chart);

      setLinkedSymbol(realSymbol, next, nextSymbol);
      setLinkedDirection(realSymbol, next, direction);
    }
  }
};
