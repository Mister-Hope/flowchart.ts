export type SymbolType =
  | "start"
  | "end"
  | "operation"
  | "inputoutput"
  | "input"
  | "output"
  | "subroutine"
  | "condition"
  | "parallel";

/** A single style entry: either a global option or a per-symbol / per-flowstate override. */
export type LineStyle = Record<string, string | number>;

/** Styles applied when a node text carries a flowstate (`node|past`). */
export type FlowStateStyles = Record<string, LineStyle>;

export interface SVGOptions {
  x: number;
  y: number;
  "text-margin": number;
  font?: string;
  "font-family"?: string;
  "font-weight"?: string | number;
  "font-size": number;
  "font-color": string;
  "line-width": number;
  "line-length": number;
  "line-color": string;
  "element-color": string;
  fill: string;
  "yes-text": string;
  "no-text": string;
  "arrow-end": string;
  "arrow-start"?: string;
  "arrow-text"?: string;
  class: string;
  scale: number;
  maxWidth?: number;
  roundness?: number;
}

/** Per-symbol-type style overrides, keyed by the node type. */
export type SymbolStyles = Partial<Record<SymbolType, Partial<SVGOptions>>>;

/** Click handler registered through {@link DrawOptions.callbacks} or found on `globalThis`. */
export type ClickCallback = (event: Event, options: Partial<SymbolOptions>) => void;

export interface DrawOptions extends Partial<SVGOptions> {
  width?: number;
  height?: number;
  /** Symbol styles */
  symbols?: SymbolStyles;
  /** FlowState styles */
  flowstate?: FlowStateStyles | null;
  /** Click handlers referenced by `:$callback` in the DSL. */
  callbacks?: Record<string, ClickCallback> | null;
}

export interface ParsedDrawOptions extends SVGOptions {
  width?: number;
  height?: number;
  /** Symbol styles */
  symbols: SymbolStyles;
  /** FlowState styles */
  flowstate?: FlowStateStyles | null;
  /** Click handlers referenced by `:$callback` in the DSL. */
  callbacks?: Record<string, ClickCallback> | null;
}

export type Direction = "top" | "right" | "left" | "bottom" | "path1" | "path2" | "path3";

/**
 * A node / connection as parsed from the flowchart DSL.
 *
 * `next`, `yes`, `no` and `path*` point at other parsed symbols (not at their rendered
 * counterparts); the chart turns them into rendered symbols while walking the graph.
 */
export interface SymbolOptions {
  key: string;
  symbolType: SymbolType;

  text: string | null;
  link: string | null;
  target: string | null;
  function: string | null;
  flowstate: string | null;
  lineStyle: Record<string, LineStyle>;
  params: Record<string, string>;

  next?: SymbolOptions;
  yes?: SymbolOptions;
  no?: SymbolOptions;
  path1?: SymbolOptions;
  path2?: SymbolOptions;
  path3?: SymbolOptions;

  direction_next?: Direction | null;
  direction_yes?: Direction | null;
  direction_no?: Direction | null;
  direction_path1?: Direction | null;
  direction_path2?: Direction | null;
  direction_path3?: Direction | null;

  yes_annotation?: string | null;
  no_annotation?: string | null;
  path1_annotation?: string | null;
  path2_annotation?: string | null;
  path3_annotation?: string | null;
}
