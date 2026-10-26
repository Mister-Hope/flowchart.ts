import { describe, expect, it, vi } from "vitest";

import { FlowchartSecurityError, parse } from "../src/index.js";
import type { Chart } from "../src/index.js";
import {
  isSafeDomId,
  sanitizeLineStyle,
  toSafeLink,
  validateLink,
  validateTarget,
} from "../src/security.js";

const JAVASCRIPT_SCHEME = ["java", "script", ":"].join("");
const MIXED_CASE_JAVASCRIPT_SCHEME = ["JaVaScRiPt", ":"].join("");

const unsafeLink = (body: string): string => [JAVASCRIPT_SCHEME, body].join("");

const createContainer = (): HTMLElement => {
  document.body.innerHTML = "";

  const container = document.createElement("div");

  container.id = "chart";
  document.body.append(container);

  return container;
};

const render = (
  dsl: string,
  options?: Parameters<Chart["draw"]>[1],
): { chart: Chart; container: HTMLElement } => {
  const container = createContainer();
  const chart = parse(dsl);

  chart.draw(container, options);

  return { chart, container };
};

const parseChart = (dsl: string): Chart => parse(dsl);

const linkDsl = (link: string): string => `st=>start: Start:>${link}\ne=>end: End\nst->e`;

const styleDsl = (style: string): string =>
  `st=>start: Start\nop=>operation: Op\nst->op\nst@>op(${style})`;

