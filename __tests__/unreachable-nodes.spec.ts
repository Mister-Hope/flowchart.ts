import { describe, expect, it, vi } from "vitest";

import { parse } from "../src/index.js";

const draw = (dsl: string): HTMLElement => {
  document.body.innerHTML = "";

  const container = document.createElement("div");

  document.body.append(container);
  parse(dsl).draw(container);

  return container;
};

describe("draw: unreachable nodes", () => {
  it("warns about defined nodes that cannot be reached from the start", () => {
    const warning = vi.spyOn(globalThis.console, "warn").mockImplementation(() => {});

    try {
      const container = draw(
        `st=>start: S
e=>end: E
loose=>operation: Loose
other=>operation: Other
st->e
loose->other`,
      );

      expect(warning).toHaveBeenCalledTimes(1);

      const message = String(warning.mock.calls[0]?.[0]);

      expect(message).toContain("2 node(s)");
      expect(message).toContain("loose");
      expect(message).toContain("other");
      expect(container.querySelectorAll("g")).toHaveLength(2);
    } finally {
      warning.mockRestore();
    }
  });

  it("does not warn when every node is reachable", () => {
    const warning = vi.spyOn(globalThis.console, "warn").mockImplementation(() => {});

    try {
      draw("st=>start: S\na=>operation: A\ne=>end: E\nst->a->e");

      expect(warning).not.toHaveBeenCalled();
    } finally {
      warning.mockRestore();
    }
  });
});
