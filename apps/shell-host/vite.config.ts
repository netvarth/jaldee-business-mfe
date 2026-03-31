import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import federation from "@originjs/vite-plugin-federation";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
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
        },
      }),
    ],
    resolve: {
      alias: {
        "@jaldee/design-system": path.resolve(__dirname, "../../packages/design-system/src/index.ts"),
        "@jaldee/auth-context": path.resolve(__dirname, "../../packages/auth-context/src/index.ts"),
        "@jaldee/event-bus": path.resolve(__dirname, "../../packages/event-bus/src/index.ts"),
        "@jaldee/api-client": path.resolve(__dirname, "../../packages/api-client/src/index.ts"),
      },
    },
    build: {
      target: "esnext",
      minify: "esbuild",
    },
    server: {
      port: 3000,
      proxy: {
        "/api": {
          target: "https://scale.jaldee.com",
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api/, "/v1/rest"),
        },
      },
    },
  };
});
