// vite.config.ts
import { defineConfig, loadEnv } from "file:///C:/UI%20Enviroment/jaldee-business-mfe/node_modules/vite/dist/node/index.js";
import react from "file:///C:/UI%20Enviroment/jaldee-business-mfe/node_modules/@vitejs/plugin-react/dist/index.mjs";
import federation from "file:///C:/UI%20Enviroment/jaldee-business-mfe/node_modules/@originjs/vite-plugin-federation/dist/index.mjs";
import path from "path";
var __vite_injected_original_dirname = "C:\\UI Enviroment\\jaldee-business-mfe\\apps\\shell-host";
var vite_config_default = defineConfig(({ mode }) => {
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
            externalType: "url"
          },
          mfe_bookings: {
            external: `${env.VITE_BOOKINGS_URL}/assets/remoteEntry.js`,
            from: "vite",
            externalType: "url"
          },
          mfe_golderp: {
            external: `${env.VITE_GOLDERP_URL}/assets/remoteEntry.js`,
            from: "vite",
            externalType: "url"
          },
          mfe_finance: {
            external: `${env.VITE_FINANCE_URL}/assets/remoteEntry.js`,
            from: "vite",
            externalType: "url"
          },
          mfe_karty: {
            external: `${env.VITE_KARTY_URL}/assets/remoteEntry.js`,
            from: "vite",
            externalType: "url"
          }
        }
      })
    ],
    resolve: {
      alias: {
        "@jaldee/design-system": path.resolve(__vite_injected_original_dirname, "../../packages/design-system/src/index.ts"),
        "@jaldee/auth-context": path.resolve(__vite_injected_original_dirname, "../../packages/auth-context/src/index.ts"),
        "@jaldee/event-bus": path.resolve(__vite_injected_original_dirname, "../../packages/event-bus/src/index.ts"),
        "@jaldee/api-client": path.resolve(__vite_injected_original_dirname, "../../packages/api-client/src/index.ts")
      }
    },
    build: {
      target: "esnext",
      minify: "esbuild"
    },
    server: {
      port: 3e3,
      proxy: {
        "/api": {
          target: "https://scale.jaldee.com",
          changeOrigin: true,
          secure: true,
          rewrite: (path2) => path2.replace(/^\/api/, "/v1/rest")
        }
      }
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVSSBFbnZpcm9tZW50XFxcXGphbGRlZS1idXNpbmVzcy1tZmVcXFxcYXBwc1xcXFxzaGVsbC1ob3N0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVSSBFbnZpcm9tZW50XFxcXGphbGRlZS1idXNpbmVzcy1tZmVcXFxcYXBwc1xcXFxzaGVsbC1ob3N0XFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9VSSUyMEVudmlyb21lbnQvamFsZGVlLWJ1c2luZXNzLW1mZS9hcHBzL3NoZWxsLWhvc3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcsIGxvYWRFbnYgfSBmcm9tIFwidml0ZVwiO1xyXG5pbXBvcnQgcmVhY3QgZnJvbSBcIkB2aXRlanMvcGx1Z2luLXJlYWN0XCI7XHJcbmltcG9ydCBmZWRlcmF0aW9uIGZyb20gXCJAb3JpZ2luanMvdml0ZS1wbHVnaW4tZmVkZXJhdGlvblwiO1xyXG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IG1vZGUgfSkgPT4ge1xyXG4gIGNvbnN0IGVudiA9IGxvYWRFbnYobW9kZSwgcHJvY2Vzcy5jd2QoKSwgXCJcIik7XHJcblxyXG4gIHJldHVybiB7XHJcbiAgICBwbHVnaW5zOiBbXHJcbiAgICAgIHJlYWN0KCksXHJcbiAgICAgIGZlZGVyYXRpb24oe1xyXG4gICAgICAgIG5hbWU6IFwic2hlbGxcIixcclxuICAgICAgICByZW1vdGVzOiB7XHJcbiAgICAgICAgICBtZmVfaGVhbHRoOiB7XHJcbiAgICAgICAgICAgIGV4dGVybmFsOiBgJHtlbnYuVklURV9IRUFMVEhfVVJMfS9hc3NldHMvcmVtb3RlRW50cnkuanNgLFxyXG4gICAgICAgICAgICBmcm9tOiBcInZpdGVcIixcclxuICAgICAgICAgICAgZXh0ZXJuYWxUeXBlOiBcInVybFwiLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIG1mZV9ib29raW5nczoge1xyXG4gICAgICAgICAgICBleHRlcm5hbDogYCR7ZW52LlZJVEVfQk9PS0lOR1NfVVJMfS9hc3NldHMvcmVtb3RlRW50cnkuanNgLFxyXG4gICAgICAgICAgICBmcm9tOiBcInZpdGVcIixcclxuICAgICAgICAgICAgZXh0ZXJuYWxUeXBlOiBcInVybFwiLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIG1mZV9nb2xkZXJwOiB7XHJcbiAgICAgICAgICAgIGV4dGVybmFsOiBgJHtlbnYuVklURV9HT0xERVJQX1VSTH0vYXNzZXRzL3JlbW90ZUVudHJ5LmpzYCxcclxuICAgICAgICAgICAgZnJvbTogXCJ2aXRlXCIsXHJcbiAgICAgICAgICAgIGV4dGVybmFsVHlwZTogXCJ1cmxcIixcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBtZmVfZmluYW5jZToge1xyXG4gICAgICAgICAgICBleHRlcm5hbDogYCR7ZW52LlZJVEVfRklOQU5DRV9VUkx9L2Fzc2V0cy9yZW1vdGVFbnRyeS5qc2AsXHJcbiAgICAgICAgICAgIGZyb206IFwidml0ZVwiLFxyXG4gICAgICAgICAgICBleHRlcm5hbFR5cGU6IFwidXJsXCIsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgbWZlX2thcnR5OiB7XHJcbiAgICAgICAgICAgIGV4dGVybmFsOiBgJHtlbnYuVklURV9LQVJUWV9VUkx9L2Fzc2V0cy9yZW1vdGVFbnRyeS5qc2AsXHJcbiAgICAgICAgICAgIGZyb206IFwidml0ZVwiLFxyXG4gICAgICAgICAgICBleHRlcm5hbFR5cGU6IFwidXJsXCIsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0pLFxyXG4gICAgXSxcclxuICAgIHJlc29sdmU6IHtcclxuICAgICAgYWxpYXM6IHtcclxuICAgICAgICBcIkBqYWxkZWUvZGVzaWduLXN5c3RlbVwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4uLy4uL3BhY2thZ2VzL2Rlc2lnbi1zeXN0ZW0vc3JjL2luZGV4LnRzXCIpLFxyXG4gICAgICAgIFwiQGphbGRlZS9hdXRoLWNvbnRleHRcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuLi8uLi9wYWNrYWdlcy9hdXRoLWNvbnRleHQvc3JjL2luZGV4LnRzXCIpLFxyXG4gICAgICAgIFwiQGphbGRlZS9ldmVudC1idXNcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuLi8uLi9wYWNrYWdlcy9ldmVudC1idXMvc3JjL2luZGV4LnRzXCIpLFxyXG4gICAgICAgIFwiQGphbGRlZS9hcGktY2xpZW50XCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi4vLi4vcGFja2FnZXMvYXBpLWNsaWVudC9zcmMvaW5kZXgudHNcIiksXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gICAgYnVpbGQ6IHtcclxuICAgICAgdGFyZ2V0OiBcImVzbmV4dFwiLFxyXG4gICAgICBtaW5pZnk6IFwiZXNidWlsZFwiLFxyXG4gICAgfSxcclxuICAgIHNlcnZlcjoge1xyXG4gICAgICBwb3J0OiAzMDAwLFxyXG4gICAgICBwcm94eToge1xyXG4gICAgICAgIFwiL2FwaVwiOiB7XHJcbiAgICAgICAgICB0YXJnZXQ6IFwiaHR0cHM6Ly9zY2FsZS5qYWxkZWUuY29tXCIsXHJcbiAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXHJcbiAgICAgICAgICBzZWN1cmU6IHRydWUsXHJcbiAgICAgICAgICByZXdyaXRlOiAocGF0aCkgPT4gcGF0aC5yZXBsYWNlKC9eXFwvYXBpLywgXCIvdjEvcmVzdFwiKSxcclxuICAgICAgICB9LFxyXG4gICAgICB9LFxyXG4gICAgfSxcclxuICB9O1xyXG59KTtcclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUEwVixTQUFTLGNBQWMsZUFBZTtBQUNoWSxPQUFPLFdBQVc7QUFDbEIsT0FBTyxnQkFBZ0I7QUFDdkIsT0FBTyxVQUFVO0FBSGpCLElBQU0sbUNBQW1DO0FBS3pDLElBQU8sc0JBQVEsYUFBYSxDQUFDLEVBQUUsS0FBSyxNQUFNO0FBQ3hDLFFBQU0sTUFBTSxRQUFRLE1BQU0sUUFBUSxJQUFJLEdBQUcsRUFBRTtBQUUzQyxTQUFPO0FBQUEsSUFDTCxTQUFTO0FBQUEsTUFDUCxNQUFNO0FBQUEsTUFDTixXQUFXO0FBQUEsUUFDVCxNQUFNO0FBQUEsUUFDTixTQUFTO0FBQUEsVUFDUCxZQUFZO0FBQUEsWUFDVixVQUFVLEdBQUcsSUFBSSxlQUFlO0FBQUEsWUFDaEMsTUFBTTtBQUFBLFlBQ04sY0FBYztBQUFBLFVBQ2hCO0FBQUEsVUFDQSxjQUFjO0FBQUEsWUFDWixVQUFVLEdBQUcsSUFBSSxpQkFBaUI7QUFBQSxZQUNsQyxNQUFNO0FBQUEsWUFDTixjQUFjO0FBQUEsVUFDaEI7QUFBQSxVQUNBLGFBQWE7QUFBQSxZQUNYLFVBQVUsR0FBRyxJQUFJLGdCQUFnQjtBQUFBLFlBQ2pDLE1BQU07QUFBQSxZQUNOLGNBQWM7QUFBQSxVQUNoQjtBQUFBLFVBQ0EsYUFBYTtBQUFBLFlBQ1gsVUFBVSxHQUFHLElBQUksZ0JBQWdCO0FBQUEsWUFDakMsTUFBTTtBQUFBLFlBQ04sY0FBYztBQUFBLFVBQ2hCO0FBQUEsVUFDQSxXQUFXO0FBQUEsWUFDVCxVQUFVLEdBQUcsSUFBSSxjQUFjO0FBQUEsWUFDL0IsTUFBTTtBQUFBLFlBQ04sY0FBYztBQUFBLFVBQ2hCO0FBQUEsUUFDRjtBQUFBLE1BQ0YsQ0FBQztBQUFBLElBQ0g7QUFBQSxJQUNBLFNBQVM7QUFBQSxNQUNQLE9BQU87QUFBQSxRQUNMLHlCQUF5QixLQUFLLFFBQVEsa0NBQVcsMkNBQTJDO0FBQUEsUUFDNUYsd0JBQXdCLEtBQUssUUFBUSxrQ0FBVywwQ0FBMEM7QUFBQSxRQUMxRixxQkFBcUIsS0FBSyxRQUFRLGtDQUFXLHVDQUF1QztBQUFBLFFBQ3BGLHNCQUFzQixLQUFLLFFBQVEsa0NBQVcsd0NBQXdDO0FBQUEsTUFDeEY7QUFBQSxJQUNGO0FBQUEsSUFDQSxPQUFPO0FBQUEsTUFDTCxRQUFRO0FBQUEsTUFDUixRQUFRO0FBQUEsSUFDVjtBQUFBLElBQ0EsUUFBUTtBQUFBLE1BQ04sTUFBTTtBQUFBLE1BQ04sT0FBTztBQUFBLFFBQ0wsUUFBUTtBQUFBLFVBQ04sUUFBUTtBQUFBLFVBQ1IsY0FBYztBQUFBLFVBQ2QsUUFBUTtBQUFBLFVBQ1IsU0FBUyxDQUFDQSxVQUFTQSxNQUFLLFFBQVEsVUFBVSxVQUFVO0FBQUEsUUFDdEQ7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogWyJwYXRoIl0KfQo=
