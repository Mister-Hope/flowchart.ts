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

// Simulates a browser: connected text documents report a size derived from their content. Elements
// without layout (detached, or lingering in an unconnected fragment) report zero.
const mockGetBBox = function (this: SVGGraphicsElement): MockBBox {
  if (!this.isConnected) return { x: 0, y: 0, width: 0, height: 0 };

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

const DSL = "st=>start: Start\ne=>end: End\nst->e";

const render = (container: HTMLElement): HTMLElement => {
  parse(DSL).draw(container);

  return container;
};

describe("layout: detached containers", () => {
  it("measures detached containers in a temporary host instead of using estimates", () => {
    const restore = installMockedBBox();

    try {
      document.body.innerHTML = "";

      const attached = document.createElement("div");

      attached.id = "attached";
      document.body.append(attached);
      render(attached);

      const detached = document.createElement("div");

      render(detached);

      // The mocked native metric for "Start" is 5 * 14 * 0.6 = 42, plus 2 * text-margin.
      expect(attached.querySelector("#st")?.getAttribute("width")).toBe("62");
      expect(detached.querySelector("#st")?.getAttribute("width")).toBe("62");

      // The temporary host must not leak into the document.
      expect(document.querySelectorAll("[data-flowchart-measure]")).toHaveLength(0);
      expect(document.body.children).toHaveLength(1);
      expect(detached.querySelector("svg")).not.toBeNull();

      // Appending the container later must not change the already measured layout.
      document.body.append(detached);
      expect(detached.querySelector("#st")?.getAttribute("width")).toBe("62");
    } finally {
      restore();
    }
  });

  it("keeps the normal connected-container path unchanged", () => {
    const restore = installMockedBBox();

    try {
      document.body.innerHTML = "";

      const container = document.createElement("div");

      container.id = "chart";
      document.body.append(container);
      render(container);

      expect(document.querySelectorAll("[data-flowchart-measure]")).toHaveLength(0);
      expect(container.querySelector("#st")?.getAttribute("width")).toBe("62");
    } finally {
      restore();
    }
  });
});
