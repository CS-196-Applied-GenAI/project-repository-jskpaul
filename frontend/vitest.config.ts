import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./vitest.setup.ts"
  },
  coverage: {
    provider: "v8",
    reporter: ["text", "html"],
    exclude: ["src/mock/data.ts"],
    thresholds: {
      lines: 60,
      functions: 60,
      branches: 60,
      statements: 60
    }
  }
});

