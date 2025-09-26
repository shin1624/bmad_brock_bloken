/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@game": path.resolve(__dirname, "./src/game"),
      "@components": path.resolve(__dirname, "./src/components"),
      "@hooks": path.resolve(__dirname, "./src/hooks"),
      "@stores": path.resolve(__dirname, "./src/stores"),
      "@services": path.resolve(__dirname, "./src/services"),
      "@utils": path.resolve(__dirname, "./src/utils"),
      "@types": path.resolve(__dirname, "./src/types"),
      "@test": path.resolve(__dirname, "./src/__tests__"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    reporters: ["default"],
    include: ["**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    exclude: ["node_modules", "dist", ".idea", ".git", ".cache", "e2e/**"],
    coverage: {
      provider: "v8",
      enabled: true,
      reporter: ["text", "json", "html", "lcov"],
      reportsDirectory: "./coverage",
      exclude: [
        "node_modules/",
        "dist/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/mockData/",
        "**/types/",
        "**/__mocks__/",
        "**/__tests__/",
        "**/test/",
        "e2e/**",
        ".bmad-core/**",
        "docs/**",
        "**/*.spec.ts",
        "**/*.test.ts",
      ],
      include: ["src/**/*.{ts,tsx}"],
      thresholds: {
        statements: 90,
        branches: 85,
        functions: 80,
        lines: 90,
      },
      all: true,
      clean: true,
    },
    testTimeout: 5000,
    hookTimeout: 10000,
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: false,
        minThreads: 1,
        maxThreads: 4,
      },
    },
    cache: {
      dir: "./node_modules/.vitest",
    },
  },
});
