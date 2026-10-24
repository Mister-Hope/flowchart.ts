import { describe, expect, it, vi } from "vitest";

import { parse } from "../src/index.js";
import { CHART_FIXTURES } from "./fixtures/charts.js";

const byId = (id: string): HTMLElement | null => document.querySelector<HTMLElement>(`#${id}`);

const PARALLEL_BRANCH_DSL = CHART_FIXTURES["parallel-annotations"]?.dsl ?? "";

const viewBoxDimensions = (): number[] =>
  (document.querySelector("svg")?.getAttribute("viewBox") ?? "").split(" ").map(Number);

const createContainer = (id = "chart"): HTMLElement => {
  document.body.innerHTML = "";

  const container = document.createElement("div");

  container.id = id;
  document.body.append(container);

  return container;
};

const FLOWSTATE_CHART = "st=>start: Start|past\ne=>end: End\nst->e";
const LINK_CHART = "st=>start: Start:>https://example.com[blank]\ne=>end: End\nst->e";
const CALLBACK_CHART = "st=>start: Start:$flowchartClick\ne=>end: End\nst->e";
const LONG_TEXT_CHART = "st=>start: one two three four five\ne=>end: End\nst->e";

const basicChart = `\
st=>start: Start
op1=>operation: My Operation
cond=>condition: Yes or No?
io=>inputoutput: Catch something
sub1=>subroutine: Subroutine
e=>end: End

st->op1->cond
cond(yes)->io->e
cond(no)->sub1->e
`;

describe("draw: svg structure", () => {
  it("creates an svg with all node shapes and texts", () => {
    parse(basicChart).draw(createContainer());

    expect(document.querySelector("svg")).not.toBeNull();
    expect(byId("st")?.tagName.toLowerCase()).toBe("rect");
    expect(byId("op1")?.tagName.toLowerCase()).toBe("rect");
    expect(byId("cond")?.tagName.toLowerCase()).toBe("path");
    expect(byId("io")?.tagName.toLowerCase()).toBe("path");
    expect(byId("sub1")?.tagName.toLowerCase()).toBe("rect");
    expect(byId("sub1i")?.tagName.toLowerCase()).toBe("rect");
    expect(byId("e")?.tagName.toLowerCase()).toBe("rect");
  });

  it("renders node texts with the flowchart classes", () => {
    parse(basicChart).draw(createContainer());

    expect(byId("stt")?.textContent).toBe("Start");
    expect(byId("op1t")?.textContent).toBe("My Operation");
    expect(byId("st")?.getAttribute("class")).toBe("flowchart");
    expect(byId("stt")?.getAttribute("class")).toBe("flowchartt");
  });

  it("rounds start and end nodes", () => {
    parse(basicChart).draw(createContainer());

    expect(byId("st")?.getAttribute("rx")).toBe("20");
    expect(byId("e")?.getAttribute("ry")).toBe("20");
  });

  it("adds an outer wrapper box to subroutines", () => {
    parse(basicChart).draw(createContainer());

    expect(byId("sub1")?.getAttribute("width")).not.toBe(byId("sub1i")?.getAttribute("width"));
  });

  it("sizes the canvas from the rendered content", () => {
    parse(basicChart).draw(createContainer());

    const svg = document.querySelector("svg");

    expect(Number(svg?.getAttribute("width"))).toBeGreaterThan(0);
    expect(Number(svg?.getAttribute("height"))).toBeGreaterThan(0);
    expect(svg?.getAttribute("viewBox")).toMatch(/^0 0 \d/u);
    expect(svg?.getAttribute("preserveAspectRatio")).toBe("xMidYMid meet");
  });
});

describe("draw: options", () => {
  it("applies global styles", () => {
    parse(basicChart).draw(createContainer(), {
      "element-color": "red",
      "line-color": "blue",
      "line-width": 1,
      fill: "#eeeeee",
      "font-color": "green",
      "font-size": 20,
      class: "custom",
    });

    expect(byId("op1")?.getAttribute("stroke")).toBe("red");
    expect(byId("op1")?.getAttribute("fill")).toBe("#eeeeee");
    expect(byId("op1")?.getAttribute("class")).toBe("custom");
    expect(byId("op1t")?.getAttribute("fill")).toBe("green");
    expect(byId("op1t")?.getAttribute("font-size")).toBe("20px");
  });

  it("applies per-symbol styles", () => {
    parse(basicChart).draw(createContainer(), {
      symbols: { operation: { fill: "yellow" } },
    });

    expect(byId("op1")?.getAttribute("fill")).toBe("yellow");
    expect(byId("st")?.getAttribute("fill")).toBe("white");
  });

  it("applies flowstate styles", () => {
    parse(FLOWSTATE_CHART).draw(createContainer(), {
      flowstate: { past: { fill: "#cccccc" } },
    });

    expect(byId("st")?.getAttribute("fill")).toBe("#cccccc");
  });

  it("does not mutate the caller options object", () => {
    const options = { flowstate: { past: { fill: "red" } } };
    const chart = parse(FLOWSTATE_CHART);

    chart.draw(createContainer(), options);
    chart.draw(createContainer("chart2"), {});

    expect(byId("st")?.getAttribute("fill")).toBe("white");
    expect(options).toStrictEqual({ flowstate: { past: { fill: "red" } } });
  });

  it("scales the canvas", () => {
    parse(basicChart).draw(createContainer(), { scale: 2 });

    const svg = document.querySelector("svg");
    const viewBox = viewBoxDimensions();

    expect(Number(svg?.getAttribute("width")) / viewBox[2]).toBeCloseTo(2);
    expect(Number(svg?.getAttribute("height")) / viewBox[3]).toBeCloseTo(2);
  });

  it("exposes the merged options", () => {
    const chart = parse(basicChart);

    chart.draw(createContainer(), { scale: 2, "line-width": 4 });

    expect(chart.options()).toMatchObject({ scale: 2, "line-width": 4, fill: "white" });
  });
});

