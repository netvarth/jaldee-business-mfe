import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import federation from "@originjs/vite-plugin-federation";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const hrServiceProxyTarget = env.VITE_HR_SERVICE_PROXY_TARGET;

  return {
    base: "/ess/",
    plugins: [
      react(),
      federation({
        name: "employee_shell",
        remotes: {
          mfe_hr: {
            external: `${env.VITE_HR_URL}/assets/remoteEntry.js`,
            from: "vite",
            externalType: "url",
          },
        },
      }),
    ],
    resolve: {
      alias: {
        "@jaldee/api-client": path.resolve(__dirname, "../../packages/api-client"),
        "@jaldee/auth-context": path.resolve(__dirname, "../../packages/auth-context/src/index.ts"),
      },
    },
    server: {
      port: 3011,
      strictPort: true,
      proxy: {
        "/auth-service": {
          target: env.VITE_AUTH_SERVICE_PROXY_TARGET,
          changeOrigin: true,
          secure: false,
        },
        "/employee-service": {
          target: env.VITE_EMPLOYEE_SERVICE_PROXY_TARGET,
          changeOrigin: true,
          secure: false,
        },
        "/base-service": {
          target: env.VITE_BASE_SERVICE_PROXY_TARGET,
          changeOrigin: true,
          secure: false,
        },
        "/platform-service": {
          target: env.VITE_PLATFORM_SERVICE_PROXY_TARGET,
          changeOrigin: true,
          secure: false,
        },
        "/hr-service": {
          target: hrServiceProxyTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    preview: {
      port: 3011,
      strictPort: true,
    },
  };
});
