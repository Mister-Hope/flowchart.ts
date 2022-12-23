import type { FlowChartSymbol } from "./symbol/index.js";

export type SymbolType =
  | "start"
  | "end"
  | "operation"
  | "inputoutput"
  | "subroutine"
  | "condition"
  | "parallel";

export interface SVGOptions {
  x: number;
  y: number;
  "text-margin": number;
  font?: string;
  "font-family"?: string;
  "font-weight"?: string;
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
  class: string;
  scale: number;
  [props: string]: any;
}

export interface DrawOptions extends Partial<SVGOptions> {
  /** Stymbol Styles */
  symbols?: Record<string, Partial<SVGOptions>>;
  /** FlowState config */
  flowstate?: Record<string, Partial<SVGOptions>>;
}

export interface ParsedDrawOptions extends SVGOptions {
  /** Stymbol Styles */
  symbols: Record<string, Partial<SVGOptions>>;
  /** FlowState config */
  flowstate?: string;
}

export type Direction =
  | "top"
  | "right"
  | "left"
  | "bottom"
  | "path1"
  | "path2"
  | "path3";

export interface SymbolOptions extends ParsedDrawOptions {
  symbolType: SymbolType;

  key: string;

  text: string | undefined;
  link: string | null;
  target: string | null;
  function: null | string;
  lineStyle: Record<string, string>;
  params: Record<string, string>;
  direction_next?: Direction;
  next?: FlowChartSymbol;

  path1?: FlowChartSymbol;
  path2?: FlowChartSymbol;
  path3?: FlowChartSymbol;
  direction_path1: Direction;
  direction_path2: Direction;
  direction_path3: Direction;
}