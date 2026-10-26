import { describe, expect, it } from "vitest";

import { parse } from "../src/index.js";

const chain = (count: number): string => {
  const lines = ["st=>start: S"];

  for (let index = 0; index < count; index += 1) lines.push(`n${index}=>operation: ${index}`);

  lines.push(
    "e=>end: E",
    ["st", ...Array.from({ length: count }, (_, index) => `n${index}`), "e"].join("->"),
  );

  return lines.join("\n");
};

describe("layout: recursion safety", () => {
  it("renders cyclic definitions instead of recursing forever", () => {
    document.body.innerHTML = "";

    const container = document.createElement("div");

    document.body.append(container);

    const chart = parse("c1=>condition: A?\nc2=>condition: B?\nc1(yes)->c2\nc2(no)->c1");

    expect(() => chart.draw(container)).not.toThrow();
    expect(container.querySelectorAll("g")).toHaveLength(2);
    expect(container.querySelector("svg")).not.toBeNull();
  });

  // 12k nodes used to overflow the call stack; the test itself also needs a larger timeout.
  it(
    "renders very long plain chains without overflowing the call stack",
    { timeout: 30_000 },
    () => {
      document.body.innerHTML = "";

      const container = document.createElement("div");

      document.body.append(container);

      const chart = parse(chain(12_000));

      expect(() => chart.draw(container)).not.toThrow();
      expect(container.querySelector("svg")?.getAttribute("width")).toBeTruthy();
    },
  );
});
