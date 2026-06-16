import { defineConfig } from "vite";
import react            from "@vitejs/plugin-react";
import federation       from "@originjs/vite-plugin-federation";
import path             from "path";

export default defineConfig({
  plugins: [
    react(),
    federation({
      name:     "mfe_bookings",
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
      "@jaldee/shared-modules": path.resolve(__dirname, "../../packages/shared-modules/src/index.ts"),
    },
  },
  build: {
    target:       "esnext",
    minify:       "esbuild",
    cssCodeSplit: false,
  },
  server: {
    port: 3001,
    origin: "http://localhost:3001",
    proxy: {
      // Standalone dev: forward booking-service calls to the API gateway.
      // Override the target with VITE_BOOKING_SERVICE_PROXY_TARGET.
      "/booking-service": {
        target: process.env.VITE_BOOKING_SERVICE_PROXY_TARGET || "http://192.168.29.87:8080",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    port: 3001,
    strictPort: true,
  },
});
