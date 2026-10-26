import { describe, expect, it } from "vitest";

import type { Chart } from "../src/index.js";
import { parse } from "../src/index.js";

const chartOf = (input: string): Chart => parse(input);

describe("parse: definitions", () => {
  it("rejects non-string input", () => {
    expect(() => parse(null as unknown as string)).toThrow(/expects a string/u);
  });

  it("reports the DSL line for parse errors", () => {
    expect(() => parse("st=>start: S\nop=>operation: Op\nst->missing")).toThrow(
      /Line 3: Unknown symbol "missing"/u,
    );
    expect(() => parse("st=>start: S\ne=>end: E\nst->e\nst@>e({not json})")).toThrow(SyntaxError);
  });

  it("parses empty input", () => {
    const chart = parse();

    expect(chart.start).toBeNull();
    expect(chart.symbols).toStrictEqual({});
  });

  it("ignores lines that contain no flow syntax", () => {
    expect(() => parse("plain text without flow syntax")).not.toThrow();
  });

  it("applies line styles written without a JSON payload", () => {
    const chart = parse("st=>start: Start\nop=>operation: Op\nst->op\nst@>op");

    expect(chart.symbols.st?.lineStyle).toStrictEqual({ op: {} });
  });

  it("parses callbacks without a display text", () => {
    const chart = parse("st=>start:$callback\ne=>end: End\nst->e");

    expect(chart.symbols.st?.function).toBe("callback");
    expect(chart.symbols.st?.text).toBeNull();
  });

  it("parses callbacks attached to the raw node type", () => {
    const chart = parse("st=>start: Start:$callback\ne=>end: End\nst->e");

    expect(chart.symbols.st?.function).toBe("callback");
  });

  it("skips malformed parameter fragments", () => {
    const chart = parse("cond(a=1, broken)=>condition: Ready?");

    expect(chart.symbols.cond?.params).toStrictEqual({ a: "1" });
  });

  it("treats an empty direction as no direction", () => {
    const chart = parse("c=>condition: C?\ne=>end: E\nc(yes,)->e");

    expect(chart.symbols.c?.direction_yes).toBeNull();
  });

  it("drops a trailing flowstate separator", () => {
    const chart = parse("st=>start: Start|\ne=>end: E\nst->e");

    expect(chart.symbols.st?.text).toBe("Start");
    expect(chart.symbols.st?.flowstate).toBeNull();
  });

  it("applies annotations on symbols without annotated branches", () => {
    expect(() => parse("st=>start: S\ne=>end: E\nst(no@x)->e")).not.toThrow();
  });

  it("applies annotations before direction validation", () => {
    expect(() => parse("c=>condition: C?\ne=>end: E\nc(bogus@x)->e")).toThrow(
      'Unknown direction "bogus"',
    );
  });

  it("maps true/false to the yes/no condition branches", () => {
    const chart = parse(
      "st=>start: S\nc=>condition: C?\na=>operation: A\nb=>operation: B\nst->c\nc(true)->a\nc(false)->b",
    );

    expect(chart.symbols.c?.yes).toBe(chart.symbols.a);
    expect(chart.symbols.c?.no).toBe(chart.symbols.b);
  });

  it("maps true/false aliases together with a direction", () => {
    const chart = parse("c=>condition: C?\na=>operation: A\nc(true, right)->a");

    expect(chart.symbols.c?.direction_yes).toBe("right");
    expect(chart.symbols.c?.yes).toBe(chart.symbols.a);
  });

  it("rejects branch names as connection directions", () => {
    expect(() => parse("a=>operation: A\nb=>end: B\na(next, path1)->b")).toThrow(
      'Unknown direction "path1"',
    );
    expect(() => parse("c=>condition: C?\na=>operation: A\nc(yes, path2)->a")).toThrow(
      'Unknown direction "path2"',
    );
  });

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

describe("parse: input / output node types", () => {
  it("accepts input and output definitions", () => {
    const chart = chartOf("in=>input: Input\nout=>output: Output");

    expect(chart.symbols.in?.symbolType).toBe("input");
    expect(chart.symbols.out?.symbolType).toBe("output");
  });
});

describe("parse: text, links and styles", () => {
  it("parses several node params", () => {
    const chart = chartOf("cond(a=1, b=2)=>condition: Q?");

    expect(chart.symbols.cond?.params).toStrictEqual({ a: "1", b: "2" });
  });

  it("keeps an unclosed link target as part of the link", () => {
    const chart = chartOf("st=>start: S:>https://example.com[blank");

    expect(chart.symbols.st?.link).toBe("https://example.com[blank");
    expect(chart.symbols.st?.target).toBeNull();
  });

  it("prefers callback syntax over links", () => {
    const chart = chartOf("st=>start: S:>https://example.com:$run");

    expect(chart.symbols.st?.function).toBe("run");
    expect(chart.symbols.st?.link).toBeNull();
    expect(chart.symbols.st?.text).toBe("S:>https://example.com");
  });

  it("keeps a plain colon inside the node text", () => {
    const chart = chartOf("st=>start: Time: 10:30");

    expect(chart.symbols.st?.text).toBe("Time: 10:30");
  });

  it("supports escaped line breaks", () => {
    const chart = chartOf("st=>start: first\\\nsecond\ne=>end: End\nst->e");

    expect(chart.symbols.st?.text).toBe("first\nsecond");
    expect(chart.symbols.st?.next?.key).toBe("e");
  });

  it("handles CRLF input and blank lines", () => {
    const chart = chartOf("\r\n\r\nst=>start: Start\r\ne=>end: End\r\n\r\nst->e\r\n");

    expect(chart.symbols.st?.text).toBe("Start");
    expect(chart.symbols.st?.next?.key).toBe("e");
  });

  it("supports escaped line breaks with CRLF input", () => {
    const chart = chartOf("st=>start: first\\\r\nsecond\r\ne=>end: End\r\nst->e");

    expect(chart.symbols.st?.text).toBe("first\nsecond");
    expect(chart.symbols.st?.next?.key).toBe("e");
  });

  it("normalizes lone carriage returns", () => {
    const chart = chartOf("st=>start: Start\re=>end: End\rst->e");

    expect(chart.symbols.st?.text).toBe("Start");
    expect(chart.symbols.st?.next?.key).toBe("e");
  });

  it("lets the last duplicate definition win", () => {
    const chart = chartOf("st=>start: First\nst=>start: Second\ne=>end: End\nst->e");

    expect(chart.symbols.st?.text).toBe("Second");
  });

  it("applies several line styles from one line", () => {
    const chart = chartOf(
      'st=>start: S\na=>operation: A\nb=>operation: B\nst->a->b\nst@>a({"stroke":"red"})@>b({"stroke":"blue"})',
    );

    expect(chart.symbols.st?.lineStyle.a).toStrictEqual({ stroke: "red" });
    expect(chart.symbols.a?.lineStyle.b).toStrictEqual({ stroke: "blue" });
  });

  it("keeps annotations from true/false branches", () => {
    const chart = chartOf(
      "st=>start: S\na=>operation: A\nb=>operation: B\ncond=>condition: C?\nst->cond\ncond(true@linear)->a\ncond(false@poly)->b",
    );

    expect(chart.symbols.cond?.yes?.key).toBe("a");
    expect(chart.symbols.cond?.no?.key).toBe("b");
    expect(chart.symbols.cond?.yes_annotation).toBe("linear");
    expect(chart.symbols.cond?.no_annotation).toBe("poly");
  });

  it("throws on malformed line-style JSON", () => {
    expect(() => parse("st=>start: S\ne=>end: E\nst->e\nst@>e({not json})")).toThrow(SyntaxError);
  });

  it("throws when a line style references an unknown node", () => {
    expect(() => parse('st=>start: S\nst@>missing({"stroke":"red"})')).toThrow(/Unknown symbol/u);
  });
});
