import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { codecovRollupPlugin } from "@codecov/rollup-plugin";
import { defineConfig } from "tsdown";

export default defineConfig({
  entry: { flowchart: "./src/index.ts" },
  outDir: "./dist",
  format: ["esm"],
  platform: "browser",
  target: "es2022",
  dts: true,
  hooks: {
    async "build:done"() {
      // tsdown appends this comment even when no declaration map is emitted; drop the dangling link.
      const declaration = path.resolve(import.meta.dirname, "dist/flowchart.d.ts");
      const source = await readFile(declaration, "utf8");

      await writeFile(declaration, source.replace(/\n?\/\/# sourceMappingURL=\S+$/u, ""));
    },
  },
  minify: true,
  sourcemap: true,
  publint: true,
  plugins: [
    codecovRollupPlugin({
      enableBundleAnalysis: Boolean(process.env.BUNDLE_ANALYSIS),
      bundleName: "flowchart",
      oidc: {
        useGitHubOIDC: true,
      },
      telemetry: false,
    }),
  ],
});
