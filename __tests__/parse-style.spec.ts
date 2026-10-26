import { describe, expect, it } from "vitest";

import { parse } from "../src/index.js";
import { getStyle } from "../src/parse/definition.js";

const styleOf = (line: string): Record<string, unknown> => {
  const chart = parse(`st=>start: S\ne=>end: E\nst->e\n${line}`);

  return chart.symbols.st?.lineStyle.e ?? {};
};

describe("parse: line-style lines", () => {
  it("keeps parentheses inside JSON strings", () => {
    expect(styleOf('st@>e({"stroke":"rgb(1, 2, 3)"})')).toStrictEqual({
      stroke: "rgb(1, 2, 3)",
    });
  });

  it("keeps escaped quotes inside JSON strings", () => {
    expect(styleOf(String.raw`st@>e({"stroke":"a\"b"})`)).toStrictEqual({ stroke: 'a"b' });
  });

  it("does not split on @> inside JSON strings", () => {
    expect(styleOf('st@>e({"stroke":"a@>b"})')).toStrictEqual({ stroke: "a@>b" });
  });

  it("still applies multiple fragments", () => {
    const chart = parse(
      'st=>start: S\na=>operation: A\ne=>end: E\nst->a->e\nst@>a({"stroke":"red"})@>e({"stroke":"blue"})',
    );

    expect(chart.symbols.st?.lineStyle.a).toStrictEqual({ stroke: "red" });
    expect(chart.symbols.a?.lineStyle.e).toStrictEqual({ stroke: "blue" });
  });

  it("falls back to {} for an unterminated payload", () => {
    expect(getStyle('e({"stroke":"red"')).toBe("{}");
  });
});
