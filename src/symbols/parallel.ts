import type FlowChart from "../chart.js";
import type { Direction, SymbolOptions } from "../options.js";
import { placeBottom, placeLeft, placeRight, placeTop } from "./placement.js";
import { FlowChartSymbol } from "./symbol.js";

type Directions = [path1: Direction, path2: Direction, path3: Direction];

const DEFAULT_DIRECTIONS: Directions = ["bottom", "right", "top"];

const PATH1_DIRECTIONS: Partial<Record<Direction, Directions>> = {
  left: ["left", "right", "bottom"],
  right: ["right", "bottom", "top"],
  top: ["top", "right", "bottom"],
};

const PATH2_DIRECTIONS: Partial<Record<Direction, Directions>> = {
  left: ["bottom", "left", "right"],
  right: ["bottom", "right", "top"],
  top: ["bottom", "top", "right"],
};

const PATH3_DIRECTIONS: Partial<Record<Direction, Directions>> = {
  bottom: ["top", "right", "bottom"],
  left: ["bottom", "right", "left"],
  right: ["bottom", "top", "right"],
};

/**
 * Fallback for a `path2` / `path3` direction outside the tables above, matching the final `else`
 * branch of the original renderer (`right`, `bottom`, `top`).
 */
const FALLBACK_DIRECTIONS: Directions = ["right", "bottom", "top"];

/**
 * Resolves the per-path directions, mirroring the defaults of the original renderer.
 *
 * @param direction1 Explicit direction for the first path.
 * @param direction2 Explicit direction for the second path.
 * @param direction3 Explicit direction for the third path.
 * @param hasAllPaths Whether all three paths are connected.
 * @returns The resolved directions for the three paths.
 */
const resolveDirections = (
  direction1: Direction | null,
  direction2: Direction | null,
  direction3: Direction | null,
  hasAllPaths: boolean,
): Directions => {
  if (hasAllPaths) {
    if (direction1 != null && direction2 == null && direction3 == null)
      return PATH1_DIRECTIONS[direction1] ?? DEFAULT_DIRECTIONS;
    if (direction1 == null && direction2 != null && direction3 == null)
      return PATH2_DIRECTIONS[direction2] ?? FALLBACK_DIRECTIONS;
    if (direction1 == null && direction2 == null && direction3 != null)
      return PATH3_DIRECTIONS[direction3] ?? FALLBACK_DIRECTIONS;
  }

  return [direction1 ?? "bottom", direction2 ?? "right", direction3 ?? "top"];
};

export class Parallel extends FlowChartSymbol {
  path1_direction: Direction = "bottom";

  path1_symbol?: FlowChartSymbol;

  path1_annotation: string;

  path2_direction: Direction = "right";

  path2_symbol?: FlowChartSymbol;

  path2_annotation: string;

  path3_direction: Direction = "top";

  path3_symbol?: FlowChartSymbol;

  path3_annotation: string;

  path1?: (nextSymbol: FlowChartSymbol) => FlowChartSymbol;

  path2?: (nextSymbol: FlowChartSymbol) => FlowChartSymbol;

  path3?: (nextSymbol: FlowChartSymbol) => FlowChartSymbol;

  constructor(chart: FlowChart, options: SymbolOptions) {
    const symbol = chart.paper.rect({ x: 0, y: 0, width: 0, height: 0 });

    super(chart, options, symbol);

    this.path1_annotation = options.path1_annotation ?? "";
    this.path2_annotation = options.path2_annotation ?? "";
    this.path3_annotation = options.path3_annotation ?? "";

    const direction1 = options.direction_path1 ?? null;
    const direction2 = options.direction_path2 ?? null;
    const direction3 = options.direction_path3 ?? null;
    const hasAllPaths = options.path1 != null && options.path2 != null && options.path3 != null;

    [this.path1_direction, this.path2_direction, this.path3_direction] = resolveDirections(
      direction1,
      direction2,
      direction3,
      hasAllPaths,
    );

    this.initialize();
  }

  override render(): void {
    this.assignDirectionalSymbol(this.path1_direction, this.path1_symbol);
    this.assignDirectionalSymbol(this.path2_direction, this.path2_symbol);
    this.assignDirectionalSymbol(this.path3_direction, this.path3_symbol);

    const lineLength = this.getAttr("line-length");

    placeBottom(this, lineLength);
    placeTop(this, lineLength);
    placeLeft(this, lineLength);
    placeRight(this, lineLength);
  }

  override renderLines(): void {
    if (this.path1_symbol != null)
      this.drawLineTo(this.path1_symbol, this.path1_annotation, this.path1_direction);

    if (this.path2_symbol != null)
      this.drawLineTo(this.path2_symbol, this.path2_annotation, this.path2_direction);

    if (this.path3_symbol != null)
      this.drawLineTo(this.path3_symbol, this.path3_annotation, this.path3_direction);
  }
}
