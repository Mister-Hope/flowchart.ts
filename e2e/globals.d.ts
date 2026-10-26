interface FlowchartChart {
  draw: (container: HTMLElement, options?: Record<string, unknown>) => void;
}

interface FlowchartModule {
  parse: (dsl: string) => FlowchartChart;
}

declare global {
  var flowchart: FlowchartModule, flowchartReady: boolean | undefined;
}

export {};
