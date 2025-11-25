import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { componentTagger } from "lovable-tagger";

type ProxyConfig = {
  target: string;
  changeOrigin: boolean;
  secure: boolean;
  rewrite?: (path: string) => string;
};

const flowiseProxy: ProxyConfig = {
  target: "http://localhost:3000",
  changeOrigin: true,
  secure: false,
  rewrite: (incomingPath) => incomingPath.replace(/^\/agents/, ""),
};

const apiProxy: ProxyConfig = {
  target: "http://localhost:4000",
  changeOrigin: true,
  secure: false,
};

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/agents": flowiseProxy,
      "/api/v1": apiProxy,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(
    Boolean
  ),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
