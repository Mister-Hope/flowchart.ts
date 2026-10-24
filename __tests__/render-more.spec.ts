import { describe, expect, it, vi } from "vitest";

import { parse } from "../src/index.js";
import { CHART_FIXTURES } from "./fixtures/charts.js";

const byId = (id: string): HTMLElement | null => document.querySelector<HTMLElement>(`#${id}`);

const PARALLEL_PATH2_TOP_DSL = CHART_FIXTURES["parallel-path2-top"].dsl;
const PARALLEL_PATH3_BOTTOM_DSL = CHART_FIXTURES["parallel-path3-bottom"].dsl;

// Parses the point list of a `d` attribute into `[x, y]` pairs.
const pathPoints = (id: string): [number, number][] => {
  const d = document.querySelector(`#${id}`)?.getAttribute("d") ?? "";
  const values = [...d.matchAll(/-?\d+(?:\.\d+)?/gu)].map(([value]) => Number(value));
  const points: [number, number][] = [];

  for (let index = 0; index + 1 < values.length; index += 2)
    points.push([values[index] ?? 0, values[index + 1] ?? 0]);

  return points;
};

const trapezoidWidths = (id: string): { top: number; bottom: number } => {
  const points = pathPoints(id);

  return {
    top: (points[3]?.[0] ?? 0) - (points[4]?.[0] ?? 0),
    bottom: (points[2]?.[0] ?? 0) - (points[1]?.[0] ?? 0),
  };
};

const symbolCenterY = (chart: ReturnType<typeof parse>, key: string): number => {
  const symbols = chart.diagram?.symbols ?? [];

  return symbols.find((symbol) => symbol.key === key)?.getCenter().y ?? Number.NaN;
};

const render = (
  dsl: string,
  options: Parameters<ReturnType<typeof parse>["draw"]>[1] = {},
): ReturnType<typeof parse> => {
  document.body.innerHTML = "";

  const container = document.createElement("div");

  container.id = "chart";
  document.body.append(container);

  const chart = parse(dsl);

  chart.draw(container, options);

  return chart;
};

const invalidAttributes = (): string[] =>
  [...document.querySelectorAll("*")].flatMap((element) =>
    [...element.attributes]
      .filter((attribute) => /NaN|undefined|Infinity/u.test(attribute.value))
      .map((attribute) => `${element.tagName.toLowerCase()}[${attribute.name}]=${attribute.value}`),
  );

describe("render: fixture sanity", () => {
  it.each(Object.entries(CHART_FIXTURES))(
    "never emits invalid attribute values for %s",
    (_name, fixture) => {
      render(fixture.dsl, fixture.options);

      expect(invalidAttributes()).toStrictEqual([]);
      expect(document.querySelector("svg")).not.toBeNull();
    },
  );
});

describe("render: options and lifecycle", () => {
  it("returns an empty options object before the first draw", () => {
    expect(parse("st=>start: Start").options()).toStrictEqual({});
  });

  it("returns the merged options after drawing", () => {
    const chart = render("st=>start: Start\ne=>end: End\nst->e", {
      "line-width": 5,
      scale: 2,
    });

    expect(chart.options()).toMatchObject({
      "line-width": 5,
      scale: 2,
      fill: "white",
      class: "flowchart",
    });
  });

  it("keeps two charts independent on the same page", () => {
    document.body.innerHTML = "";

    const first = document.createElement("div");
    const second = document.createElement("div");

    first.id = "first";
    second.id = "second";
    document.body.append(first, second);

    const chartA = parse("a1=>start: A\na2=>end: A end\na1->a2");
    const chartB = parse("b1=>start: B\nb2=>end: B end\nb1->b2");

    chartA.draw(first);
    chartB.draw(second);

    expect(document.querySelectorAll("#first svg")).toHaveLength(1);
    expect(document.querySelectorAll("#second svg")).toHaveLength(1);
    expect(byId("a1")).not.toBeNull();
    expect(byId("b1")).not.toBeNull();
    expect(byId("a1")?.closest("svg")).toBe(document.querySelector("#first svg"));
  });

  it("gives each chart its own marker ids", () => {
    document.body.innerHTML = "";

    const first = document.createElement("div");
    const second = document.createElement("div");

    first.id = "first";
    second.id = "second";
    document.body.append(first, second);

    parse("a1=>start: A\na2=>end: A end\na1->a2").draw(first);
    parse("b1=>start: B\nb2=>end: B end\nb1->b2").draw(second);

    const firstMarkers = [...first.querySelectorAll("marker")].map((marker) => marker.id);
    const secondMarkers = [...second.querySelectorAll("marker")].map((marker) => marker.id);

    expect(firstMarkers.length).toBeGreaterThan(0);
    expect(secondMarkers.length).toBeGreaterThan(0);
    expect(firstMarkers.filter((id) => secondMarkers.includes(id))).toStrictEqual([]);
  });

  it("can draw, clean and draw again", () => {
    const chart = render("st=>start: Start\ne=>end: End\nst->e");

    chart.clean();
    expect(document.querySelector("svg")).toBeNull();

    chart.draw(document.querySelector<HTMLElement>("#chart")!);
    expect(document.querySelector("svg")).not.toBeNull();
  });

  it("supports drawing into a detached container", () => {
    const container = document.createElement("div");

    expect(() => parse("st=>start: Start\ne=>end: End\nst->e").draw(container)).not.toThrow();
    expect(container.querySelector("svg")).not.toBeNull();
  });
});

