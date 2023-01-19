import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import esbuild from "rollup-plugin-esbuild";

export default {
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
};
