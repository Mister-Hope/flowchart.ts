import { describe, expect, it } from "vitest";

import {
  MarkerRegistry,
  Paper,
  PathElement,
  RectElement,
  SetElement,
  SVG_NAMESPACE,
  TextElement,
} from "../src/render/index.js";
import type { PathSegment } from "../src/render/index.js";
import { measureNativeBBox, supportsNativeBBox } from "../src/render/text-metrics.js";

const createText = (text = "Hi", x = 10, y = 20): TextElement =>
  new TextElement(document.createElementNS(SVG_NAMESPACE, "text"), x, y, text);

const createPath = (
  segments: PathSegment[],
  attrs: Record<string, string | number> = {},
): PathElement => {
  const defs = document.createElementNS(SVG_NAMESPACE, "defs");
  const markers = new MarkerRegistry(defs, "test");
  const element = new PathElement(document.createElementNS(SVG_NAMESPACE, "path"), markers);

  element.setAttrs(attrs);
  element.setPath(segments);

  return element;
};

describe("render primitives: TextElement", () => {
  it("positions the box for every text anchor", () => {
    const text = createText("Hello", 100, 10);

    text.setAttr("text-anchor", "middle");
    const middle = text.getBBox().x;
    text.setAttr("text-anchor", "end");
    const end = text.getBBox().x;

    expect(middle).toBeLessThan(100);
    expect(end).toBeLessThan(middle);
  });

  it("applies font related attributes", () => {
    const text = createText();

    text.setAttr("font", "12px Arial");
    text.setAttr("font-style", "italic");
    text.setAttr("letter-spacing", 2);
    text.setAttr("font-size", 20);

    expect(text.node.style.font).toBe("12px Arial");
    expect(text.node.getAttribute("font-style")).toBe("italic");
    expect(text.node.getAttribute("letter-spacing")).toBe("2");
    expect(text.node.getAttribute("font-size")).toBe("20px");
  });

  it("keeps a zero size box for empty text", () => {
    const text = createText("");

    expect(text.getBBox().width).toBe(0);
  });

  it("treats non-string text values as empty", () => {
    const text = createText("Hello");

    text.setAttr("text", 42);

    expect(text.getBBox().width).toBe(0);
  });
});

describe("render primitives: PathElement", () => {
  it("applies path and marker attributes", () => {
    const path = createPath([], { stroke: "red", "stroke-width": 3 });

    path.setAttr("path", "M0,0L10,10");
    path.setAttr("arrow-end", "classic");
    path.setAttr("arrow-start", "classic");

    expect(path.getPath()).toHaveLength(2);
    expect(path.node.getAttribute("marker-end")).toContain("url(#");
    expect(path.node.getAttribute("marker-start")).toContain("url(#");

    path.setAttr("arrow-end", "none");
    expect(path.node.hasAttribute("marker-end")).toBe(false);
  });

  it("trims long segments for the arrow markers", () => {
    const path = createPath(
      [
        ["M", 0, 0],
        ["L", 100, 0],
      ],
      { "arrow-end": "classic", "stroke-width": 10 },
    );

    expect(path.node.getAttribute("d")).toContain("L85,0");
  });

  it("keeps segments that are shorter than the trim distance", () => {
    const path = createPath(
      [
        ["M", 0, 0],
        ["L", 1, 0],
      ],
      { "arrow-end": "classic", "arrow-start": "classic", "stroke-width": 10 },
    );

    expect(path.node.getAttribute("d")).toBe("M0,0L1,0");
  });

  it("keeps zero-length segments and single-segment paths", () => {
    const zero = createPath(
      [
        ["M", 5, 5],
        ["L", 5, 5],
      ],
      { "arrow-end": "classic", "stroke-width": 10 },
    );
    const single = createPath([["M", 0, 0]], { "arrow-end": "classic" });

    expect(zero.node.getAttribute("d")).toBe("M5,5L5,5");
    expect(single.node.getAttribute("d")).toBe("M0,0");
  });

  it("accepts every arrow token combination", () => {
    const path = createPath([], {});

    path.setAttr("arrow-end", "classic-narrow-short");
    expect(path.node.getAttribute("marker-end")).toContain("url(#");

    path.setAttr("arrow-end", "classic-bogus");
    expect(path.node.getAttribute("marker-end")).toContain("url(#");
  });

  it("parses commands without coordinates", () => {
    const path = createPath([]);

    path.setAttr("path", "M0,0L10,10Z");

    expect(path.getPath()).toHaveLength(3);
    expect(path.getPath()[2]?.[0]).toBe("Z");
  });

  it("measures the path box from its segments", () => {
    const path = createPath([
      ["M", 0, 0],
      ["L", 10, 20],
    ]);
    const empty = createPath([["M"]]);

    expect(path.getBBox()).toStrictEqual({ x: 0, y: 0, width: 10, height: 20 });
    expect(empty.getBBox()).toStrictEqual({ x: 0, y: 0, width: 0, height: 0 });
  });
});

