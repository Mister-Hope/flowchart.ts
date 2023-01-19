import { resolve } from "node:path";
import { defineConfig } from "vite";
import { version } from "./package.json";

export default defineConfig({
  // config options
  root: resolve(__dirname, "template"),

  define: {
    VERSION: JSON.stringify(version),
  },

  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["es", "cjs"],
      fileName: "flowchart",
    },
    outDir: resolve(__dirname, "dist"),
  },

  plugins: [],
});
