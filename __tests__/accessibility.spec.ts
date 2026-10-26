import { describe, expect, it } from "vitest";

import { parse } from "../src/index.js";

const draw = (options?: Record<string, unknown>): SVGSVGElement => {
  document.body.innerHTML = "";

  const container = document.createElement("div");

  document.body.append(container);

  const chart = parse("st=>start: S\ne=>end: E\nst->e");

  chart.draw(container, options);

  const svg = container.querySelector("svg");

  if (svg == null) throw new Error("Expected an svg element.");

  return svg;
};

const titleOf = (svg: SVGSVGElement): string => svg.firstElementChild?.textContent ?? "";

describe("accessibility", () => {
  it("marks the chart as an image with a default title", () => {
    const svg = draw();

    expect(svg.getAttribute("role")).toBe("img");
    expect(svg.firstElementChild?.tagName).toBe("title");
    expect(titleOf(svg)).toBe("Flowchart");
  });

  it("uses the label option as the accessible name", () => {
    expect(titleOf(draw({ label: "Login flow" }))).toBe("Login flow");
  });

  it("treats the label as text instead of markup", () => {
    const label = '<img src="x" onerror="alert(1)" />';
    const svg = draw({ label });

    expect(titleOf(svg)).toBe(label);
    expect(svg.querySelector("img")).toBeNull();
  });

  it("falls back to the default title for an undefined label", () => {
    expect(titleOf(draw({ label: undefined }))).toBe("Flowchart");
  });
});
