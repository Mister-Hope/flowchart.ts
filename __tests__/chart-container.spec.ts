import { describe, expect, it } from "vitest";

import { parse } from "../src/index.js";

const drawInto = (container: HTMLElement, dsl: string): ReturnType<typeof parse> => {
  const chart = parse(dsl);

  chart.draw(container);

  return chart;
};

describe("draw: container reuse", () => {
  it("throws when the container already holds another chart", () => {
    document.body.innerHTML = "";

    const container = document.createElement("div");

    document.body.append(container);
    drawInto(container, "st=>start: First\ne=>end: End\nst->e");

    expect(() => drawInto(container, "st=>start: Second\ne=>end: End\nst->e")).toThrow(
      /already contains a flowchart/u,
    );

    expect(container.querySelectorAll("svg")).toHaveLength(1);
    expect(container.textContent).toContain("First");
  });

  it("allows the same chart to be drawn again", () => {
    document.body.innerHTML = "";

    const container = document.createElement("div");

    document.body.append(container);

    const chart = parse("st=>start: S\ne=>end: E\nst->e");

    chart.draw(container);
    chart.draw(container);

    expect(container.querySelectorAll("svg")).toHaveLength(1);
  });

  it("keeps charts in different containers", () => {
    document.body.innerHTML = "";

    const first = document.createElement("div");
    const second = document.createElement("div");

    document.body.append(first, second);
    drawInto(first, "st=>start: First\ne=>end: End\nst->e");
    drawInto(second, "st=>start: Second\ne=>end: End\nst->e");

    expect(document.querySelectorAll("svg")).toHaveLength(2);
    expect(first.textContent).toContain("First");
    expect(second.textContent).toContain("Second");
  });

  it("leaves unrelated children of the container alone", () => {
    document.body.innerHTML = "";

    const container = document.createElement("div");
    const label = document.createElement("p");

    label.textContent = "caption";
    container.append(label);
    document.body.append(container);
    drawInto(container, "st=>start: First\ne=>end: End\nst->e");

    expect(container.querySelectorAll("svg")).toHaveLength(1);
    expect(container.querySelector("p")).toBe(label);

    expect(() => drawInto(container, "st=>start: Second\ne=>end: End\nst->e")).toThrow(
      /already contains a flowchart/u,
    );

    expect(container.querySelector("p")).toBe(label);
  });
});
