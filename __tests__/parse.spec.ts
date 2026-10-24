import { describe, expect, it } from "vitest";

import type { Chart } from "../src/index.js";
import { parse } from "../src/index.js";

const chartOf = (input: string): Chart => parse(input);

describe("parse: definitions", () => {
  it("parses a node definition", () => {
    const chart = chartOf("st=>start: Start");
    const symbol = chart.symbols.st;

    expect(symbol).toBeDefined();
    expect(symbol?.symbolType).toBe("start");
    expect(symbol?.text).toBe("Start");
    expect(symbol?.link).toBeNull();
  });

  it("parses the node text after the first ': '", () => {
    const chart = chartOf("cond=>condition: Yes: No?:>https://example.com");

    expect(chart.symbols.cond?.symbolType).toBe("condition");
    expect(chart.symbols.cond?.text).toBe("Yes: No?");
    expect(chart.symbols.cond?.link).toBe("https://example.com");
  });

  it("parses links with a target", () => {
    const chart = chartOf("st=>start: Start:>https://example.com[blank]");

    expect(chart.symbols.st?.link).toBe("https://example.com");
    expect(chart.symbols.st?.target).toBe("blank");
  });

  it("parses js callbacks", () => {
    const chart = chartOf("st=>start: Start:$myFunction");

    expect(chart.symbols.st?.function).toBe("myFunction");
    expect(chart.symbols.st?.text).toBe("Start");
  });

  it("parses flowstate suffixes and node params", () => {
    const chart = chartOf("cond(align-next=no)=>condition: Question|past");

    expect(chart.symbols.cond?.flowstate).toBe("past");
    expect(chart.symbols.cond?.text).toBe("Question");
    expect(chart.symbols.cond?.params).toStrictEqual({ "align-next": "no" });
  });

  it("keeps multi-line node text", () => {
    const chart = chartOf("st=>start: Line one\nLine two");

    expect(chart.symbols.st?.text).toBe("Line one\nLine two");
  });
});

describe("parse: connections", () => {
  it("builds a next chain and marks the first node as chart start", () => {
    const chart = chartOf("st=>start: Start\nop=>operation: Op\nst->op");

    expect(chart.start?.key).toBe("st");
    expect(chart.symbols.st?.next?.key).toBe("op");
  });

  it("maps true/false to yes/no", () => {
    const chart = chartOf(
      "st=>start: Start\na=>operation: A\nb=>operation: B\ncond=>condition: Cond?\nst->cond\ncond(true)->a\ncond(false)->b",
    );

    expect(chart.symbols.cond?.yes?.key).toBe("a");
    expect(chart.symbols.cond?.no?.key).toBe("b");
  });

  it("parses direction specifiers", () => {
    const chart = chartOf(
      "st=>start: Start\nop=>operation: Op\ncond=>condition: Cond?\nst->op\nop(right)->cond",
    );

    expect(chart.symbols.op?.direction_next).toBe("right");
    expect(chart.symbols.op?.next?.key).toBe("cond");
  });

  it("parses condition branch directions and annotations", () => {
    const chart = chartOf(
      "st=>start: Start\na=>operation: A\nb=>operation: B\ncond=>condition: C?\nst->cond\ncond(yes@yes-label, right)->a\ncond(no@no-label)->b",
    );

    expect(chart.symbols.cond?.direction_yes).toBe("right");
    expect(chart.symbols.cond?.yes_annotation).toBe("yes-label");
    expect(chart.symbols.cond?.no_annotation).toBe("no-label");
  });

  it("parses parallel path directions", () => {
    const chart = chartOf(
      "st=>start: Start\na=>operation: A\nb=>operation: B\nc=>operation: C\npara=>parallel: P\nst->para\npara(path1, right)->a\npara(path2, bottom)->b\npara(path3, top)->c",
    );

    expect(chart.symbols.para?.direction_path1).toBe("right");
    expect(chart.symbols.para?.direction_path2).toBe("bottom");
    expect(chart.symbols.para?.direction_path3).toBe("top");
  });

  it("parses line styles", () => {
    const chart = chartOf(
      'st=>start: Start\nop=>operation: Op\nst->op\nst@>op({"stroke":"red","stroke-width":6})',
    );

    expect(chart.symbols.st?.lineStyle.op).toStrictEqual({ stroke: "red", "stroke-width": 6 });
  });
});

describe("parse: errors", () => {
  it("throws for unknown node types", () => {
    expect(() => parse("st=>unknown: Start")).toThrow(/Unknown symbol type "unknown"/u);
  });

  it("throws for unknown node references in flows", () => {
    expect(() => parse("st=>start: Start\nst->missing")).toThrow(/Unknown symbol "missing"/u);
  });

  it("throws for unknown directions", () => {
    expect(() => parse("st=>start: Start\nop=>operation: Op\nst->op\nop(up)->st")).toThrow(
      /Unknown direction "up"/u,
    );
  });

  it("throws for unknown branch names", () => {
    expect(() =>
      parse("st=>start: Start\nop=>operation: Op\nst->op\nop(maybe, right)->st"),
    ).toThrow(/Unknown branch "maybe"/u);
  });

  it("does not crash on empty input", () => {
    expect(chartOf("").start).toBeNull();
    expect(Object.keys(chartOf("").symbols)).toHaveLength(0);
  });
});
