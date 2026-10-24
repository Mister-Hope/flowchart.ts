import { defineConfig } from "vitest/config";

const isTestReport = Boolean(process.env.TEST_REPORT);

export default defineConfig({
  test: {
    environment: "happy-dom",
    coverage: {
      provider: "istanbul",
      include: ["src/**/*.ts"],
      reporter: isTestReport ? ["cobertura", "text"] : ["text", "html"],
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
