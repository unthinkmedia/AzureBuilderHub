import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { devAuthPlugin } from "./src/dev/devAuth";

// Load .env into process.env so server plugins can read them
const env = loadEnv("development", process.cwd(), "");
Object.assign(process.env, env);

/**
 * Build a base64 x-ms-client-principal header that mimics SWA auth.
 * Injected into proxied /api/* requests so Azure Functions auth works
 * without SWA CLI.
 */
function buildDevClientPrincipal(): string | null {
  const userId = process.env.DEV_USER_ID;
  const userName = process.env.DEV_USER_NAME;
  if (!userId) return null;
  const principal = {
    userId,
    userDetails: userName ?? userId,
    identityProvider: "github",
    userRoles: ["anonymous", "authenticated"],
  };
  return Buffer.from(JSON.stringify(principal)).toString("base64");
}

const devPrincipal = buildDevClientPrincipal();

export default defineConfig({
  plugins: [react(), devAuthPlugin()],
  resolve: {
    alias: {
      "@components": path.resolve(__dirname, "src/components"),
    },
  },
  server: {
    port: 4200,
    strictPort: true,
    proxy: {
      "/api": {
        target: process.env.AZURE_FUNCTIONS_URL || "http://localhost:7071",
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            if (devPrincipal) {
              proxyReq.setHeader("x-ms-client-principal", devPrincipal);
            }
          });
        },
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
