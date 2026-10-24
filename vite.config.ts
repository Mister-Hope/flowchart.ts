import path from "node:path";

import { defineConfig } from "vite";

export default defineConfig({
  // demo dev server only, building is handled by tsdown
  root: path.resolve(import.meta.dirname, "template"),
});
