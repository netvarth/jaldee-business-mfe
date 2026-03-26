import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: path.resolve(__dirname, "preview"),
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, "dist-preview"),
    emptyOutDir: true,
  },
});
