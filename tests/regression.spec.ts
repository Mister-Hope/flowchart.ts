import { describe, expect, it } from "vitest";

import { parse } from "../src/index.js";

/** Demos from README / `template/index.html` that must keep rendering. */
const EXAMPLES: Record<string, string> = {
  readme: `\
st=>start: Start:>http://www.google.com[blank]
e=>end:>http://www.google.com
op1=>operation: My Operation
sub1=>subroutine: My Subroutine
cond=>condition: Yes
or No?:>http://www.google.com
io=>inputoutput: catch something...
para=>parallel: parallel tasks

st->op1->cond
cond(yes)->io->e
cond(no)->para
para(path1, bottom)->sub1(right)->op1
para(path2, top)->op1
`,
  flowstatesAndDirections: `\
st=>start: Start|past:>http://www.google.com[blank]
e=>end: End|future:>http://www.google.com
op1=>operation: My Operation|past
op2=>operation: Stuff|current
sub1=>subroutine: My Subroutine|invalid
cond=>condition: Yes
or No?|approved:>http://www.google.com
c2=>condition: Good idea|rejected
io=>inputoutput: catch something...|future

st->op1(right)->cond
cond(yes, right)->c2
cond(no)->sub1(left)->op1
c2(yes)->io->e
c2(no)->op2->e
`,
  annotationsAndStyles: `\
st=>start: Improve your
l10n process!
e=>end: Continue to have fun!:>https://youtu.be/YQryHo1iHb8[blank]
op1=>operation: Go to locize.com:>https://locize.com[blank]
sub1=>subroutine: Read the awesomeness
cond(align-next=no)=>condition: Interested to
getting started?
io=>inputoutput: Register:>https://www.locize.app/register[blank]
sub2=>subroutine: Read about improving
your localization workflow
or another source:>https://medium.com/@adrai/8-signs-you-should-improve-your-localization-process-3dc075d53998[blank]
op2=>operation: Login:>https://www.locize.app/login[blank]
cond2=>condition: valid password?
cond3=>condition: reset password?
op3=>operation: send email
sub3=>subroutine: Create a demo project
sub4=>subroutine: Start your real project
io2=>inputoutput: Subscribe

st->op1->sub1->cond
cond(yes)->io->op2->cond2
cond2(no)->cond3
cond3(no,bottom)->op2
cond3(yes)->op3
op3(right)->op2
cond2(yes)->sub3
sub3->sub4->io2->e
cond(no)->sub2(right)->op1

st@>op1({"stroke":"Red"})@>sub1({"stroke":"Red"})@>cond({"stroke":"Red"})@>io({"stroke":"Red"})@>op2({"stroke":"Red"})@>cond2({"stroke":"Red"})@>sub3({"stroke":"Red"})@>sub4({"stroke":"Red"})@>io2({"stroke":"Red"})@>e({"stroke":"Red","stroke-width":6,"arrow-end":"classic-wide-long"})
`,
  customBranchNames: `\
st=>start: Start:>http://www.google.com[blank]
e=>end:>http://www.google.com
op1=>operation: My Operation
sub1=>subroutine: My Subroutine
cond=>condition: linear or polynomial :>http://www.google.com
io=>inputoutput: catch something...
para=>parallel: 3 possibilities

st->op1->cond
cond(true@linear)->io->e
cond(false@polynomial)->sub1(right)
sub1(right)->para
para(path1@an1, top)->cond
para(path2@an2, right)->op1
para(path3@an3, bottom)->e
`,
};

const README_EXAMPLE = EXAMPLES.readme ?? "";
const FLOWSTATE_EXAMPLE = EXAMPLES.flowstatesAndDirections ?? "";

const byId = (id: string): Element | null =>
  // oxlint-disable-next-line unicorn/prefer-query-selector -- id lookups are the clearest API in DOM tests
  document.getElementById(id);

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