describe("render primitives: Renderable links", () => {
  it("wraps the element in a link and manages the target", () => {
    const svg = document.createElementNS(SVG_NAMESPACE, "svg");
    const node = document.createElementNS(SVG_NAMESPACE, "rect");
    const rect = new RectElement(node, 0);

    svg.append(node);
    rect.setAttr("target", "blank");
    rect.setAttr("href", "https://example.com");

    expect(rect.domNode.tagName.toLowerCase()).toBe("a");
    expect(rect.domNode.getAttribute("href")).toBe("https://example.com");
    expect(rect.domNode.getAttribute("target")).toBe("_blank");
    expect(rect.domNode.getAttribute("rel")).toBe("noopener noreferrer");

    rect.setAttr("href", "https://example.com/2");
    expect(rect.domNode.getAttribute("href")).toBe("https://example.com/2");

    rect.setAttr("target", "_self");
    expect(rect.domNode.getAttribute("target")).toBe("_self");
    expect(rect.domNode.hasAttribute("rel")).toBe(false);
  });

  it("ignores unsafe links and elements without a parent", () => {
    const rect = new RectElement(document.createElementNS(SVG_NAMESPACE, "rect"), 0);

    const scheme = "javascript";

    rect.setAttr("href", `${scheme}:alert(1)`);
    expect(rect.domNode.tagName.toLowerCase()).toBe("rect");

    rect.setAttr("href", "https://example.com");
    expect(rect.domNode.tagName.toLowerCase()).toBe("rect");
  });

  it("reads attributes back and removes the element", () => {
    const node = document.createElementNS(SVG_NAMESPACE, "rect");
    const rect = new RectElement(node, 0);

    rect.setAttr("fill", "red");

    expect(rect.getAttr("fill")).toBe("red");

    document.body.append(node);
    rect.remove();
    expect(node.isConnected).toBe(false);
  });
});

describe("render primitives: SetElement", () => {
  it("groups children and unions their boxes", () => {
    const svg = document.createElementNS(SVG_NAMESPACE, "svg");
    const set = new SetElement(document);
    const first = new RectElement(document.createElementNS(SVG_NAMESPACE, "rect"), 0);
    const second = new RectElement(document.createElementNS(SVG_NAMESPACE, "rect"), 0);

    first.setAttrs({ x: 0, y: 0, width: 10, height: 10 });
    second.setAttrs({ x: 20, y: 20, width: 10, height: 10 });
    svg.append(set.node);

    set.push(first, second).push(first).transform("t5,5");

    expect(set.node.children).toHaveLength(2);
    expect(set.getBBox()).toStrictEqual({ x: 5, y: 5, width: 30, height: 30 });
  });

  it("returns a translated empty box and ignores unsupported transforms", () => {
    const set = new SetElement(document);

    set.transform("t7,9");
    expect(set.getBBox()).toStrictEqual({ x: 7, y: 9, width: 0, height: 0 });

    set.transform("scale(2)");
    expect(set.node.getAttribute("transform")).toBe("translate(7,9)");
  });
});

describe("render primitives: Paper", () => {
  it("throws when the container does not exist", () => {
    expect(() => new Paper("missing-container")).toThrow("Flowchart container not found");
  });

  it("keeps the canvas detached when the document has no body", () => {
    const doc = document.implementation.createHTMLDocument("no-body");

    doc.body.remove();

    const container = doc.createElement("div");
    const paper = new Paper(container);

    expect(paper.canvas.parentNode).toBe(container);
  });

  it("sizes the canvas and viewBox", () => {
    const container = document.createElement("div");

    document.body.append(container);

    const paper = new Paper(container);

    paper.setSize(100, 50);
    paper.setViewBox({ x: 1, y: 2, width: 100, height: 50 });

    expect(paper.canvas.getAttribute("width")).toBe("100");
    expect(paper.canvas.getAttribute("height")).toBe("50");
    expect(paper.canvas.getAttribute("viewBox")).toBe("1 2 100 50");
    expect(paper.canvas.getAttribute("preserveAspectRatio")).toBe("xMidYMid meet");
  });
});

describe("render primitives: markers", () => {
  it("treats the trailing `none` token as no marker", () => {
    const defs = document.createElementNS(SVG_NAMESPACE, "defs");
    const markers = new MarkerRegistry(defs, "test");

    expect(markers.getMarker("end", "classic-none", "black", 3)).toBeNull();
    expect(markers.getMarker("end", "none", "black", 3)).toBeNull();
    expect(markers.getMarker("end", "classic", "none", 3)).toBeNull();
  });
});

describe("render primitives: measurement", () => {
  it("falls back to estimated metrics in happy-dom", () => {
    expect(supportsNativeBBox()).toBe(false);
    expect(measureNativeBBox(document.createElementNS(SVG_NAMESPACE, "text"))).toBeNull();
  });
});