describe("render: nodes, links and callbacks", () => {
  it("wraps every linked node shape and text in anchors", () => {
    render("st=>start: Start:>https://example.com[blank]\ne=>end: End\nst->e");

    const shapeAnchor = byId("st")?.closest("a");
    const textAnchor = byId("stt")?.closest("a");

    expect(shapeAnchor?.getAttribute("href")).toBe("https://example.com");
    expect(shapeAnchor?.getAttribute("target")).toBe("_blank");
    expect(shapeAnchor?.getAttribute("rel")).toBe("noopener noreferrer");
    expect(textAnchor?.getAttribute("href")).toBe("https://example.com");
  });

  it("does not add target/rel for links without a target", () => {
    render("st=>start: Start:>https://example.com\ne=>end: End\nst->e");

    const anchor = byId("st")?.closest("a");

    expect(anchor?.getAttribute("href")).toBe("https://example.com");
    expect(anchor?.hasAttribute("target")).toBe(false);
    expect(anchor?.hasAttribute("rel")).toBe(false);
  });

  it("calls the click handler bound to a shape", () => {
    const handler = vi.fn<(event: Event) => void>();

    (globalThis as Record<string, unknown>).shapeClick = handler;

    render("st=>start: Start:$shapeClick\ne=>end: End\nst->e");
    byId("st")?.dispatchEvent(new Event("click"));

    expect(handler).toHaveBeenCalledTimes(1);
    delete (globalThis as Record<string, unknown>).shapeClick;
  });

  it("falls back to default styles for unknown flowstates", () => {
    render("st=>start: Start|unknown-state\ne=>end: End\nst->e", {
      flowstate: { past: { fill: "red" } },
    });

    expect(byId("st")?.getAttribute("fill")).toBe("white");
  });

  it("applies font shorthand and family overrides", () => {
    render("st=>start: Start\ne=>end: End\nst->e", {
      font: "italic 20px Georgia",
      "font-weight": "bold",
    });

    const text = byId("stt");

    expect(text?.style.font).toBe("italic 20px Georgia");
    expect(text?.getAttribute("font-weight")).toBe("bold");
  });
});

describe("render: connection details", () => {
  it("renders arrow text for connections", () => {
    render("st=>start: Start\na=>operation: A\ne=>end: End\nst->a->e", {
      "arrow-text": "next",
    });

    const texts = [...document.querySelectorAll("text")].map((text) => text.textContent);

    expect(texts).toContain("next");
  });

  it("supports arrow-start via line styles", () => {
    render(
      'st=>start: Start\na=>operation: A\ne=>end: End\nst->a->e\nst@>a({"arrow-start":"classic","stroke":"red"})',
    );

    const path = document.querySelector("path[marker-start]");

    expect(path).not.toBeNull();
    expect(path?.getAttribute("stroke")).toBe("red");
  });

  it("applies per-line arrow-end overrides", () => {
    render(
      'st=>start: Start\na=>operation: A\ne=>end: End\nst->a->e\nst@>a({"arrow-end":"classic-wide-long"})',
    );

    const markers = [...document.querySelectorAll("marker")].map(
      (marker) => `${marker.getAttribute("markerWidth")}x${marker.getAttribute("markerHeight")}`,
    );

    expect(markers).toContain("5x5");
  });

  it("draws a custom arrow text via node options", () => {
    render("st=>start: Start\na=>operation: A\ne=>end: End\nst->a->e", {
      "yes-text": "affirmative",
      "no-text": "negative",
    });

    const texts = [...document.querySelectorAll("text")].map((text) => text.textContent);

    expect(texts).not.toContain("affirmative");
    expect(texts).not.toContain("negative");
  });
});

describe("render: input / output nodes", () => {
  it("renders input as an inverted trapezoid and output as an upright trapezoid", () => {
    render(
      "st=>start: Start\nread=>input: Read\nwrite=>output: Write\ne=>end: End\nst->read->write->e",
    );

    const inputWidths = trapezoidWidths("read");
    const outputWidths = trapezoidWidths("write");

    expect(inputWidths.top).toBeGreaterThan(inputWidths.bottom);
    expect(inputWidths.top - inputWidths.bottom).toBeCloseTo(40);
    expect(outputWidths.top).toBeLessThan(outputWidths.bottom);
    expect(outputWidths.bottom - outputWidths.top).toBeCloseTo(40);
    expect(byId("read")?.closest("a")).toBeNull();
  });
});

describe("render: parallel directions", () => {
  it("honors an explicit top direction for path2", () => {
    const chart = render(PARALLEL_PATH2_TOP_DSL);

    expect(symbolCenterY(chart, "b")).toBeLessThan(symbolCenterY(chart, "para"));
  });

  it("honors an explicit bottom direction for path3", () => {
    const chart = render(PARALLEL_PATH3_BOTTOM_DSL);

    expect(symbolCenterY(chart, "c")).toBeGreaterThan(symbolCenterY(chart, "para"));
  });
});
