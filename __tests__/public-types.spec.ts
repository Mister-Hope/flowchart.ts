import { describe, expect, expectTypeOf, it } from "vitest";

import { parse } from "../src/index.js";
import type {
  Chart,
  Direction,
  DrawOptions,
  LineStyle,
  ParsedDrawOptions,
  SVGOptions,
  SymbolType,
} from "../src/index.js";

// The option types are part of the public entry, so typed wrappers can build them.
const options: DrawOptions = {
  "line-width": 2,
  symbols: { operation: { fill: "red" } },
  flowstate: { past: { stroke: "gray" } },
};

// @ts-expect-error -- a misspelled option key must not type-check anymore.
const mistypedOptions: DrawOptions = { "line-widht": 2 };

// @ts-expect-error -- symbol style keys are constrained to the node types.
const mistypedSymbols: DrawOptions = { symbols: { operaton: { fill: "red" } } };

const direction: Direction = "left";
const symbolType: SymbolType = "operation";
const lineStyle: LineStyle = { stroke: "red" };

describe("public option types", () => {
  it("exports the draw option types and applies them at runtime", () => {
    document.body.innerHTML = "";

    const container = document.createElement("div");

    document.body.append(container);

    const chart: Chart = parse("st=>start: S\nop=>operation: Op\nst->op");

    chart.draw(container, options);

    const parsed = chart.options();

    expectTypeOf(parsed).toEqualTypeOf<Partial<ParsedDrawOptions>>();

    const svgOptions: Partial<SVGOptions> = { "line-width": 2 };

    expect(parsed["line-width"]).toBe(2);
    expect(svgOptions["line-width"]).toBe(2);
    expect(document.querySelector("#op")?.getAttribute("stroke-width")).toBe("2");
    expect(direction).toBe("left");
    expect(symbolType).toBe("operation");
    expect(lineStyle.stroke).toBe("red");
    expect(mistypedOptions).toBeDefined();
    expect(mistypedSymbols).toBeDefined();
  });
});
