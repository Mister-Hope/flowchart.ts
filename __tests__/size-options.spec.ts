import { describe, expect, it } from "vitest";

import { parse } from "../src/index.js";
import type { DrawOptions } from "../src/index.js";

const DSL = "st=>start: Start\nop=>operation: Op\ne=>end: End\nst->op->e";

const render = (options: DrawOptions = {}): { svg: SVGSVGElement; contentRatio: number } => {
  document.body.innerHTML = "";

  const container = document.createElement("div");

  container.id = "diagram";
  document.body.append(container);

  parse(DSL).draw(container, options);

  const svg = document.querySelector("svg");

  if (svg == null) throw new Error("No SVG was rendered.");

  const viewBox = (svg.getAttribute("viewBox") ?? "0 0 1 1").split(" ").map(Number);

  return { svg, contentRatio: (viewBox[3] ?? 1) / (viewBox[2] ?? 1) };
};

describe("layout: SVG outer sizing", () => {
  it("keeps the content size when no width/height is given", () => {
    const { svg } = render();

    expect(Number(svg.getAttribute("width"))).toBeGreaterThan(0);
    expect(svg.style.width).toBe("");
    expect(svg.style.height).toBe("");
  });

  it("scales into a numeric width and keeps the aspect ratio", () => {
    const { svg, contentRatio } = render({ width: 400 });

    expect(svg.style.width).toBe("400px");
    expect(Number(svg.style.height.replace("px", ""))).toBeCloseTo(400 * contentRatio, 3);
  });

  it("supports a responsive CSS width", () => {
    const { svg } = render({ width: "100%" });

    expect(svg.style.width).toBe("100%");
    expect(svg.style.height).toBe("auto");
  });

  it("derives the width from a numeric height", () => {
    const { svg, contentRatio } = render({ height: 200 });

    expect(svg.style.height).toBe("200px");
    expect(Number(svg.style.width.replace("px", ""))).toBeCloseTo(200 / contentRatio, 3);
  });

  it("applies both dimensions when given", () => {
    const { svg } = render({ width: 400, height: 200 });

    expect(svg.style.width).toBe("400px");
    expect(svg.style.height).toBe("200px");
  });

  it("lets explicit sizing win over scale", () => {
    const { svg } = render({ width: 400, scale: 2 });

    expect(svg.style.width).toBe("400px");
  });
});
