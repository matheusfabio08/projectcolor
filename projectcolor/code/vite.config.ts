import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          // Repassa cookies do navegador para o backend corretamente
          proxy.on("proxyReq", (proxyReq, req) => {
            if (req.headers.cookie) {
              proxyReq.setHeader("cookie", req.headers.cookie);
            }
          });
        },
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 5000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    }

  },
});
