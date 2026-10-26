import path from "node:path";

import { defineConfig } from "vite";

// The demo config roots at `template/`; the browser tests need the built `dist/` bundle too.
export default defineConfig({
  root: path.resolve(import.meta.dirname, ".."),
  publicDir: false,
  server: {
    port: 4173,
    strictPort: true,
  },
});
