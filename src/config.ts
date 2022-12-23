import type { ParsedDrawOptions } from "./options";

export const defaultConfig: ParsedDrawOptions = {
  x: 0,
  y: 0,
  "text-margin": 10,
  "font-size": 14,
  "font-color": "black",

  "line-width": 3,
  "line-length": 50,
  "line-color": "black",
  "element-color": "black",
  fill: "white",
  "yes-text": "yes",
  "no-text": "no",
  "arrow-end": "block",
  class: "flowchart",
  scale: 1,
  symbols: {
    start: {},
    end: {},
    condition: {},
    inputoutput: {},
    operation: {},
    subroutine: {},
    parallel: {},
  },
  // 'font': 'normal',
  // 'font-family': 'calibri',
  // 'font-weight': 'normal',
  // 'flowstate' : {
  //   'past' : { 'fill': '#CCCCCC', 'font-size': 12},
  //   'current' : {'fill': 'yellow', 'font-color': 'red', 'font-weight': 'bold'},
  //   'future' : { 'fill': '#FFFF99'},
  //   'invalid': {'fill': '#444444'}
  // }
};
