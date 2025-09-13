/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitestReporter } from "tdd-guard-vitest";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    reporters: [
      "default",
      new VitestReporter("/Users/yoshikawashin/project/bmad_brock_bloken"),
    ],
  },
});
