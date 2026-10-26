import { describe, expect, it } from "vitest";

import { parse } from "../src/index.js";

const drawWith = (options: Record<string, unknown>): void => {
  document.body.innerHTML = "";

  const container = document.createElement("div");

  document.body.append(container);

  parse("st=>start: S\ne=>end: E\nst->e").draw(container, options);
};

describe("draw options: numeric validation", () => {
  it("rejects a non-positive or non-finite scale", () => {
    for (const scale of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => drawWith({ scale })).toThrow(RangeError);
      expect(() => drawWith({ scale })).toThrow('Invalid "scale" draw option');
    }
  });

  it("rejects negative line sizes and margins", () => {
    expect(() => drawWith({ "line-width": -1 })).toThrow('Invalid "line-width" draw option');
    expect(() => drawWith({ "line-length": -1 })).toThrow('Invalid "line-length" draw option');
    expect(() => drawWith({ "text-margin": -1 })).toThrow('Invalid "text-margin" draw option');
  });

  it("accepts zero line sizes and margins", () => {
    for (const options of [{ "line-width": 0 }, { "line-length": 0 }, { "text-margin": 0 }])
      expect(() => drawWith(options)).not.toThrow();
  });
});
