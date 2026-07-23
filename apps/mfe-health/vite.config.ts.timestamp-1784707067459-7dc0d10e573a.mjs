// vite.config.ts
import { defineConfig } from "file:///D:/ebs/UI%20Workspace/jaldee-business-mfe/node_modules/vite/dist/node/index.js";
import react from "file:///D:/ebs/UI%20Workspace/jaldee-business-mfe/node_modules/@vitejs/plugin-react/dist/index.mjs";
import federation from "file:///D:/ebs/UI%20Workspace/jaldee-business-mfe/node_modules/@originjs/vite-plugin-federation/dist/index.mjs";
import path from "path";
var __vite_injected_original_dirname = "D:\\ebs\\UI Workspace\\jaldee-business-mfe\\apps\\mfe-health";
var vite_config_default = defineConfig({
  envDir: path.resolve(__vite_injected_original_dirname, "../shell-host"),
  plugins: [
    react(),
    federation({
      name: "mfe_health",
      filename: "remoteEntry.js",
      exposes: {
        "./mount": "./src/mount.tsx"
      }
    })
  ],
  resolve: {
    alias: {
      "@jaldee/design-system": path.resolve(__vite_injected_original_dirname, "../../packages/design-system/src/index.ts"),
      "@jaldee/auth-context": path.resolve(__vite_injected_original_dirname, "../../packages/auth-context/src/index.ts"),
      "@jaldee/event-bus": path.resolve(__vite_injected_original_dirname, "../../packages/event-bus/src/index.ts"),
      "@jaldee/api-client": path.resolve(__vite_injected_original_dirname, "../../packages/api-client/src/index.ts"),
      "@jaldee/shared-modules": path.resolve(__vite_injected_original_dirname, "../../packages/shared-modules/src/index.ts")
    }
  },
  build: {
    modulePreload: false,
    target: "esnext",
    minify: "esbuild",
    cssCodeSplit: true,
    chunkSizeWarningLimit: 600
  },
  server: {
    port: 3002,
    origin: "http://localhost:3002"
  },
  preview: {
    port: 3002,
    strictPort: true
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxlYnNcXFxcVUkgV29ya3NwYWNlXFxcXGphbGRlZS1idXNpbmVzcy1tZmVcXFxcYXBwc1xcXFxtZmUtaGVhbHRoXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJEOlxcXFxlYnNcXFxcVUkgV29ya3NwYWNlXFxcXGphbGRlZS1idXNpbmVzcy1tZmVcXFxcYXBwc1xcXFxtZmUtaGVhbHRoXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9EOi9lYnMvVUklMjBXb3Jrc3BhY2UvamFsZGVlLWJ1c2luZXNzLW1mZS9hcHBzL21mZS1oZWFsdGgvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xyXG5pbXBvcnQgcmVhY3QgICAgICAgICAgICBmcm9tIFwiQHZpdGVqcy9wbHVnaW4tcmVhY3RcIjtcclxuaW1wb3J0IGZlZGVyYXRpb24gICAgICAgZnJvbSBcIkBvcmlnaW5qcy92aXRlLXBsdWdpbi1mZWRlcmF0aW9uXCI7XHJcbmltcG9ydCBwYXRoICAgICAgICAgICAgIGZyb20gXCJwYXRoXCI7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xyXG4gIGVudkRpcjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuLi9zaGVsbC1ob3N0XCIpLFxyXG4gIHBsdWdpbnM6IFtcclxuICAgIHJlYWN0KCksXHJcbiAgICBmZWRlcmF0aW9uKHtcclxuICAgICAgbmFtZTogICAgIFwibWZlX2hlYWx0aFwiLFxyXG4gICAgICBmaWxlbmFtZTogXCJyZW1vdGVFbnRyeS5qc1wiLFxyXG4gICAgICBleHBvc2VzOiB7XHJcbiAgICAgICAgXCIuL21vdW50XCI6IFwiLi9zcmMvbW91bnQudHN4XCIsXHJcbiAgICAgIH0sXHJcbiAgICB9KSxcclxuICBdLFxyXG4gIHJlc29sdmU6IHtcclxuICAgIGFsaWFzOiB7XHJcbiAgICAgIFwiQGphbGRlZS9kZXNpZ24tc3lzdGVtXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi4vLi4vcGFja2FnZXMvZGVzaWduLXN5c3RlbS9zcmMvaW5kZXgudHNcIiksXHJcbiAgICAgIFwiQGphbGRlZS9hdXRoLWNvbnRleHRcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuLi8uLi9wYWNrYWdlcy9hdXRoLWNvbnRleHQvc3JjL2luZGV4LnRzXCIpLFxyXG4gICAgICBcIkBqYWxkZWUvZXZlbnQtYnVzXCI6ICAgICBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4uLy4uL3BhY2thZ2VzL2V2ZW50LWJ1cy9zcmMvaW5kZXgudHNcIiksXHJcbiAgICAgIFwiQGphbGRlZS9hcGktY2xpZW50XCI6ICAgIHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi4vLi4vcGFja2FnZXMvYXBpLWNsaWVudC9zcmMvaW5kZXgudHNcIiksXHJcbiAgICAgIFwiQGphbGRlZS9zaGFyZWQtbW9kdWxlc1wiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4uLy4uL3BhY2thZ2VzL3NoYXJlZC1tb2R1bGVzL3NyYy9pbmRleC50c1wiKSxcclxuICAgIH0sXHJcbiAgfSxcclxuICBidWlsZDoge1xyXG4gICAgbW9kdWxlUHJlbG9hZDogZmFsc2UsXHJcbiAgICB0YXJnZXQ6ICAgICAgIFwiZXNuZXh0XCIsXHJcbiAgICBtaW5pZnk6ICAgICAgIFwiZXNidWlsZFwiLFxyXG4gICAgY3NzQ29kZVNwbGl0OiB0cnVlLFxyXG4gICAgY2h1bmtTaXplV2FybmluZ0xpbWl0OiA2MDAsXHJcbiAgfSxcclxuICBzZXJ2ZXI6IHtcclxuICAgIHBvcnQ6IDMwMDIsXHJcbiAgICBvcmlnaW46IFwiaHR0cDovL2xvY2FsaG9zdDozMDAyXCIsXHJcbiAgfSxcclxuICBwcmV2aWV3OiB7XHJcbiAgICBwb3J0OiAzMDAyLFxyXG4gICAgc3RyaWN0UG9ydDogdHJ1ZSxcclxuICB9LFxyXG59KTtcclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFxVyxTQUFTLG9CQUFvQjtBQUNsWSxPQUFPLFdBQXNCO0FBQzdCLE9BQU8sZ0JBQXNCO0FBQzdCLE9BQU8sVUFBc0I7QUFIN0IsSUFBTSxtQ0FBbUM7QUFLekMsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsUUFBUSxLQUFLLFFBQVEsa0NBQVcsZUFBZTtBQUFBLEVBQy9DLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQSxJQUNOLFdBQVc7QUFBQSxNQUNULE1BQVU7QUFBQSxNQUNWLFVBQVU7QUFBQSxNQUNWLFNBQVM7QUFBQSxRQUNQLFdBQVc7QUFBQSxNQUNiO0FBQUEsSUFDRixDQUFDO0FBQUEsRUFDSDtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wseUJBQXlCLEtBQUssUUFBUSxrQ0FBVywyQ0FBMkM7QUFBQSxNQUM1Rix3QkFBd0IsS0FBSyxRQUFRLGtDQUFXLDBDQUEwQztBQUFBLE1BQzFGLHFCQUF5QixLQUFLLFFBQVEsa0NBQVcsdUNBQXVDO0FBQUEsTUFDeEYsc0JBQXlCLEtBQUssUUFBUSxrQ0FBVyx3Q0FBd0M7QUFBQSxNQUN6RiwwQkFBMEIsS0FBSyxRQUFRLGtDQUFXLDRDQUE0QztBQUFBLElBQ2hHO0FBQUEsRUFDRjtBQUFBLEVBQ0EsT0FBTztBQUFBLElBQ0wsZUFBZTtBQUFBLElBQ2YsUUFBYztBQUFBLElBQ2QsUUFBYztBQUFBLElBQ2QsY0FBYztBQUFBLElBQ2QsdUJBQXVCO0FBQUEsRUFDekI7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLFFBQVE7QUFBQSxFQUNWO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixZQUFZO0FBQUEsRUFDZDtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
