// vite.config.ts
import { defineConfig } from "file:///D:/ebs/UI%20Workspace/jaldee-business-mfe/node_modules/vite/dist/node/index.js";
import react from "file:///D:/ebs/UI%20Workspace/jaldee-business-mfe/node_modules/@vitejs/plugin-react/dist/index.mjs";
import federation from "file:///D:/ebs/UI%20Workspace/jaldee-business-mfe/node_modules/@originjs/vite-plugin-federation/dist/index.mjs";
import path from "path";
var __vite_injected_original_dirname = "D:\\ebs\\UI Workspace\\jaldee-business-mfe\\apps\\mfe-hr";
var vite_config_default = defineConfig({
  envDir: path.resolve(__vite_injected_original_dirname, "../shell-host"),
  base: "./",
  plugins: [
    react(),
    federation({
      name: "mfe_hr",
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
    target: "esnext",
    minify: "esbuild",
    cssCodeSplit: false
  },
  server: {
    port: 3007,
    origin: "http://localhost:3007"
  },
  preview: {
    port: 3007,
    strictPort: true
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxlYnNcXFxcVUkgV29ya3NwYWNlXFxcXGphbGRlZS1idXNpbmVzcy1tZmVcXFxcYXBwc1xcXFxtZmUtaHJcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkQ6XFxcXGVic1xcXFxVSSBXb3Jrc3BhY2VcXFxcamFsZGVlLWJ1c2luZXNzLW1mZVxcXFxhcHBzXFxcXG1mZS1oclxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRDovZWJzL1VJJTIwV29ya3NwYWNlL2phbGRlZS1idXNpbmVzcy1tZmUvYXBwcy9tZmUtaHIvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xyXG5pbXBvcnQgcmVhY3QgICAgICAgICAgICBmcm9tIFwiQHZpdGVqcy9wbHVnaW4tcmVhY3RcIjtcclxuaW1wb3J0IGZlZGVyYXRpb24gICAgICAgZnJvbSBcIkBvcmlnaW5qcy92aXRlLXBsdWdpbi1mZWRlcmF0aW9uXCI7XHJcbmltcG9ydCBwYXRoICAgICAgICAgICAgIGZyb20gXCJwYXRoXCI7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xyXG4gIGVudkRpcjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuLi9zaGVsbC1ob3N0XCIpLFxyXG4gIGJhc2U6IFwiLi9cIixcclxuICBwbHVnaW5zOiBbXHJcbiAgICByZWFjdCgpLFxyXG4gICAgZmVkZXJhdGlvbih7XHJcbiAgICAgIG5hbWU6ICAgICBcIm1mZV9oclwiLFxyXG4gICAgICBmaWxlbmFtZTogXCJyZW1vdGVFbnRyeS5qc1wiLFxyXG4gICAgICBleHBvc2VzOiB7XHJcbiAgICAgICAgXCIuL21vdW50XCI6IFwiLi9zcmMvbW91bnQudHN4XCIsXHJcbiAgICAgIH0sXHJcbiAgICB9KSxcclxuICBdLFxyXG4gIHJlc29sdmU6IHtcclxuICAgIGFsaWFzOiB7XHJcbiAgICAgIFwiQGphbGRlZS9kZXNpZ24tc3lzdGVtXCI6ICBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4uLy4uL3BhY2thZ2VzL2Rlc2lnbi1zeXN0ZW0vc3JjL2luZGV4LnRzXCIpLFxyXG4gICAgICBcIkBqYWxkZWUvYXV0aC1jb250ZXh0XCI6ICAgcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuLi8uLi9wYWNrYWdlcy9hdXRoLWNvbnRleHQvc3JjL2luZGV4LnRzXCIpLFxyXG4gICAgICBcIkBqYWxkZWUvZXZlbnQtYnVzXCI6ICAgICAgcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuLi8uLi9wYWNrYWdlcy9ldmVudC1idXMvc3JjL2luZGV4LnRzXCIpLFxyXG4gICAgICBcIkBqYWxkZWUvYXBpLWNsaWVudFwiOiAgICAgcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuLi8uLi9wYWNrYWdlcy9hcGktY2xpZW50L3NyYy9pbmRleC50c1wiKSxcclxuICAgICAgXCJAamFsZGVlL3NoYXJlZC1tb2R1bGVzXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi4vLi4vcGFja2FnZXMvc2hhcmVkLW1vZHVsZXMvc3JjL2luZGV4LnRzXCIpLFxyXG4gICAgfSxcclxuICB9LFxyXG4gIGJ1aWxkOiB7XHJcbiAgICB0YXJnZXQ6ICAgICAgIFwiZXNuZXh0XCIsXHJcbiAgICBtaW5pZnk6ICAgICAgIFwiZXNidWlsZFwiLFxyXG4gICAgY3NzQ29kZVNwbGl0OiBmYWxzZSxcclxuICB9LFxyXG4gIHNlcnZlcjoge1xyXG4gICAgcG9ydDogNDAwOCxcclxuICAgIG9yaWdpbjogXCJodHRwOi8vbG9jYWxob3N0OjQwMDhcIixcclxuICB9LFxyXG4gIHByZXZpZXc6IHtcclxuICAgIHBvcnQ6IDQwMDgsXHJcbiAgICBzdHJpY3RQb3J0OiB0cnVlLFxyXG4gIH0sXHJcbn0pO1xyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXlWLFNBQVMsb0JBQW9CO0FBQ3RYLE9BQU8sV0FBc0I7QUFDN0IsT0FBTyxnQkFBc0I7QUFDN0IsT0FBTyxVQUFzQjtBQUg3QixJQUFNLG1DQUFtQztBQUt6QyxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixRQUFRLEtBQUssUUFBUSxrQ0FBVyxlQUFlO0FBQUEsRUFDL0MsTUFBTTtBQUFBLEVBQ04sU0FBUztBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ04sV0FBVztBQUFBLE1BQ1QsTUFBVTtBQUFBLE1BQ1YsVUFBVTtBQUFBLE1BQ1YsU0FBUztBQUFBLFFBQ1AsV0FBVztBQUFBLE1BQ2I7QUFBQSxJQUNGLENBQUM7QUFBQSxFQUNIO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCx5QkFBMEIsS0FBSyxRQUFRLGtDQUFXLDJDQUEyQztBQUFBLE1BQzdGLHdCQUEwQixLQUFLLFFBQVEsa0NBQVcsMENBQTBDO0FBQUEsTUFDNUYscUJBQTBCLEtBQUssUUFBUSxrQ0FBVyx1Q0FBdUM7QUFBQSxNQUN6RixzQkFBMEIsS0FBSyxRQUFRLGtDQUFXLHdDQUF3QztBQUFBLE1BQzFGLDBCQUEwQixLQUFLLFFBQVEsa0NBQVcsNENBQTRDO0FBQUEsSUFDaEc7QUFBQSxFQUNGO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCxRQUFjO0FBQUEsSUFDZCxRQUFjO0FBQUEsSUFDZCxjQUFjO0FBQUEsRUFDaEI7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLFFBQVE7QUFBQSxFQUNWO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixZQUFZO0FBQUEsRUFDZDtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
