import { describe, expect, it } from "vitest";

import { parse } from "../src/index.js";
import type { Chart } from "../src/index.js";
import type { DrawOptions } from "../src/options.js";

const DSL = `a=>start: A
b=>operation: B
c=>end: C
a->b->c`;

const DEFAULT_LINE_WIDTH = 3;

const render = (options: DrawOptions): Chart => {
  document.body.innerHTML = "";

  const container = document.createElement("div");

  container.id = "diagram";
  document.body.append(container);

  const chart = parse(DSL);

  chart.draw(container, options);

  return chart;
};

/**
 * Right-most x coordinate covered by the rendered nodes and connection lines.
 *
 * @param chart Rendered chart.
 * @returns The right edge, in user units.
 */
const contentRightEdge = (chart: Chart): number => {
  const symbols = chart.diagram?.symbols ?? [];
  const lines = chart.diagram?.lines ?? [];
  const rightEdges = [
    ...symbols.map((symbol) => symbol.getX() + symbol.width),
    ...lines.map((line) => {
      const box = line.getBBox();

      return box.x + box.width;
    }),
  ];

  return Math.max(...rightEdges);
};

const viewBoxOf = (): { x: number; width: number } => {
  const values = (document.querySelector("svg")?.getAttribute("viewBox") ?? "")
    .split(" ")
    .map(Number);

  return { x: values[0] ?? 0, width: values[2] ?? 0 };
};

describe("layout: charts left of the origin", () => {
  it("uses the real right edge when every node is left of x = 0", () => {
    const chart = render({ x: -60, y: -40 });
    const contentRight = contentRightEdge(chart);
    const viewBox = viewBoxOf();

    expect(contentRight).toBeLessThan(0);
    expect(viewBox.x + viewBox.width).toBeCloseTo(contentRight + DEFAULT_LINE_WIDTH, 5);
  });

  it("keeps the tight bounds for charts right of the origin", () => {
    const chart = render({});
    const contentRight = contentRightEdge(chart);
    const viewBox = viewBoxOf();

    expect(contentRight).toBeGreaterThan(0);
    expect(viewBox.x + viewBox.width).toBeCloseTo(contentRight + DEFAULT_LINE_WIDTH, 5);
  });
});
