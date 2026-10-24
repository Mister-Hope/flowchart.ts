import type FlowChart from "../chart.js";
import type { Direction, SymbolOptions } from "../options.js";
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
};

const PATH3_DIRECTIONS: Partial<Record<Direction, Directions>> = {
  bottom: ["top", "right", "bottom"],
  left: ["bottom", "right", "left"],
  right: ["bottom", "top", "right"],
};

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
      return PATH2_DIRECTIONS[direction2] ?? ["right", "bottom", "top"];
    if (direction1 == null && direction2 == null && direction3 != null)
      return PATH3_DIRECTIONS[direction3] ?? DEFAULT_DIRECTIONS;
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

  textMargin?: number;

  constructor(chart: FlowChart, options: Partial<SymbolOptions> = {}) {
    const symbol = chart.paper.rect({ x: 0, y: 0, width: 0, height: 0 });

    super(chart, options, symbol);

    this.path1_annotation = options.path1_annotation ?? "";
    this.path2_annotation = options.path2_annotation ?? "";
    this.path3_annotation = options.path3_annotation ?? "";
    this.textMargin = this.getAttrOr<number>("text-margin", 10);

    const { next, direction_next } = options;

    if (next != null) {
      if (direction_next === "path1" && options.path1 == null) options.path1 = next;
      else if (direction_next === "path2" && options.path2 == null) options.path2 = next;
      else if (direction_next === "path3" && options.path3 == null) options.path3 = next;
    }

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

    const lineLength = this.getAttrOr<number>("line-length", 50);

    this.placeBottom(lineLength);
    this.placeTop(lineLength);
    this.placeLeft(lineLength);
    this.placeRight(lineLength);
  }

  override renderLines(): void {
    if (this.path1_symbol != null)
      this.drawLineTo(this.path1_symbol, this.path1_annotation, this.path1_direction);

    if (this.path2_symbol != null)
      this.drawLineTo(this.path2_symbol, this.path2_annotation, this.path2_direction);

    if (this.path3_symbol != null)
      this.drawLineTo(this.path3_symbol, this.path3_annotation, this.path3_direction);
  }

  /**
   * Positions the `top` branch symbol above this node.
   *
   * @param lineLength Minimum distance between the node and the branch symbol.
   */
  private placeTop(lineLength: number): void {
    const topSymbol = this.top_symbol;

    if (topSymbol == null || topSymbol.isPositioned) return;

    const topPoint = this.getTop();

    topSymbol.shiftY(this.getY() - topSymbol.height - lineLength);
    topSymbol.setX(topPoint.x + topSymbol.width);
    topSymbol.isPositioned = true;

    topSymbol.render();
  }
}
