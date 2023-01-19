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
  /** Symbol Styles */
  symbols?: Record<string, Partial<SVGOptions>>;
}


export interface Chart{
  draw: (container: HTMLElement | string, options?: DrawOptions )=> void 
}

export const parse: (input:string)=>Chart;
