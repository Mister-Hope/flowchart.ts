import type { ChartFixture } from "./charts.js";

/**
 * Fixtures that do not use the shared `EXAMPLES` / `ALL_NODE_TYPES` inputs. Kept in a separate file
 * to respect the per-file size limit.
 */
export const CHART_EXTRA_FIXTURES: Record<string, ChartFixture> = {
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

  "arrow-narrow-short": {
    dsl: "st=>start: Start\ne=>end: End\nst->e",
    options: { "arrow-end": "classic-narrow-short" },
  },

  "arrow-start": {
    dsl: "st=>start: Start\ne=>end: End\nst->e",
    options: { "arrow-start": "classic" },
  },

  "arrow-none": {
    dsl: "st=>start: Start\ne=>end: End\nst->e",
    options: { "arrow-end": "none" },
  },

  "arrow-unknown-token": {
    dsl: "st=>start: Start\ne=>end: End\nst->e",
    options: { "arrow-end": "classic-bogus" },
  },

  "emoji-text": {
    dsl: `st=>start: Start
e=>end: Done 😀
st->e`,
  },

  "no-text-with-max-width": {
    dsl: `op=>operation
e=>end: E
op->e`,
    options: { maxWidth: 100 },
  },

  "negative-y-offset": {
    dsl: `a=>start: A
b=>operation: B
c=>end: C
a->b->c`,
    options: { y: -40 },
  },

  "condition-only-no": {
    dsl: `st=>start: Start
cond=>condition: Ready?
b=>operation: B
e=>end: End
st->cond
cond(no)->b
b->e`,
  },

  "condition-only-yes": {
    dsl: `st=>start: Start
cond=>condition: Ready?
a=>operation: A
e=>end: End
st->cond
cond(yes)->a
a->e`,
  },

  "parallel-only-path3": {
    dsl: `st=>start: Start
p=>parallel: Fork
c=>operation: C
e=>end: End
st->p
p(path3)->c
c->e`,
  },

  "routing-left-offset": {
    dsl: `st=>start: Start
cond=>condition: Cond?
a=>operation: A
b=>operation: B
st->cond
cond(yes, left)->b
cond(no, right)->a
a(left)->b`,
  },

  "routing-bottom-to-right": {
    dsl: `st=>start: Start
cond=>condition: Cond?
b=>operation: B
d=>operation: D
st->cond
cond(yes, right)->d
cond(no, left)->b
b(bottom)->d`,
  },

  "routing-bottom-to-right-under": {
    dsl: `st=>start: Start
cond=>condition: Cond?
b=>operation: B
d=>operation: D
st->cond
cond(yes)->d
cond(no, left)->b
b(bottom)->d`,
  },

  "routing-left-around-column": {
    dsl: `st=>start: Start
a=>operation: A
b=>operation: B
st->a->b
b(left)->a`,
  },

  "routing-bottom-around-column": {
    dsl: `st=>start: Start
a=>operation: A
b=>operation: B
st->a->b
b(bottom)->a`,
  },

  "routing-right-to-right": {
    dsl: `st=>start: Start
cond=>condition: Cond?
a=>operation: A
b=>operation: B
st->cond
cond(yes)->a
cond(no, right)->b
a(right)->b`,
  },
};
