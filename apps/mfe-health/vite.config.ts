import { defineConfig } from "vite";
import react            from "@vitejs/plugin-react";
import federation       from "@originjs/vite-plugin-federation";
import path             from "path";

export default defineConfig({
  plugins: [
    react(),
    federation({
      name:     "mfe_health",
      filename: "remoteEntry.js",
      exposes: {
        "./mount": "./src/mount.tsx",
      },
    }),
  ],
  resolve: {
    alias: {
      "@jaldee/design-system": path.resolve(__dirname, "../../packages/design-system/src/index.ts"),
      "@jaldee/auth-context": path.resolve(__dirname, "../../packages/auth-context/src/index.ts"),
      "@jaldee/event-bus":     path.resolve(__dirname, "../../packages/event-bus/src/index.ts"),
      "@jaldee/api-client":    path.resolve(__dirname, "../../packages/api-client/src/index.ts"),
    },
  },
  build: {
    target:       "esnext",
    minify:       "esbuild",
    cssCodeSplit: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react-router")) return "vendor-router";
            if (id.includes("@tanstack/react-query")) return "vendor-query";
            return "vendor";
          }

          if (id.includes("/src/pages/memberships/")) return "page-memberships";
          if (id.includes("/src/pages/customers/")) return "page-customers";
          if (id.includes("/src/pages/patients/")) return "page-patients";
          if (id.includes("/src/pages/cases/")) return "page-cases";

          if (id.includes("/packages/design-system/src/")) return "shared-design-system";
          if (id.includes("/packages/auth-context/src/")) return "shared-auth-context";
          if (id.includes("/packages/api-client/src/")) return "shared-api-client";
          if (id.includes("/packages/shared-modules/src/memberships/")) return "shared-memberships";
          if (id.includes("/packages/shared-modules/src/customers/")) return "shared-customers";
          if (id.includes("/packages/shared-modules/src/finance/")) return "shared-finance";
        },
      },
    },
  },
  server: {
    port: 3002,
  },
});
