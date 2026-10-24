import { defineHopeConfig } from "oxc-config-hope/oxlint";

export default defineHopeConfig(
  {},
  // `FlowChartSymbol` is the shared base of every node type: it keeps shape setup, placement and
  // connection bookkeeping together. The file is still longer than the default limit; the
  // remaining pieces are extracted incrementally instead of scattering related methods.
  {
    files: ["src/symbols/symbol.ts"],
    rules: {
      "max-lines": "off",
    },
  },
);
