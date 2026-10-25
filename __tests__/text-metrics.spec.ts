import { describe, expect, it, vi } from "vitest";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

const restoreGetBBox = (): void => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
};

const appendTextNode = (): SVGTextElement => {
  const svg = document.createElementNS(SVG_NAMESPACE, "svg");
  const text = document.createElementNS(SVG_NAMESPACE, "text");

  svg.append(text);
  document.body.append(svg);

  return text;
};

describe("text metrics: environment fallbacks", () => {
  it("reports no native measurement without a document", async () => {
    vi.resetModules();
    vi.stubGlobal("document", undefined);

    const { supportsNativeBBox } = await import("../src/render/text-metrics.js");

    expect(supportsNativeBBox()).toBe(false);

    restoreGetBBox();
  });

  it("falls back when getBBox throws", async () => {
    vi.resetModules();
    vi.spyOn(SVGGraphicsElement.prototype, "getBBox").mockImplementation(() => {
      throw new Error("getBBox is not implemented");
    });

    const { supportsNativeBBox } = await import("../src/render/text-metrics.js");

    expect(supportsNativeBBox()).toBe(false);

    restoreGetBBox();
  });

  it("ignores non-finite measurements after detection", async () => {
    vi.resetModules();

    const getBBox = vi.spyOn(SVGGraphicsElement.prototype, "getBBox");

    getBBox.mockReturnValue({ x: 0, y: 0, width: 5, height: 5 } as DOMRect);

    const { measureNativeBBox, supportsNativeBBox } = await import("../src/render/text-metrics.js");
    const text = appendTextNode();

    expect(supportsNativeBBox()).toBe(true);

    getBBox.mockReturnValue({ x: 0, y: 0, width: Number.NaN, height: 1 } as DOMRect);
    expect(measureNativeBBox(text)).toBeNull();

    restoreGetBBox();
  });

  it("falls back when a measurement throws after detection", async () => {
    vi.resetModules();

    const getBBox = vi.spyOn(SVGGraphicsElement.prototype, "getBBox");

    getBBox.mockReturnValue({ x: 0, y: 0, width: 5, height: 5 } as DOMRect);

    const { measureNativeBBox, supportsNativeBBox } = await import("../src/render/text-metrics.js");
    const text = appendTextNode();

    expect(supportsNativeBBox()).toBe(true);

    getBBox.mockImplementation(() => {
      throw new Error("getBBox failed");
    });
    expect(measureNativeBBox(text)).toBeNull();

    restoreGetBBox();
  });
});
