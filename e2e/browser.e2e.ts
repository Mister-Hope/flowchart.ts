import { expect, test } from "@playwright/test";

const DSL = "st=>start: Start\ne=>end: End\nst->e";

test.beforeEach(async ({ page }) => {
  await page.goto("/e2e/index.html");
  await page.waitForFunction(() => globalThis.flowchartReady === true);
});

test("renders a visible chart with native text metrics", async ({ page }) => {
  const result = await page.evaluate((dsl) => {
    document.body.innerHTML = "";

    const container = document.createElement("div");

    container.style.width = "600px";
    document.body.append(container);
    globalThis.flowchart.parse(dsl).draw(container);

    const svg = container.querySelector("svg");
    const text = container.querySelector("text");

    return {
      svgWidth: svg?.getAttribute("width") ?? null,
      textWidth: text?.getBBox().width ?? 0,
      nodes: container.querySelectorAll("g").length,
    };
  }, DSL);

  expect(result.svgWidth).not.toBeNull();
  expect(Number(result.svgWidth)).toBeGreaterThan(0);
  expect(result.textWidth).toBeGreaterThan(0);
  expect(result.nodes).toBe(2);
});

test("does not collapse inside a hidden container", async ({ page }) => {
  const width = await page.evaluate((dsl) => {
    document.body.innerHTML = "";

    const wrapper = document.createElement("div");

    wrapper.style.display = "none";

    const container = document.createElement("div");

    wrapper.append(container);
    document.body.append(wrapper);
    globalThis.flowchart.parse(dsl).draw(container);

    return Number(container.querySelector("svg")?.getAttribute("width") ?? 0);
  }, DSL);

  expect(width).toBeGreaterThan(50);
});

test("measure detached containers through the temporary host", async ({ page }) => {
  const widths = await page.evaluate((dsl) => {
    document.body.innerHTML = "";

    const visible = document.createElement("div");

    document.body.append(visible);
    globalThis.flowchart.parse(dsl).draw(visible);
    const visibleWidth = Number(visible.querySelector("svg")?.getAttribute("width") ?? 0);

    const detached = document.createElement("div");

    globalThis.flowchart.parse(dsl).draw(detached);
    const detachedWidth = Number(detached.querySelector("svg")?.getAttribute("width") ?? 0);

    document.body.append(detached);
    const attachedWidth = Number(detached.querySelector("svg")?.getAttribute("width") ?? 0);

    return { attachedWidth, detachedWidth, visibleWidth };
  }, DSL);

  expect(widths.detachedWidth).toBeCloseTo(widths.visibleWidth, 1);
  expect(widths.attachedWidth).toBeCloseTo(widths.visibleWidth, 1);
});

test("renders arrow markers", async ({ page }) => {
  const markers = await page.evaluate((dsl) => {
    document.body.innerHTML = "";

    const container = document.createElement("div");

    document.body.append(container);
    globalThis.flowchart.parse(dsl).draw(container, { "arrow-end": "classic" });

    return {
      marker: container.querySelector("marker") != null,
      pathMarkerEnds: [...container.querySelectorAll("path")]
        .map((path) => path.getAttribute("marker-end"))
        .filter((value): value is string => value != null),
    };
  }, DSL);

  expect(markers.marker).toBe(true);
  expect(markers.pathMarkerEnds.length).toBeGreaterThan(0);
  expect(markers.pathMarkerEnds[0]).toContain("url(#");
});