describe("security: link protocols", () => {
  it.each([
    "https://example.com",
    "http://example.com/a?b=1#c",
    "mailto:someone@example.com",
    "tel:+123456789",
    "/relative/path",
    "./relative/path",
    "../relative/path",
    "#anchor",
    "?query=1",
    "//example.com/protocol-relative",
  ])("accepts %s", (link) => {
    expect(validateLink(link)).toBe(link);
  });

  it.each([
    unsafeLink("alert(1)"),
    `${MIXED_CASE_JAVASCRIPT_SCHEME}alert(1)`,
    "vbscript:msgbox(1)",
    "data:text/html,<script>alert(1)</script>",
    "data:image/svg+xml,<svg onload=alert(1)>",
    "file:///etc/passwd",
    "blob:https://example.com/1234",
    "about:blank",
    "unknown-scheme:value",
  ])("rejects %s", (link) => {
    expect(() => validateLink(link)).toThrow(FlowchartSecurityError);
    expect(toSafeLink(link)).toBeNull();
  });

  it("rejects schemes obfuscated with control characters", () => {
    expect(() => validateLink(`java\nscript:alert(1)`)).toThrow(/Unsafe link protocol/u);
    expect(() => validateLink(`\u0000javascript:alert(1)`)).toThrow(/Unsafe link protocol/u);
    expect(() => validateLink(`  ${JAVASCRIPT_SCHEME}alert(1)`)).toThrow(/Unsafe link protocol/u);
  });

  it("rejects links above the length limit", () => {
    expect(() => validateLink(`https://example.com/${"a".repeat(5000)}`)).toThrow(
      /character limit/u,
    );
  });

  it("maps empty links to null", () => {
    expect(validateLink("")).toBeNull();
    expect(validateLink("   ")).toBeNull();
  });

  it("rejects unsafe protocols at parse time with the node name in the message", () => {
    expect(() => parseChart(linkDsl(unsafeLink("alert(1)")))).toThrow(
      /Unsafe link protocol "javascript:" for node "st"/u,
    );
  });

  it("renders safe links and keeps blank targets with noopener", () => {
    const { container } = render(
      "st=>start: Start:>https://example.com[blank]\ne=>end: End\nst->e",
    );

    const anchor = container.querySelector("a");

    expect(anchor?.getAttribute("href")).toBe("https://example.com");
    expect(anchor?.getAttribute("target")).toBe("_blank");
    expect(anchor?.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("keeps IPv6 URLs intact instead of treating the address as a target", () => {
    const chart = parseChart(linkDsl("http://[::1]:8080/x"));

    expect(chart.symbols.st?.link).toBe("http://[::1]:8080/x");
    expect(chart.symbols.st?.target).toBeNull();
  });

  it("drops unsafe links injected after parsing", () => {
    const { chart } = render("st=>start: Start\ne=>end: End\nst->e");

    Object.assign(chart.symbols.st, { link: unsafeLink("alert(1)") });

    chart.draw(createContainer());

    expect(document.querySelector("#chart a")).toBeNull();
  });

  it("rejects targets with unsupported characters", () => {
    expect(() => validateTarget("bad target")).toThrow(FlowchartSecurityError);
    expect(() => parseChart(linkDsl("https://example.com[bad target]"))).toThrow(
      FlowchartSecurityError,
    );
  });

  it("drops unsafe targets injected after parsing", () => {
    const { chart } = render(linkDsl("https://example.com"));

    chart.symbols.st.target = "bad target";

    chart.draw(createContainer());

    const anchor = document.querySelector("#chart a");

    expect(anchor?.getAttribute("href")).toBe("https://example.com");
    expect(anchor?.hasAttribute("target")).toBe(false);
  });
});

describe("security: line styles", () => {
  it("keeps safe presentation attributes", () => {
    const { container } = render(
      styleDsl(
        '{"stroke":"red","stroke-width":6,"stroke-dasharray":"4 2","opacity":0.5,"arrow-end":"classic-wide-long"}',
      ),
    );

    const line = container.querySelector("path[marker-end]");

    expect(line?.getAttribute("stroke")).toBe("red");
    expect(line?.getAttribute("stroke-width")).toBe("6");
    expect(line?.getAttribute("stroke-dasharray")).toBe("4 2");
    expect(line?.getAttribute("opacity")).toBe("0.5");
  });

  it("ignores unknown but harmless attributes", () => {
    const { container } = render(styleDsl('{"data-custom":"yes","stroke":"red"}'));

    const line = container.querySelector<SVGPathElement>("path[stroke='red']");

    expect(line).not.toBeNull();
    expect(line?.dataset.custom).toBeUndefined();
  });

  it.each([
    '{"onclick":"x"}',
    '{"onmouseover":"x"}',
    '{"onbegin":"x"}',
    '{"href":"x"}',
    '{"xlink:href":"x"}',
    '{"style":"cursor:pointer"}',
    '{"filter":"x"}',
    '{"clip-path":"x"}',
    '{"mask":"x"}',
    '{"marker-end":"x"}',
    '{"path":"M0,0L10,10"}',
    '{"d":"M0,0L10,10"}',
    '{"transform":"x"}',
    '{"id":"clobber"}',
    '{"class":"page-class"}',
    '{"begin":"0s"}',
    '{"values":"a;b"}',
    '{"target":"_blank"}',
    '{"rel":"opener"}',
  ])("rejects unsafe attribute %s", (style) => {
    expect(() => parseChart(styleDsl(style))).toThrow(FlowchartSecurityError);
  });

  it.each([
    { fill: "url(http://example.com/paint.svg#x)" },
    { stroke: `url(${unsafeLink("alert(1)")})` },
    { fill: unsafeLink("alert(1)") },
    { cursor: "url(http://example.com/cursor.cur), pointer" },
    { "stroke-width": true },
    { "stroke-width": null },
    { "stroke-width": { nested: 1 } },
    { "stroke-dasharray": ["1", "2"] },
  ])("rejects unsafe value %o", (style) => {
    expect(() => sanitizeLineStyle(style)).toThrow(FlowchartSecurityError);
  });

  it("rejects values with control characters and oversized values", () => {
    expect(() => parseChart(styleDsl(String.raw`{"stroke":"red\u0000"}`))).toThrow(
      FlowchartSecurityError,
    );
    expect(() => parseChart(styleDsl(`{"font-family":"${"a".repeat(2000)}"}`))).toThrow(
      FlowchartSecurityError,
    );
  });

  it("sanitizes line styles injected after parsing", () => {
    const { chart } = render("st=>start: Start\nop=>operation: Op\nst->op");
    const symbol = chart.symbols.st;

    symbol.lineStyle.op = {
      onclick: "alert(1)",
      stroke: "red",
    };

    chart.draw(createContainer());

    const line = document.querySelector("#chart path[marker-end]");

    expect(line?.hasAttribute("onclick")).toBe(false);
    expect(line?.getAttribute("style")).toBeNull();
    // The whole style object is rejected, so the unsafe stroke is not applied either.
    expect(line?.getAttribute("stroke")).toBe("black");
  });

  it("sanitizes style values injected after parsing", () => {
    const { chart } = render("st=>start: Start\nop=>operation: Op\nst->op");
    const symbol = chart.symbols.st;

    symbol.lineStyle.op = { fill: "url(http://example.com/x.svg#p)" };

    chart.draw(createContainer());

    const line = document.querySelector("#chart path[marker-end]");

    expect(line?.getAttribute("fill")).toBe("none");
  });

  it("exposes sanitizeLineStyle for direct use", () => {
    expect(sanitizeLineStyle({ stroke: "red", "data-x": 1 })).toStrictEqual({ stroke: "red" });
    expect(sanitizeLineStyle({ fill: "url(#gradient)" })).toStrictEqual({
      fill: "url(#gradient)",
    });
    expect(() => sanitizeLineStyle(null)).toThrow(FlowchartSecurityError);
    expect(() => sanitizeLineStyle([])).toThrow(FlowchartSecurityError);
  });

  it("never writes inline event handlers or style attributes from the renderer", () => {
    render("st=>start: Start\ne=>end: End\nst->e");

    expect(document.querySelectorAll("#chart [onclick]")).toHaveLength(0);
    expect(
      document.querySelectorAll("#chart path[style], #chart rect[style], #chart text[style]"),
    ).toHaveLength(0);
  });

  it("blocks event and style attributes at the renderer primitive", () => {
    const { chart } = render("st=>start: Start\ne=>end: End\nst->e");
    const symbol = chart.diagram?.symbols.find((item) => item.key === "st");

    symbol?.text.setAttr("onclick", "window.__x=1");
    symbol?.text.setAttr("style", "cursor:pointer");

    expect(symbol?.text.node.getAttribute("onclick")).toBeNull();
    expect(symbol?.text.node.getAttribute("style")).toBeNull();
  });
});

describe("security: callbacks", () => {
  it("uses a registered callback", () => {
    const handler = vi.fn<(event: Event) => void>();
    const { container } = render("st=>start: Start:$flowchartClick\ne=>end: End\nst->e", {
      callbacks: { flowchartClick: handler },
    });

    container.querySelector("#stt")?.dispatchEvent(new Event("click"));

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("falls back to a global function for backwards compatibility", () => {
    const handler = vi.fn<(event: Event) => void>();

    (globalThis as Record<string, unknown>).flowchartClick = handler;

    try {
      const { container } = render("st=>start: Start:$flowchartClick\ne=>end: End\nst->e");

      container.querySelector("#stt")?.dispatchEvent(new Event("click"));

      expect(handler).toHaveBeenCalledTimes(1);
    } finally {
      delete (globalThis as Record<string, unknown>).flowchartClick;
    }
  });

  it("ignores non-function globals instead of throwing", () => {
    (globalThis as Record<string, unknown>).flowchartClick = "not a function";

    try {
      const { container } = render("st=>start: Start:$flowchartClick\ne=>end: End\nst->e");

      expect(() =>
        container.querySelector("#stt")?.dispatchEvent(new Event("click")),
      ).not.toThrow();
    } finally {
      delete (globalThis as Record<string, unknown>).flowchartClick;
    }
  });
});

describe("security: DOM ids", () => {
  it("accepts simple ids and rejects selector-breaking/oversized ids", () => {
    expect(isSafeDomId("st")).toBe(true);
    expect(isSafeDomId("op-1")).toBe(true);
    expect(isSafeDomId("a.b")).toBe(false);
    expect(isSafeDomId("a b")).toBe(false);
    expect(isSafeDomId("a".repeat(200))).toBe(false);
  });

  it("does not write unsafe keys as DOM ids", () => {
    const chart = parseChart("st=>start: Start\na.b=>operation: Op\nst->a.b");

    chart.draw(createContainer());

    expect(chart.symbols["a.b"]).toBeDefined();
    expect(document.querySelectorAll("[id='a.b']")).toHaveLength(0);

    // Simple keys keep their ids.
    expect(document.querySelector("#st")).not.toBeNull();
  });
});

describe("security: target and style edge cases", () => {
  it("treats empty targets as unset", () => {
    expect(validateTarget("")).toBeNull();
    expect(validateTarget("   ")).toBeNull();
  });

  it("rejects overlong targets", () => {
    expect(() => validateTarget("a".repeat(500))).toThrow(FlowchartSecurityError);
  });

  it("rejects non-string and non-finite line style values", () => {
    expect(() => sanitizeLineStyle({ stroke: Number.POSITIVE_INFINITY })).toThrow(
      FlowchartSecurityError,
    );
    expect(() => sanitizeLineStyle({ stroke: true })).toThrow(FlowchartSecurityError);
    expect(() => sanitizeLineStyle({ stroke: "red\u0000" })).toThrow(FlowchartSecurityError);
  });
});
