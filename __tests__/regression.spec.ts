import { describe, expect, it } from "vitest";

import { parse } from "../src/index.js";
import { EXAMPLES } from "./fixtures/charts.js";

const README_EXAMPLE = EXAMPLES.readme;
const FLOWSTATE_EXAMPLE = EXAMPLES.flowstatesAndDirections;

const byId = (id: string): Element | null => document.querySelector(`#${id}`);

const createContainer = (): HTMLElement => {
  document.body.innerHTML = "";

  const div = document.createElement("div");

  div.id = "diagram";
  document.body.append(div);

  return div;
};

const findInvalidAttributes = (root: ParentNode): string[] =>
  [...root.querySelectorAll("*")].flatMap((element) =>
    [...element.attributes]
      .filter((attribute) => /NaN|undefined|Infinity/u.test(attribute.value))
      .map((attribute) => `${element.tagName.toLowerCase()}[${attribute.name}]=${attribute.value}`),
  );

describe("regression: bundled examples", () => {
  it.each(Object.entries(EXAMPLES))(
    "renders the %s example without invalid geometry",
    (_name, dsl) => {
      const chart = parse(dsl);

      expect(() => chart.draw(createContainer())).not.toThrow();
      expect(document.querySelector("svg")).not.toBeNull();
      expect(findInvalidAttributes(document)).toStrictEqual([]);
    },
  );

  it("renders every defined symbol of the readme example", () => {
    const chart = parse(README_EXAMPLE);

    chart.draw(createContainer());

    const missing = Object.keys(chart.symbols).filter((key) => byId(key) == null);

    expect(missing).toStrictEqual([]);
  });

  it("draws connection lines for all connections", () => {
    const chart = parse(README_EXAMPLE);

    chart.draw(createContainer());

    // 8 connections in the readme example
    expect(document.querySelectorAll("path[marker-end]")).toHaveLength(8);
  });

  it("keeps the rendered chart readable after a re-draw with other options", () => {
    const chart = parse(FLOWSTATE_EXAMPLE);

    chart.draw(createContainer(), { "line-width": 1 });
    chart.draw(createContainer(), { "line-width": 5, scale: 2 });

    expect(document.querySelectorAll("svg")).toHaveLength(1);
    expect(findInvalidAttributes(document)).toStrictEqual([]);
  });
});
