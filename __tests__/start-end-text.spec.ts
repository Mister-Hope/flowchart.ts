import { describe, expect, it } from "vitest";

import { parse } from "../src/index.js";

const draw = (dsl: string): void => {
  document.body.innerHTML = "";

  const container = document.createElement("div");

  container.id = "diagram";
  document.body.append(container);

  parse(dsl).draw(container);
};

const labelOf = (key: string): string | null | undefined =>
  document.querySelector(`#${key}t`)?.textContent;

const sizeOf = (key: string): { width: number; height: number } => {
  const node = document.querySelector(`#${key}`);

  return {
    width: Number(node?.getAttribute("width")),
    height: Number(node?.getAttribute("height")),
  };
};

describe("render: start / end default text", () => {
  it("falls back to the default text when no text is defined", () => {
    draw("st=>start\ne=>end\nst->e");

    expect(labelOf("st")).toBe("Start");
    expect(labelOf("e")).toBe("End");
    expect(sizeOf("st").width).toBeGreaterThan(20);
    expect(sizeOf("e").width).toBeGreaterThan(20);
  });

  it("keeps the default text on link-only start / end nodes", () => {
    draw("st=>start:>https://example.com\ne=>end:>https://example.com\nst->e");

    expect(labelOf("st")).toBe("Start");
    expect(labelOf("e")).toBe("End");
    expect(document.querySelector("a")?.getAttribute("href")).toBe("https://example.com");
  });

  it("also falls back when the text is explicitly empty", () => {
    // `: :>` splits into an empty label plus a link, which the original renderer treated as unset.
    draw("st=>start: :>https://example.com\ne=>end: :>https://example.com\nst->e");

    expect(labelOf("st")).toBe("Start");
    expect(labelOf("e")).toBe("End");
    expect(document.querySelector("a")?.getAttribute("href")).toBe("https://example.com");
  });

  it("still renders an empty box for node types without a default text", () => {
    // `operation` has no default text, so it keeps the zero-size text path.
    draw("st=>start: Start\nop=>operation\ne=>end: End\nst->op->e");

    expect(labelOf("op")).toBe("");
    expect(sizeOf("op")).toStrictEqual({ width: 20, height: 20 });
  });

  it("does not override explicit start / end text", () => {
    draw("st=>start: Begin\ne=>end: Finish\nst->e");

    expect(labelOf("st")).toBe("Begin");
    expect(labelOf("e")).toBe("Finish");
  });
});
