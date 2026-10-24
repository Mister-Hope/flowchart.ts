import { describe, expect, it } from "vitest";

import { parse } from "../src/index.js";
import { CHART_FIXTURES } from "./fixtures/charts.js";
import type { ChartFixture } from "./fixtures/charts.js";

const SNAPSHOT_TAGS = "g,a,rect,text,tspan,path,ellipse,circle";

// Marker ids embed a per-paper counter; normalise them so snapshots are draw-order agnostic.
// Decimal precision only needs to catch meaningful layout changes, not float noise.
const roundDecimals = (value: string): string =>
  value.replaceAll(/-?\d+\.\d+/gu, (match) => String(Math.round(Number(match) * 100) / 100));

const normalizeValue = (value: string): string =>
  roundDecimals(value.replaceAll(/flowchart-\d+/gu, "flowchart"));

const normalizeAttributes = (element: Element): Record<string, string> =>
  Object.fromEntries(
    [...element.attributes]
      .map(({ name, value }): [string, string] => [name, normalizeValue(value)])
      .sort(([left], [right]) => left.localeCompare(right)),
  );

const elementSnapshot = (element: Element): Record<string, unknown> => {
  const tag = element.tagName.toLowerCase();
  const snapshot: Record<string, unknown> = {
    tag,
    attrs: normalizeAttributes(element),
  };

  if (tag === "text" || tag === "tspan") snapshot.text = element.textContent;

  return snapshot;
};

/**
 * Structural + geometric fingerprint of a rendered chart: every element outside `<defs>` with all
 * attributes (path data, node sizes, group transforms, text coordinates, links, classes, ...) and
 * the SVG sizing/viewBox, plus the generated arrow-marker definitions.
 *
 * This is a regression net for the layout engine: attribute values encode the computed geometry.
 *
 * @param fixture DSL and draw options to render.
 * @returns The normalised chart snapshot.
 */
const snapshotChart = (fixture: ChartFixture): unknown => {
  document.body.innerHTML = "";

  const container = document.createElement("div");

  container.id = "snapshot-container";
  document.body.append(container);

  const chart = parse(fixture.dsl);

  chart.draw(container, fixture.options);

  const svg = document.querySelector("svg");

  if (svg == null) return null;

  const root = svg;

  return {
    width: root.getAttribute("width"),
    height: root.getAttribute("height"),
    viewBox: root.getAttribute("viewBox"),
    preserveAspectRatio: root.getAttribute("preserveAspectRatio"),
    nodes: [...root.querySelectorAll(SNAPSHOT_TAGS)]
      .filter((element) => element.closest("defs") == null)
      .map((element) => elementSnapshot(element)),
    defs: [...root.querySelectorAll("defs *")].map((element) => elementSnapshot(element)),
  };
};

describe("rendered chart snapshots", () => {
  it.each(Object.entries(CHART_FIXTURES))("renders %s", (_name, fixture) => {
    expect(snapshotChart(fixture)).toMatchSnapshot();
  });
});
