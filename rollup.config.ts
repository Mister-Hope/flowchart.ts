import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import dts from "rollup-plugin-dts";
import esbuild from "rollup-plugin-esbuild";

export default [
  {
    input: `./src/index.ts`,
    output: [
      {
        file: `./dist/flowchart.js`,
        format: "cjs",
        sourcemap: true,
        exports: "named",
      },
      {
        file: `./dist/flowchart.mjs`,
        format: "esm",
        sourcemap: true,
        exports: "named",
      },
    ],
    plugins: [
      nodeResolve({ preferBuiltins: true }),
      commonjs(),
      esbuild({ charset: "utf8", minify: true, target: "node14" }),
    ],
  },
  {
    input: `./src/index.ts`,
    output: [
      {
        file: `./dist/flowchart.d.ts`,
        format: "esm",
        exports: "named",
      },
      {
        file: `./dist/flowchart.d.mts`,
        format: "esm",
        exports: "named",
      },
    ],
    plugins: [dts()],
  },
];
