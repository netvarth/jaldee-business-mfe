import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import federation from "@originjs/vite-plugin-federation";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const authServiceProxyTarget = env.VITE_AUTH_SERVICE_PROXY_TARGET;
  const baseServiceProxyTarget = env.VITE_BASE_SERVICE_PROXY_TARGET;

  return {
    base: "/shell/",
    plugins: [
      react(),
      federation({
        name: "shell",
        remotes: {
          mfe_health: {
            external: `${env.VITE_HEALTH_URL}/assets/remoteEntry.js`,
            from: "vite",
            externalType: "url",
          },
          mfe_bookings: {
            external: `${env.VITE_BOOKINGS_URL}/assets/remoteEntry.js`,
            from: "vite",
            externalType: "url",
          },
          mfe_golderp: {
            external: `${env.VITE_GOLDERP_URL}/assets/remoteEntry.js`,
            from: "vite",
            externalType: "url",
          },
          mfe_finance: {
            external: `${env.VITE_FINANCE_URL}/assets/remoteEntry.js`,
            from: "vite",
            externalType: "url",
          },
          mfe_lending: {
            external: `${env.VITE_LENDING_URL}/assets/remoteEntry.js`,
            from: "vite",
            externalType: "url",
          },
          mfe_karty: {
            external: `${env.VITE_KARTY_URL}/assets/remoteEntry.js`,
            from: "vite",
            externalType: "url",
          },
          mfe_hr: {
            external: `${env.VITE_HR_URL}/assets/remoteEntry.js`,
            from: "vite",
            externalType: "url",
          }
        },
      }),
    ],
    resolve: {
      alias: {
        "@jaldee/design-system": path.resolve(__dirname, "../../packages/design-system"),
        "@jaldee/auth-context": path.resolve(__dirname, "../../packages/auth-context"),
        "@jaldee/event-bus": path.resolve(__dirname, "../../packages/event-bus/src/index.ts"),
        "@jaldee/api-client": path.resolve(__dirname, "../../packages/api-client"),
      },
    },
    build: {
      target: "esnext",
      minify: "esbuild",
      cssCodeSplit: false,
    },
    server: {
      port: 3000,
      proxy: {
        "/auth-service": {
          target: authServiceProxyTarget,
          changeOrigin: true,
          secure: false,
        },
        "/base-service": {
          target: baseServiceProxyTarget,
          changeOrigin: true,
          secure: false,
        },
        "/platform-service": {
          target: baseServiceProxyTarget,
          changeOrigin: true,
          secure: false,
        },
        "/hr-service": {
          target: baseServiceProxyTarget,
          changeOrigin: true,
          secure: false,
        },
        "/booking-service": {
          target: baseServiceProxyTarget,
          changeOrigin: true,
          secure: false,
        }
      },
    },
    preview: {
      port: 3000,
      proxy: {
        "/auth-service": {
          target: authServiceProxyTarget,
          changeOrigin: true,
          secure: false,
        },
        "/base-service": {
          target: baseServiceProxyTarget,
          changeOrigin: true,
          secure: false,
        },
        "/platform-service": {
          target: baseServiceProxyTarget,
          changeOrigin: true,
          secure: false,
        },
        "/hr-service": {
          target: baseServiceProxyTarget,
          changeOrigin: true,
          secure: false,
        },
        "/booking-service": {
          target: baseServiceProxyTarget,
          changeOrigin: true,
          secure: false,
        }
      },
    },
  };
});
