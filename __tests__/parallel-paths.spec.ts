import { describe, expect, it } from "vitest";

import { parse } from "../src/index.js";
import type { Chart } from "../src/index.js";
import type { FlowChartSymbol } from "../src/symbols/index.js";

const BARE_PATHS_DSL = `st=>start: Start
para=>parallel: Parallel
a=>operation: A
b=>operation: B
c=>operation: C
e=>end: End
st->para
para(path1)->a
para(path2)->b
para(path3)->c
a->e
b->e
c->e`;

const render = (dsl: string): Chart => {
  document.body.innerHTML = "";

  const container = document.createElement("div");

  container.id = "diagram";
  document.body.append(container);

  const chart = parse(dsl);

  chart.draw(container);

  return chart;
};

const symbolOf = (chart: Chart, key: string): FlowChartSymbol => {
  const symbol = chart.diagram?.symbols.find((candidate) => candidate.key === key);

  if (symbol == null) throw new Error(`Symbol "${key}" was not rendered.`);

  return symbol;
};

describe("parse: bare parallel path specifiers", () => {
  it("treats `para(path1)` and friends as branch names", () => {
    const chart = parse(BARE_PATHS_DSL);
    const parallel = chart.symbols.para;

    expect(parallel?.path1).toBe(chart.symbols.a);
    expect(parallel?.path2).toBe(chart.symbols.b);
    expect(parallel?.path3).toBe(chart.symbols.c);
    expect(parallel?.direction_path1).toBeNull();
    expect(parallel?.direction_path2).toBeNull();
    expect(parallel?.direction_path3).toBeNull();
  });

  it("renders every bare path branch", () => {
    const chart = render(BARE_PATHS_DSL);

    expect(["a", "b", "c"].map((key) => symbolOf(chart, key).isPositioned)).toStrictEqual([
      true,
      true,
      true,
    ]);
    expect(document.querySelectorAll("#a, #b, #c")).toHaveLength(3);
  });

  it("keeps the original renderer's fallback directions for path3", () => {
    const chart = render(`st=>start: Start
para=>parallel: Parallel
a=>operation: A
b=>operation: B
c=>operation: C
st->para
para(path1)->a
para(path2)->b
para(path3, top)->c`);
    const parallel = symbolOf(chart, "para");

    // The fallback is right/bottom/top: path1 leaves to the right, path2 goes down.
    expect(symbolOf(chart, "a").getX()).toBeGreaterThan(parallel.getX() + parallel.width);
    expect(symbolOf(chart, "b").getCenter().y).toBeGreaterThan(parallel.getCenter().y);
  });

  it("keeps the original renderer's fallback directions for path2", () => {
    const chart = render(`st=>start: Start
para=>parallel: Parallel
a=>operation: A
b=>operation: B
c=>operation: C
st->para
para(path1)->a
para(path2, bottom)->b
para(path3)->c`);
    const parallel = symbolOf(chart, "para");

    // The fallback is right/bottom/top: path1 leaves to the right, path2 goes down.
    expect(symbolOf(chart, "a").getX()).toBeGreaterThan(parallel.getX() + parallel.width);
    expect(symbolOf(chart, "b").getCenter().y).toBeGreaterThan(parallel.getCenter().y);
  });

  it("keeps the original renderer's fallback directions for path1", () => {
    const chart = render(`st=>start: Start
para=>parallel: Parallel
a=>operation: A
b=>operation: B
c=>operation: C
st->para
para(path1, bottom)->a
para(path2)->b
para(path3)->c`);
    const parallel = symbolOf(chart, "para");

    // The fallback is bottom/right/top: path1 goes down, path2 leaves to the right.
    expect(symbolOf(chart, "a").getCenter().y).toBeGreaterThan(parallel.getCenter().y);
    expect(symbolOf(chart, "b").getX()).toBeGreaterThan(parallel.getX() + parallel.width);
  });
});
