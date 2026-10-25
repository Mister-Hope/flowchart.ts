import { defineConfig } from "vitest/config";

const isTestReport = Boolean(process.env.TEST_REPORT);

export default defineConfig({
  test: {
    environment: "happy-dom",
    coverage: {
      provider: "istanbul",
      include: ["src/**/*.ts"],
      reporter: isTestReport ? ["cobertura", "text"] : ["text", "html"],
      // Every reachable statement, branch and function is covered; the few defensive branches that
      // cannot be reached in the happy-dom environment are marked with an explained
      // `istanbul ignore next` comment in `src/`. A drop below 100% therefore means new, untested
      // code (or an ignore that needs a reason), not a noisy fluctuation.
      thresholds: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
      },
    },
    ...(isTestReport
      ? {
          reporters: ["default", "junit"],
          outputFile: {
            junit: "coverage/test-report.junit.xml",
          },
        }
      : {}),
  },
});
