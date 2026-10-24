import { defineHopeConfig } from "oxc-config-hope/oxlint";

export default defineHopeConfig(
  {},
  // `parse` / `parseDefinition` are the DSL parser: a line can be a definition, a flow or a style
  // override, so the branching mirrors the grammar and splitting it would obscure the parser.
  {
    files: ["src/parse.ts"],
    rules: {
      complexity: "off",
      "max-statements": "off",
    },
  },
  // `drawLineTo` is the line router: every direction / relative-position pair maps to its own path,
  // so it is long and branchy by nature; extracting branches would scatter the layout math and
  // risk changing routing behavior.
  {
    files: ["src/symbols/symbol.ts"],
    rules: {
      complexity: "off",
      "max-lines": "off",
      "max-lines-per-function": "off",
      "max-statements": "off",
    },
  },
);
