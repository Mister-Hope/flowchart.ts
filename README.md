# flowchart.ts

[![codecov](https://codecov.io/gh/Mister-Hope/flowchart.ts/graph/badge.svg)](https://codecov.io/gh/Mister-Hope/flowchart.ts)

flowchart.ts is a modern version of flowchart.js: a flowchart DSL and SVG renderer that runs in the browser.

Nodes and connections are defined separately so that nodes can be reused and connections can be quickly changed.
Fine grain changes to node and connection style can also be made right in the DSL.

The SVG renderer is implemented in this package, so flowchart.ts has **no runtime dependencies** and targets modern browsers.

## Installation

```bash
pnpm add flowchart.ts
# npm install flowchart.ts
# yarn add flowchart.ts
```

## Usage

```ts
import { parse } from "flowchart.ts";

const chart = parse(`\
st=>start: Start
op1=>operation: My Operation
e=>end: End

st->op1->e
`);

// draw into an element or an element id
chart.draw("diagram");

// remove the rendered SVG again
chart.clean();
```

`parse` accepts the DSL below and returns a `Chart`; `draw(container, options)` renders it as SVG.
Styles can be passed per call (colors, fonts, line width, ...), per symbol type, or per flowstate.
The option types (`DrawOptions`, `SVGOptions`, `ParsedDrawOptions`, `SymbolType`, `Direction`, ...)
are exported from the package entry, and option/symbol keys are type-checked.

### Multiple charts

Node ids (`#st`, `#stt`, ...) are global to the document. When several charts on one page use the
same node keys, the later charts get a numeric id suffix (`#st-2`, `#stt-2`, ...) so
`getElementById()` and CSS id selectors keep addressing the right chart. A chart whose keys are not
used yet keeps the plain ids.

### Sizing

The SVG is sized from the rendered content. Pass `width` / `height` to scale it into a specific box
(pixels or any CSS length); the viewBox still describes the content, so the chart scales without
distortion and a missing dimension follows the content aspect ratio:

```ts
chart.draw("diagram", { width: 400 }); // 400px wide, height follows the aspect ratio
chart.draw("diagram", { width: "100%" }); // fills the container, height follows the aspect ratio
chart.draw("diagram", { height: 200 }); // 200px high, width follows the aspect ratio
```

`scale` multiplies the automatic content size and is ignored when `width` / `height` are set.

## Requirements

- **ESM-only**: the package ships ES modules (`"type": "module"`, no CommonJS entry); use it with a bundler or an ESM-capable runtime
- Node.js `>= 22`
- any modern browser (SVG + ES2022) at runtime

## Example

```flowchart
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
```

![Example Flowchart](/imgs/example.svg)

## Node Syntax

`nodeName=>nodeType: nodeText[|flowstate][:>urlLink]`

Items in `[]` are optional.

_nodeName_ defines the nodes variable name within the flowchart document.

_nodeType_ defines what type the node is. See **Node Types** for more information.

_nodeText_ is the text that will be inserted into the node. Newlines are allowed and will be reflected in the rendered node text.

_flowstate_ is optional and uses the `|` operator that specifies extra styling for the node.

_urlLink_ is optional and uses the `:>` operator to specify the url to link to.

## Node Types

Defines the shape that the node will take.

### start

Used as the first node where flows start from.
Default text is `Start`.

![start image](imgs/start.png "start image")

```flowchart
st=>start: start
```

### end

Used as the last node where a flow ends.
Default text is `End`.

![end image](imgs/end.png "end image")

```flowchart
e=>end: end
```

### operation

Indicates that an operation needs to happen in the flow.

![operation image](imgs/operation.png "operation image")

```flowchart
op1=>operation: operation
```

### inputoutput

Indicates that IO happens in a flow.

![inputoutput image](imgs/inputoutput.png "inputoutput image")

```flowchart
io=>inputoutput: inputoutput
```

### input

Indicates that input happens in the flow. Rendered as an inverted trapezoid (wider at the top).

```flowchart
getInfo=>input: Input info
```

### output

Indicates that output happens in the flow. Rendered as an upright trapezoid (wider at the bottom).

```flowchart
printInfo=>output: Print info
```

### subroutine

Indicates that a subroutine happens in the flow and that there should be another flowchart that documents this subroutine.

![subroutine image](imgs/subroutine.png "subroutine image")

```flowchart
sub1=>subroutine: subroutine
```

### condition

Allows for a conditional or logical statement to direct the flow into one of two paths.

![condition image](imgs/condition.png "condition image")

```flowchart
cond=>condition: condition
Yes or No?
```

### parallel

Allows for multiple flows to happen simultaneously.

![parallel image](imgs/parallel.png "parallel image")

```flowchart
para=>parallel: parallel
```

## Connections

Connections are defined in their own section below the node definitions.
The `->` operator specifies a connection from one node to another like `nodeVar1->nodeVar2->nodeVar3`.

Not all nodes need to be specified in one string and can be separaged like so

```flowchart
nodeVar1->nodeVar2
nodeVar2->nodeVar3
```

Connection syntax is as follows:

`<node variable name>[(<specification1>[, <specification2])]-><node variable name>[[(<specification1>[, <specification2])]-><node variable name>]`

Items in `[]` are optional.

### Directions

The following directions are available and define the direction the connection will leave the node from. If there are more than one specifiers, it is always the last. All nodes have a default direction making this an optional specification. `<direction>` will be used to indicate that one of the following should be used in its place.

- left
- right
- top
- bottom

Every branch of a `condition` or `parallel` node needs its own direction: when two branches of the same node resolve to the same direction, only the last one is laid out. The chart logs a warning and the earlier branch is skipped.

### Node Specific Specifiers by Type

Each node variables has optional specifiers, like direction, and some have special specifiers depending on the node type that are defined below. Specifiers are added after the variable name in `()` and separated with `,` like `nodeVar(spec1, spec2)`.

### start

Optional direction

`startVar(<direction>)->nextNode`

### end

No specifications because connections only go to the end node and do not leave from it.

`previousNode->endVar`

### operation

Optional direction

`operationVar(<direction>)->nextNode`

### inputoutput

Optional direction

`inputoutputVar(<direction>)->nextNode`

### subroutine

Optional direction

`subroutineVar(<direction>)->nextNode`

### condition

Required logical specification of `yes` or `no`

Optional direction

```flowchart
conditionalVar(yes, <direction>)->nextNode1
conditionalVar(no,  <direction>)->nextNode2
```

### parallel

Required path specification of `path1`, `path2`, or `path3`

Optional direction

```flowchart
parallelVar(path1, <direction>)->nextNode1
parallelVar(path2, <direction>)->nextNode2
parallelVar(path3, <direction>)->nextNode3
```

## Links

An external link can be added to a node with the `:>` operator.

The `st` node is linked to `http://www.google.com` and will open a new tab because `[blank]` is at the end of the URL.

The `e` node is linked to `http://www.yahoo.com` and will cause the page to navigate to that page instead of opening a new tab.

```flowchart
st=>start: Start:>http://www.google.com[blank]
e=>end: End:>http://www.yahoo.com
```

## Security

The DSL is data, not trusted code. If flowcharts can be authored by users or other systems, treat
the DSL like any other untrusted input and keep the rendered SVG inside a trusted page.

### Links

Only `http:`, `https:`, `mailto:` and `tel:` URLs are rendered as links, together with relative
URLs (`/path`, `#anchor`, `//host/path`, ...). Other protocols (`javascript:`, `data:`, `file:`,
`blob:`, ...) throw a `FlowchartSecurityError` while parsing. `blank` / `_blank` targets are opened
with `rel="noopener noreferrer"`.

### Line styles

`@>` styles are limited to presentation attributes: `stroke*`, `fill*`, `opacity`, `visibility`,
`color`, `shape-rendering`, `pointer-events`, `cursor` keywords, `arrow-start`/`arrow-end` and font
attributes. Event handlers (`on*`), `href`/`xlink:href`, `style`, `filter`, `clip-path`, `mask`,
markers, SMIL animation and structural attributes (`path`, `transform`, `id`, ...) are rejected.

### Callbacks

`:$handler` resolves against the `callbacks` draw option first and then against `globalThis`; only
functions are invoked. Pass handlers explicitly when the DSL is untrusted:

```ts
chart.draw("diagram", {
  callbacks: {
    handler: (event, options) => {
      // ...
    },
  },
});
```

### CSP and serialization

The renderer never writes inline event handlers, so it works with a strict CSP such as
`script-src 'self'`. Do not serialize a chart built from untrusted DSL and re-insert it as HTML:
HTML entities can restore protocols that were rejected at the DOM level (for example
`javascript&#58;`). Keep the rendered DOM or sanitize the serialized string.

## Advice

Symbols that should possibly not be used in the text: `=>` and `->` and `:>` and `|` and `@>` and `:$`

If you want to emphasize a specific path in your flowchart, you can additionally define it like this:

```
st@>op1({"stroke":"Red"})@>cond({"stroke":"Red","stroke-width":6,"arrow-end":"classic-wide-long"})@>c2({"stroke":"Red"})@>op2({"stroke":"Red"})@>e({"stroke":"Red"})
```

## Custom names for branches

```
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
```

<details>

  <summary>Demonstration</summary>

![img](https://user-images.githubusercontent.com/1086194/137810516-0d7d7307-fc55-466f-b06d-a6ca9f6b8785.png)

</details>

## Changelog

Release notes are generated from [Conventional Commits](https://www.conventionalcommits.org/) with
[changelogen](https://github.com/unjs/changelogen) and published to
[CHANGELOG.md](./CHANGELOG.md) and the
[GitHub Releases](https://github.com/Mister-Hope/flowchart.ts/releases) page.
