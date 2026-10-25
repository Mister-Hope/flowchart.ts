import { describe, expect, it, vi } from "vitest";

import { parse } from "../src/index.js";
import type { Chart } from "../src/index.js";
import type { FlowChartSymbol } from "../src/symbols/index.js";

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

const isAbove = (upper: FlowChartSymbol, lower: FlowChartSymbol): boolean =>
  upper.getY() + upper.height < lower.getY();

const overlaps = (first: FlowChartSymbol, second: FlowChartSymbol): boolean =>
  first.getX() < second.getX() + second.width &&
  second.getX() < first.getX() + first.width &&
  first.getY() < second.getY() + second.height &&
  second.getY() < first.getY() + first.height;

const CONDITION_WITH_TOP_DSL = `st=>start: S
cond=>condition: C?
a=>operation: A
b=>operation: B
st->cond
cond(yes, top)->a
cond(no)->b`;

describe("layout: branch directions", () => {
  it("lays out the `yes` branch of a condition above it", () => {
    const chart = render(CONDITION_WITH_TOP_DSL);
    const start = symbolOf(chart, "st");
    const condition = symbolOf(chart, "cond");
    const yesBranch = symbolOf(chart, "a");

    expect(yesBranch.isPositioned).toBe(true);
    expect(isAbove(yesBranch, condition)).toBe(true);
    expect(overlaps(yesBranch, start)).toBe(false);
  });

  it("lays out the `no` branch of a condition above it", () => {
    const chart = render(`st=>start: S
cond=>condition: C?
a=>operation: A
b=>operation: B
st->cond
cond(yes)->a
cond(no, top)->b`);
    const condition = symbolOf(chart, "cond");
    const noBranch = symbolOf(chart, "b");

    expect(noBranch.isPositioned).toBe(true);
    expect(isAbove(noBranch, condition)).toBe(true);
  });

  it("lays out a `left` branch beside the condition", () => {
    const chart = render(`st=>start: S
cond=>condition: C?
a=>operation: A
b=>operation: B
st->cond
cond(yes, left)->a
cond(no)->b`);
    const condition = symbolOf(chart, "cond");
    const yesBranch = symbolOf(chart, "a");

    expect(yesBranch.isPositioned).toBe(true);
    expect(yesBranch.getX() + yesBranch.width).toBeLessThan(condition.getX());
  });

  it("warns when both condition branches resolve to the same direction", () => {
    const warning = vi.spyOn(globalThis.console, "warn").mockImplementation(() => {});

    try {
      render(
        `st=>start: S
cond=>condition: C?
a=>operation: A
b=>operation: B
st->cond
cond(yes, bottom)->a
cond(no, bottom)->b`,
      );

      expect(warning).toHaveBeenCalledTimes(1);

      const message = String(warning.mock.calls[0]?.[0]);

      expect(message).toContain('"cond"');
      expect(message).toContain('"bottom"');
      expect(message).toContain('"a"');
      expect(message).toContain('"b"');
    } finally {
      warning.mockRestore();
    }
  });

  it("warns when two parallel branches resolve to the same direction", () => {
    const warning = vi.spyOn(globalThis.console, "warn").mockImplementation(() => {});

    try {
      render(
        `st=>start: S
para=>parallel: P
a=>operation: A
b=>operation: B
c=>operation: C
st->para
para(path1, right)->a
para(path2, right)->b
para(path3, bottom)->c`,
      );

      expect(warning).toHaveBeenCalledTimes(1);
      expect(String(warning.mock.calls[0]?.[0])).toContain('"para"');
    } finally {
      warning.mockRestore();
    }
  });

  it("keeps an earlier branch when a later branch has no direction", () => {
    const warning = vi.spyOn(globalThis.console, "warn").mockImplementation(() => {});

    try {
      // Only two of the three paths are connected, so the unconnected path3 must not clear the
      // direction already assigned to path1.
      const chart = render(
        `st=>start: S
para=>parallel: P
a=>operation: A
b=>operation: B
st->para
para(path1, top)->a
para(path2, right)->b`,
      );

      expect(warning).not.toHaveBeenCalled();
      expect(isAbove(symbolOf(chart, "a"), symbolOf(chart, "para"))).toBe(true);
    } finally {
      warning.mockRestore();
    }
  });
});
