import type { DrawOptions } from "../../src/options.js";

/** A render fixture: the DSL plus optional draw options. */
export interface ChartFixture {
  dsl: string;
  options?: DrawOptions;
}

/**
 * Demos shipped in README / `template/index.html`, kept as named examples so regression tests and
 * snapshots share exactly the same inputs.
 */
export const EXAMPLES = {
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
} as const;

const ALL_NODE_TYPES = `\
st=>start: Start
in=>input: Input
op=>operation: Operation
io=>inputoutput: Input / Output
out=>output: Output
sub=>subroutine: Subroutine
cond=>condition: Condition?
para=>parallel: Parallel
e=>end: End

st->in->op->io->out->sub->cond
cond(yes)->para
cond(no)->e
para(path1)->e
para(path2)->cond
para(path3)->e
`;

/** Render fixtures used by the snapshot suite. */
export const CHART_FIXTURES: Record<string, ChartFixture> = {
  "all-node-types": { dsl: ALL_NODE_TYPES },

  "condition-default": {
    dsl: `st=>start: Start
a=>operation: A
b=>operation: B
cond=>condition: Ready?
st->cond
cond(yes)->a
cond(no)->b`,
  },

  "condition-directions": {
    dsl: `st=>start: Start
cond=>condition: Direction?
a=>operation: A
b=>operation: B
c=>operation: C
d=>operation: D
st->cond
cond(yes, right)->a
cond(no, bottom)->b
a(right)->c
b(left)->d`,
  },

  "condition-top-branch": {
    dsl: `st=>start: Start
cond=>condition: Top?
a=>operation: A
b=>operation: B
st->cond
cond(yes, top)->a
cond(no)->b`,
  },

  "condition-annotations": {
    dsl: `st=>start: Start
cond=>condition: Annotated?
a=>operation: A
b=>operation: B
st->cond
cond(yes@ok, right)->a
cond(no@nope)->b`,
  },

  "condition-nested": {
    dsl: `st=>start: Start
c1=>condition: First?
c2=>condition: Second?
c3=>condition: Third?
a=>operation: A
b=>operation: B
e=>end: End
st->c1
c1(yes)->c2
c1(no)->a
c2(yes)->c3
c2(no)->b
c3(yes)->e
c3(no)->c1`,
  },

  "parallel-default": {
    dsl: `st=>start: Start
para=>parallel: Parallel
a=>operation: A
b=>operation: B
c=>operation: C
e=>end: End
st->para
para(path1)->a
para(path2)->b
para(path3)->c
a->e
b->e
c->e`,
  },

  "parallel-directions": {
    dsl: `st=>start: Start
para=>parallel: Parallel
a=>operation: A
b=>operation: B
c=>operation: C
e=>end: End
st->para
para(path1, right)->a
para(path2, bottom)->b
para(path3, top)->c
a->e
b->e
c->e`,
  },

  "parallel-partial-top": {
    dsl: `st=>start: Start
para=>parallel: Parallel
a=>operation: A
b=>operation: B
st->para
para(path1, top)->a
para(path2, right)->b`,
  },

  "parallel-annotations": {
    dsl: `st=>start: Start
para=>parallel: Parallel
a=>operation: A
b=>operation: B
c=>operation: C
e=>end: End
st->para
para(path1@one, right)->a
para(path2@two, bottom)->b
para(path3@three, top)->c
a->e
b->e
c->e`,
  },

  "plain-directions": {
    dsl: `st=>start: Start
a=>operation: A
b=>operation: B
c=>operation: C
d=>operation: D
e=>end: End
st->a
a(right)->b
b(bottom)->c
c(left)->d
d(top)->e`,
  },

  links: {
    dsl: `st=>start: Start:>https://example.com/start[blank]
op=>operation: Op:>https://example.com/op
cond=>condition: Link?:>https://example.com/cond
io=>inputoutput: IO:>https://example.com/io?query=1&x=2
sub=>subroutine: Sub:>https://example.com/sub
e=>end: End:>https://example.com/end
st->op->cond
cond(yes)->io->e
cond(no)->sub->e`,
  },

  flowstates: {
    dsl: `st=>start: Start|past
op1=>operation: One|current
op2=>operation: Two|future
sub=>subroutine: Sub|invalid
c=>condition: Cond?|approved
e=>end: End|rejected
st->op1->c
c(yes)->op2->e
c(no)->sub->e`,
  },

  "flowstate-option-styles": {
    dsl: `st=>start: Start|past
e=>end: End|future
st->e`,
    options: {
      flowstate: {
        past: { fill: "#eeeeee", "font-color": "gray" },
        future: { fill: "#dddddd" },
      },
    },
  },

  "multi-line-text": {
    dsl: `st=>start: Line one
Line two
Line three
e=>end: End
st->e`,
  },

  "max-width": {
    dsl: `st=>start: one two three four five six seven eight
e=>end: End
st->e`,
    options: { maxWidth: 70 },
  },

  "cjk-text": {
    dsl: `st=>start: 开始
op=>operation: 处理中文文本
cond=>condition: 是否继续？
e=>end: 结束
st->op->cond
cond(yes)->e
cond(no)->op`,
  },

  "line-styles": {
    dsl: `st=>start: Start
a=>operation: A
b=>operation: B
e=>end: End
st->a->b->e
st@>a({"stroke":"Red"})@>b({"stroke":"Red","stroke-width":6,"arrow-end":"classic-wide-long"})@>e({"stroke":"Red"})`,
  },

  "arrow-classic": {
    dsl: "st=>start: Start\ne=>end: End\nst->e",
    options: { "arrow-end": "classic" },
  },
  "arrow-open": { dsl: "st=>start: Start\ne=>end: End\nst->e", options: { "arrow-end": "open" } },
  "arrow-oval": { dsl: "st=>start: Start\ne=>end: End\nst->e", options: { "arrow-end": "oval" } },
  "arrow-diamond": {
    dsl: "st=>start: Start\ne=>end: End\nst->e",
    options: { "arrow-end": "diamond" },
  },
  "arrow-wide-long": {
    dsl: "st=>start: Start\ne=>end: End\nst->e",
    options: { "arrow-end": "classic-wide-long", "line-width": 6 },
  },

  "symbol-styles": {
    dsl: ALL_NODE_TYPES,
    options: {
      symbols: {
        start: { fill: "#ddeeff", "element-color": "#0055aa" },
        input: { fill: "#e0f7fa", "element-color": "#006064" },
        output: { fill: "#fff3e0", "element-color": "#e65100" },
        operation: { fill: "#ffeecc", roundness: 4 },
        condition: { fill: "#e6ffe6" },
        parallel: { fill: "#f0e0ff" },
        end: { fill: "#ffdddd" },
      },
    },
  },

  "global-styles": {
    dsl: "st=>start: Start\nop=>operation: Op\ne=>end: End\nst->op->e",
    options: {
      x: 40,
      y: 30,
      "text-margin": 14,
      "font-family": "Courier New",
      "font-size": 18,
      "font-weight": "bold",
      "font-color": "#222222",
      "line-width": 2,
      "line-length": 30,
      "line-color": "#336699",
      "element-color": "#663300",
      fill: "#fffff0",
      class: "custom-flowchart",
      scale: 2,
      "yes-text": "oui",
      "no-text": "non",
    },
  },

  "loop-cycle": {
    dsl: `st=>start: Start
op=>operation: Worker
cond=>condition: Done?
e=>end: End
st->op->cond
cond(yes)->e
cond(no)->op`,
  },

  "crossing-lines": {
    dsl: `st=>start: Start
a=>operation: A
b=>operation: B
c=>operation: C
d=>operation: D
cond=>condition: Cond?
e=>end: End
st->a
st->b
a->c
b->d
c->cond
d->cond
cond(yes)->e
cond(no)->a`,
  },

  "disconnected-nodes": {
    dsl: `st=>start: Start
e=>end: End
unused=>operation: Never drawn
st->e`,
  },

  "single-connection": { dsl: "st=>start: Start\ne=>end: End\nst->e" },

  "input-output-trapezoids": {
    dsl: `st=>start: Start
read=>input: Read data:>https://example.com
write=>output: Write data|past
e=>end: End
st->read->write->e`,
  },

  "parallel-path2-top": {
    dsl: `st=>start: Start
para=>parallel: Parallel
a=>operation: A
b=>operation: B
c=>operation: C
e=>end: End
st->para
para(path1)->a
para(path2, top)->b
para(path3)->c
a->e
b->e
c->e`,
  },

  "parallel-path3-bottom": {
    dsl: `st=>start: Start
para=>parallel: Parallel
a=>operation: A
b=>operation: B
c=>operation: C
e=>end: End
st->para
para(path1)->a
para(path2)->b
para(path3, bottom)->c
a->e
b->e
c->e`,
  },

  "subroutine-and-io": {
    dsl: `st=>start: Start:>https://example.com[blank]
sub=>subroutine: Nested box:>https://example.com/sub
io=>inputoutput: IO:>https://example.com/io
e=>end: End
st->sub->io->e`,
  },

  "readme-example": { dsl: EXAMPLES.readme },
  "flowstates-and-directions": { dsl: EXAMPLES.flowstatesAndDirections },
  "annotations-and-styles": { dsl: EXAMPLES.annotationsAndStyles },
  "custom-branch-names": { dsl: EXAMPLES.customBranchNames },

  "scale-half": {
    dsl: "st=>start: Start\nop=>operation: Op\ne=>end: End\nst->op->e",
    options: { scale: 0.5 },
  },
};
