import { describe, expect, it } from "vitest";

import { parse } from "../src/index.js";
import { toNumber } from "../src/utils.js";

interface MockBBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

const originalGetBBox = (
  SVGGraphicsElement.prototype as SVGGraphicsElement & { getBBox?: () => MockBBox }
).getBBox;

// Simulates a browser: text elements report a size derived from their content, while elements in
// a `display: none` subtree (marked with `data-hidden`) report the all-zero box browsers return.
const mockGetBBox = function (this: SVGGraphicsElement): MockBBox {
  if (this.closest("[data-hidden]") != null) return { x: 0, y: 0, width: 0, height: 0 };

  if (this.tagName.toLowerCase() === "text") {
    const fontSize = toNumber(this.getAttribute("font-size"), 14);
    const text = this.textContent ?? "";

    return {
      x: 0,
      y: 0,
      width: Math.max(text.length, 1) * fontSize * 0.6,
      height: fontSize * 1.15,
    };
  }

  return { x: 0, y: 0, width: 10, height: 10 };
};

const installMockedBBox = (): (() => void) => {
  Object.defineProperty(SVGGraphicsElement.prototype, "getBBox", {
    configurable: true,
    value: mockGetBBox,
  });

  return () => {
    if (originalGetBBox == null) {
      Reflect.deleteProperty(SVGGraphicsElement.prototype, "getBBox");
    } else {
      Object.defineProperty(SVGGraphicsElement.prototype, "getBBox", {
        configurable: true,
        value: originalGetBBox,
      });
    }
  };
};

const render = (hidden: boolean): HTMLElement => {
  document.body.innerHTML = "";

  const container = document.createElement("div");

  container.id = hidden ? "hidden" : "chart";

  if (hidden) {
    container.dataset.hidden = "";
    container.style.display = "none";
  }

  document.body.append(container);

  parse("st=>start: Start\ne=>end: End\nst->e").draw(container);

  return container;
};

describe("layout: hidden containers", () => {
  it("falls back to estimated metrics when native measurement returns an all-zero box", () => {
    const restore = installMockedBBox();

    try {
      const container = render(true);
      const start = container.querySelector("#st");
      const width = Number(start?.getAttribute("width"));

      // Without the fix, every node collapses to the 2 * text-margin minimum (20px).
      expect(width).toBeGreaterThan(40);
      expect(container.querySelector("#stt")?.textContent).toBe("Start");
    } finally {
      restore();
    }
  });

  it("still uses native measurements for visible containers", () => {
    const restore = installMockedBBox();

    try {
      const container = render(false);
      const start = container.querySelector("#st");

      // The mock reports width = 5 * 14 * 0.6 = 42 for "Start", plus 2 * text-margin.
      expect(start?.getAttribute("width")).toBe("62");
    } finally {
      restore();
    }
  });
});
