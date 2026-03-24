import { defineConfig } from "vite";
import react            from "@vitejs/plugin-react";
import federation       from "@originjs/vite-plugin-federation";
import path             from "path";

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: "shell",
      remotes: {
        mfe_health: {
          external:     "http://localhost:3002/assets/remoteEntry.js",
          from:         "vite",
          externalType: "url",
        },
      },
      shared: ["react", "react-dom", "react-router-dom"],
    }),
  ],
  resolve: {
    alias: {
      "@jaldee/design-system":  path.resolve(__dirname, "../../packages/design-system/src/index.ts"),
      "@jaldee/auth-context":   path.resolve(__dirname, "../../packages/auth-context/src/index.ts"),
      "@jaldee/event-bus":      path.resolve(__dirname, "../../packages/event-bus/src/index.ts"),
      "@jaldee/api-client":     path.resolve(__dirname, "../../packages/api-client/src/index.ts"),
    },
  },
  build: {
    target:  "esnext",
    minify:  false,
  },
  server: {
    port: 3000,
  },
});