describe("draw: links, callbacks and labels", () => {
  it("wraps linked nodes in anchors", () => {
    parse(LINK_CHART).draw(createContainer());

    const anchor = byId("st")?.closest("a");

    expect(anchor?.getAttribute("href")).toBe("https://example.com");
    expect(anchor?.getAttribute("target")).toBe("_blank");
    expect(anchor?.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("calls node functions on click", () => {
    const handler = vi.fn<(event: Event) => void>();

    (globalThis as Record<string, unknown>).flowchartClick = handler;

    parse(CALLBACK_CHART).draw(createContainer());
    byId("stt")?.dispatchEvent(new Event("click"));

    expect(handler).toHaveBeenCalledTimes(1);
    delete (globalThis as Record<string, unknown>).flowchartClick;
  });

  it("renders condition labels", () => {
    parse(
      "st=>start: Start\na=>operation: A\nb=>operation: B\ncond=>condition: C?\nst->cond\ncond(yes)->a\ncond(no)->b",
    ).draw(createContainer());

    const labels = [...document.querySelectorAll("text")].map((text) => text.textContent);

    expect(labels).toContain("yes");
    expect(labels).toContain("no");
  });

  it("applies arrow markers to connection lines", () => {
    parse(basicChart).draw(createContainer());

    const lineWithArrow = document.querySelector("path[marker-end]");

    expect(lineWithArrow).not.toBeNull();
    expect(document.querySelector("defs marker")).not.toBeNull();
  });

  it("applies line styles", () => {
    parse(
      'st=>start: Start\nop=>operation: Op\nst->op\nst@>op({"stroke":"red","stroke-width":6})',
    ).draw(createContainer());

    const styles = [...document.querySelectorAll("path[marker-end]")].map(
      (path) => `${path.getAttribute("stroke")}|${path.getAttribute("stroke-width")}`,
    );

    expect(styles).toContain("red|6");
  });

  it("wraps long text when maxWidth is set", () => {
    parse(LONG_TEXT_CHART).draw(createContainer(), { maxWidth: 40 });

    const tspans = document.querySelectorAll("#stt tspan");

    expect(tspans.length).toBeGreaterThan(1);
  });
});

describe("draw: lifecycle", () => {
  it("replaces the previous diagram when drawn twice", () => {
    const chart = parse(basicChart);

    chart.draw(createContainer("first"));
    chart.draw(createContainer("second"));

    expect(document.querySelectorAll("svg")).toHaveLength(1);
  });

  it("accepts a container id", () => {
    const container = createContainer("by-id");

    parse(basicChart).draw(container.id);

    expect(document.querySelector("#by-id svg")).not.toBeNull();
  });

  it("accepts container ids that need CSS escaping", () => {
    const container = createContainer("chart:1");

    parse(basicChart).draw(container.id);

    expect(document.querySelector(String.raw`#chart\:1 svg`)).not.toBeNull();
  });

  it("cleans the diagram", () => {
    const chart = parse(basicChart);

    chart.draw(createContainer());
    chart.clean();

    expect(document.querySelectorAll("svg")).toHaveLength(0);
  });

  it("does not draw anything for an empty chart", () => {
    expect(() => parse("").draw(createContainer())).not.toThrow();
    expect(document.querySelector("svg")).toBeNull();
  });

  it("positions nodes without overlapping", () => {
    parse(basicChart).draw(createContainer());

    const st = byId("st")?.getBoundingClientRect();
    const op1 = byId("op1")?.getBoundingClientRect();

    expect(st).toBeDefined();
    expect(op1).toBeDefined();
    expect(st!.bottom).toBeLessThanOrEqual(op1!.top + 1);
  });
});

describe("draw: behaviour fixes over the original renderer", () => {
  it("lets user options override package defaults", () => {
    parse(basicChart).draw(createContainer(), { "line-width": 6, scale: 0.5 });

    const svg = document.querySelector("svg");
    const viewBox = viewBoxDimensions();

    expect(Number(svg?.getAttribute("width")) / viewBox[2]).toBeCloseTo(0.5);
    expect(byId("st")?.getAttribute("stroke-width")).toBe("6");
  });

  it("renders parallel branches that specify explicit directions", () => {
    parse(PARALLEL_BRANCH_DSL).draw(createContainer());

    const labels = [...document.querySelectorAll("text")].map((text) => text.textContent);

    expect(labels).toContain("one");
    expect(labels).toContain("two");
    expect(labels).toContain("three");
    expect(document.querySelectorAll("path[marker-end]").length).toBeGreaterThanOrEqual(6);
  });
});
