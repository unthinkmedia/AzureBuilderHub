import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { mockApiPlugin } from "./src/dev/mockApi";

// Load .env into process.env so server plugins (mockApi) can read them
const env = loadEnv("development", process.cwd(), "");
Object.assign(process.env, env);

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
