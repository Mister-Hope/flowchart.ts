import { defineConfig } from "tsdown";

export default defineConfig({
  entry: { flowchart: "./src/index.ts" },
  outDir: "./dist",
  platform: "browser",
  target: "es2022",
  dts: true,
  minify: true,
  sourcemap: true,
});
