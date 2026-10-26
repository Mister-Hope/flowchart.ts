import { codecovRollupPlugin } from "@codecov/rollup-plugin";
import { defineConfig } from "tsdown";

export default defineConfig({
  entry: { flowchart: "./src/index.ts" },
  outDir: "./dist",
  format: ["esm"],
  platform: "browser",
  target: "es2022",
  dts: true,
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
