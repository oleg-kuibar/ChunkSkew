import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const releaseId = env.VITE_RELEASE_ID ?? "dev-local";
  const assetBasePath = env.VITE_ASSET_BASE_PATH ?? "/";

  return {
    base: assetBasePath,
    plugins: [
      tanstackRouter({
        target: "react",
        autoCodeSplitting: true,
        routesDirectory: "./src/pages/tanstack-file-routes",
        generatedRouteTree: "./src/routeTree.gen.ts"
      }),
      react()
    ],
    define: {
      __APP_RELEASE_ID__: JSON.stringify(releaseId)
    },
    server: {
      port: 5173,
      strictPort: false,
      proxy: {
        "/api": "http://localhost:4177",
        "/events": "http://localhost:4177",
        "/version.json": "http://localhost:4177"
      }
    },
    preview: {
      port: 4173,
      strictPort: false
    },
    build: {
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            router: ["react-router-dom", "@tanstack/react-router"],
            query: ["@tanstack/react-query"],
            react: ["react", "react-dom"]
          }
        }
      }
    }
  };
});
