/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.tsx"],
    css: true,
    coverage: {
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "src/test/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/dist/**",
        "**/build/**",
      ],
    },
  },
  resolve: {
    alias: {
      "@": "/src",
      "@jeffrey-keyser/personal-ui-kit": "/home/user/Analytics-Pulse/client/node_modules/@jeffrey-keyser/personal-ui-kit/dist/index.esm.js",
    },
  },
});
