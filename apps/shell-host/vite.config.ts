import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import federation from "@originjs/vite-plugin-federation";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const authServiceProxyTarget = env.VITE_AUTH_SERVICE_PROXY_TARGET;
  const baseServiceProxyTarget = env.VITE_BASE_SERVICE_PROXY_TARGET;
  const platformServiceProxyTarget = env.VITE_PLATFORM_SERVICE_PROXY_TARGET;
  const hrServiceProxyTarget = env.VITE_HR_SERVICE_PROXY_TARGET;
  const bookingServiceProxyTarget = env.VITE_BOOKING_SERVICE_PROXY_TARGET;
  const financeServiceProxyTarget = env.VITE_FINANCE_SERVICE_PROXY_TARGET || platformServiceProxyTarget;
  const mfeProxyTargets = {
    "/mfe-bookings": env.VITE_BOOKINGS_DEV_PROXY_TARGET || "http://localhost:3001",
    "/mfe-health": env.VITE_HEALTH_DEV_PROXY_TARGET || "http://localhost:3002",
    "/mfe-golderp": env.VITE_GOLDERP_DEV_PROXY_TARGET || "http://localhost:3003",
    "/mfe-karty": env.VITE_KARTY_DEV_PROXY_TARGET || "http://localhost:3004",
    "/mfe-finance": env.VITE_FINANCE_DEV_PROXY_TARGET || "http://localhost:3005",
    "/mfe-lending": env.VITE_LENDING_DEV_PROXY_TARGET || "http://localhost:3006",
    "/mfe-hr": env.VITE_HR_DEV_PROXY_TARGET || "http://localhost:3007",
  } as const;

  function createServiceProxy(target?: string) {
    return {
      target,
      changeOrigin: true,
      secure: false,
      configure: (proxy: any) => {
        proxy.on("proxyReq", (proxyReq: any) => {
          proxyReq.removeHeader("origin");
        });
      },
    };
  }

  return {
    base: "/",
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
        ...Object.fromEntries(
          Object.entries(mfeProxyTargets).map(([prefix, target]) => [
            prefix,
            {
              target,
              changeOrigin: true,
              secure: false,
              rewrite: (requestPath: string) => requestPath.replace(new RegExp(`^${prefix}`), ""),
            },
          ]),
        ),
        "/auth-service": {
          ...createServiceProxy(authServiceProxyTarget),
        },
        "/base-service": {
          ...createServiceProxy(baseServiceProxyTarget),
        },
        "/platform-service": {
          ...createServiceProxy(platformServiceProxyTarget),
        },
        "/hr-service": {
          ...createServiceProxy(hrServiceProxyTarget),
        },
        "/booking-service": {
          ...createServiceProxy(bookingServiceProxyTarget),
        },
        "/finance-service": {
          ...createServiceProxy(financeServiceProxyTarget),
        },
        "/v1/api/tenant/settings": {
          ...createServiceProxy(financeServiceProxyTarget),
        }
      },
    },
    preview: {
      port: 3000,
      proxy: {
        ...Object.fromEntries(
          Object.entries(mfeProxyTargets).map(([prefix, target]) => [
            prefix,
            {
              target,
              changeOrigin: true,
              secure: false,
              rewrite: (requestPath: string) => requestPath.replace(new RegExp(`^${prefix}`), ""),
            },
          ]),
        ),
        "/auth-service": {
          ...createServiceProxy(authServiceProxyTarget),
        },
        "/base-service": {
          ...createServiceProxy(baseServiceProxyTarget),
        },
        "/platform-service": {
          ...createServiceProxy(platformServiceProxyTarget),
        },
        "/hr-service": {
          ...createServiceProxy(hrServiceProxyTarget),
        },
        "/booking-service": {
          ...createServiceProxy(bookingServiceProxyTarget),
        },
        "/finance-service": {
          ...createServiceProxy(financeServiceProxyTarget),
        }
      },
    },
  };
});
