import { describe, expect, it } from "vitest";

import { checkLineIntersection } from "../src/action.js";
import { parsePath, serializePath } from "../src/render/index.js";
import { estimateTextWidth, textLineHeight } from "../src/render/text-metrics.js";
import { deepAssign, toNumber } from "../src/utils.js";

describe("path helpers", () => {
  it("parses and serializes path segments", () => {
    const segments = parsePath("M10,20L30,40C1,2,3,4,5,6");

    expect(segments).toHaveLength(3);
    expect(segments[0]).toStrictEqual(["M", 10, 20]);
    expect(serializePath(segments)).toBe("M10,20L30,40C1,2,3,4,5,6");
  });

  it("handles decimal and negative coordinates", () => {
    const segments = parsePath("M-1.5,2.25 L0,0");

    expect(segments[0]).toStrictEqual(["M", -1.5, 2.25]);
    expect(segments[1]).toStrictEqual(["L", 0, 0]);
  });
});

describe("deepAssign merging", () => {
  it("deep merges without mutating inputs", () => {
    const defaults = { a: 1, nested: { b: 2, c: 3 } };
    const overrides = { nested: { c: 4 } };
    const result = deepAssign(defaults, overrides);

    expect(result).toStrictEqual({ a: 1, nested: { b: 2, c: 4 } });
    expect(defaults.nested.c).toBe(3);
    expect(overrides.nested).toStrictEqual({ c: 4 });
  });

  it("replaces arrays instead of merging them", () => {
    expect(deepAssign({ list: [1, 2] }, { list: [3] })).toStrictEqual({ list: [3] });
  });

  it("ignores undefined sources", () => {
    expect(deepAssign({ a: 1 }, undefined)).toStrictEqual({ a: 1 });
  });

  it("keeps explicit undefined overrides", () => {
    expect(deepAssign<{ a: number; b?: number }>({ a: 1, b: 2 }, { b: undefined })).toStrictEqual({
      a: 1,
      b: undefined,
    });
  });

  it("copies nested objects instead of sharing them", () => {
    const defaults = { nested: { a: 1 } };
    const result = deepAssign<{ nested: { a: number }; other: boolean }>(defaults, { other: true });

    expect(result.nested).toStrictEqual({ a: 1 });
    expect(result.nested).not.toBe(defaults.nested);
    expect(defaults.nested).toStrictEqual({ a: 1 });
  });
});

describe("number parsing", () => {
  it("parses numbers, CSS lengths and falls back safely", () => {
    expect(toNumber(14)).toBe(14);
    expect(toNumber("14px")).toBe(14);
    expect(toNumber(" .5em ")).toBe(0.5);
    expect(toNumber("-1.5rem")).toBe(-1.5);
    expect(toNumber("1e3")).toBe(1000);
    expect(toNumber(undefined, 3)).toBe(3);
    expect(toNumber("nope", 2)).toBe(2);
    expect(toNumber(Number.NaN, 4)).toBe(4);
  });
});

describe("text metrics", () => {
  it("scales text width with font size", () => {
    expect(estimateTextWidth("Hello", 14)).toBeCloseTo(estimateTextWidth("Hello", 7) * 2);
  });

  it("counts wide characters as wider than narrow ones", () => {
    expect(estimateTextWidth("中", 14)).toBeGreaterThan(estimateTextWidth("i", 14));
  });

  it("uses a 1.2 line height", () => {
    expect(textLineHeight(10)).toBeCloseTo(12);
  });
});

describe("line intersection detection", () => {
  it("detects crossing segments", () => {
    const result = checkLineIntersection(
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
      { x: 10, y: 0 },
    );

    expect(result.onLine1).toBe(true);
    expect(result.onLine2).toBe(true);
    expect(result.x).toBeCloseTo(5);
    expect(result.y).toBeCloseTo(5);
  });

  it("ignores parallel segments", () => {
    const result = checkLineIntersection(
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 0, y: 5 },
      { x: 10, y: 5 },
    );

    expect(result.x).toBeNull();
    expect(result.onLine1).toBe(false);
  });
});
