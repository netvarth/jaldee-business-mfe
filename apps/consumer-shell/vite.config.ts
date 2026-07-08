import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");

  return {
    base: "/",
    plugins: [react()],
    resolve: {
      alias: {
        "@jaldee/api-client": path.resolve(__dirname, "../../packages/api-client"),
      },
    },
    server: {
      port: 3010,
      strictPort: true,
      proxy: {
        "/auth-service": {
          target: env.VITE_AUTH_SERVICE_PROXY_TARGET,
          changeOrigin: true,
          secure: false,
        },
        "/consumer-service": {
          target: env.VITE_CONSUMER_SERVICE_PROXY_TARGET,
          changeOrigin: true,
          secure: false,
        },
        "/platform-service": {
          target: env.VITE_PLATFORM_SERVICE_PROXY_TARGET,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    preview: {
      port: 3010,
      strictPort: true,
    },
  };
});
