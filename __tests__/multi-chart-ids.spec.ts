import { describe, expect, it } from "vitest";

import { parse } from "../src/index.js";

const DSL = "st=>start: Start\ne=>end: End\nst->e";

const createContainer = (id: string): HTMLElement => {
  const container = document.createElement("div");

  container.id = id;
  document.body.append(container);

  return container;
};

const idIn = (container: HTMLElement, id: string): Element | null =>
  container.querySelector(`#${id}`);

describe("render: node ids across charts", () => {
  it("keeps node ids unique when two charts share the same keys", () => {
    document.body.innerHTML = "";

    const first = createContainer("first");
    const second = createContainer("second");

    parse(DSL).draw(first);
    parse(DSL).draw(second);

    expect(document.querySelectorAll("#st")).toHaveLength(1);
    expect(idIn(first, "st")).not.toBeNull();
    expect(idIn(first, "stt")).not.toBeNull();
    expect(idIn(second, "st-2")).not.toBeNull();
    expect(idIn(second, "stt-2")).not.toBeNull();
  });

  it("keeps the plain ids when the charts use different keys", () => {
    document.body.innerHTML = "";

    const first = createContainer("first");
    const second = createContainer("second");

    parse("a1=>start: A\na2=>end: A end\na1->a2").draw(first);
    parse("b1=>start: B\nb2=>end: B end\nb1->b2").draw(second);

    expect(document.querySelector("#a1")).not.toBeNull();
    expect(document.querySelector("#b1")).not.toBeNull();
    expect(document.querySelector("#a1-2")).toBeNull();
  });

  it("picks the next free suffix for a third chart", () => {
    document.body.innerHTML = "";

    const containers = ["first", "second", "third"].map((id) => createContainer(id));

    for (const container of containers) parse(DSL).draw(container);

    expect(document.querySelector("#st")).not.toBeNull();
    expect(document.querySelector("#st-2")).not.toBeNull();
    expect(document.querySelector("#st-3")).not.toBeNull();
  });

  it("keeps the ids stable when a chart is redrawn", () => {
    document.body.innerHTML = "";

    const first = createContainer("first");
    const second = createContainer("second");
    const chart = parse(DSL);

    parse(DSL).draw(first);
    chart.draw(second);
    chart.draw(second);

    expect(document.querySelector("#st-2")).not.toBeNull();
    expect(document.querySelector("#st-3")).toBeNull();
  });

  it("reuses the plain ids after the conflicting chart is removed", () => {
    document.body.innerHTML = "";

    const first = createContainer("first");
    const second = createContainer("second");
    const firstChart = parse(DSL);
    const secondChart = parse(DSL);

    firstChart.draw(first);
    secondChart.draw(second);

    expect(document.querySelector("#st-2")).not.toBeNull();

    firstChart.clean();
    secondChart.draw(second);

    expect(document.querySelector("#st-2")).toBeNull();
    expect(idIn(second, "st")).not.toBeNull();
  });
});
