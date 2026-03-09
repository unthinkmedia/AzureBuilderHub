import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { mockApiPlugin } from "./src/dev/mockApi";

const useMockApi = !process.env.AZURE_FUNCTIONS_URL;

export default defineConfig({
  plugins: [react(), ...(useMockApi ? [mockApiPlugin()] : [])],
  resolve: {
    alias: {
      "@components": path.resolve(__dirname, "src/components"),
    },
  },
  server: {
    port: 4200,
    strictPort: true,
    ...(useMockApi
      ? {}
      : {
          proxy: {
            "/api": {
              target: process.env.AZURE_FUNCTIONS_URL || "http://localhost:7071",
              changeOrigin: true,
            },
          },
        }),
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
