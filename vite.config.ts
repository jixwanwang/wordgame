import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  root: "./client",
  build: {
    outDir: "../dist/public",
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client/src"),
      "@shared/lib": path.resolve(__dirname, "./lib"),
      "@shared/schema": path.resolve(__dirname, "./lib/schema"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
