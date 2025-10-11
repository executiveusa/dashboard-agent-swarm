import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const flowiseProxy = {
  target: "http://localhost:3000",
  changeOrigin: true,
  rewrite: (path: string) => path.replace(/^\/agents\//, "/"),
// Proxy Flowise UI/API at /agents during dev
const proxyFlowise = {
  target: 'http://localhost:3000',
  changeOrigin: true,
  secure: false
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    fs: {
      allow: [
        path.resolve(__dirname, "ai-agent-platform/packages/shared/src"),
      ],
    },
    proxy: {
      "/agents/": flowiseProxy,
    },
      '/agents': proxyFlowise,
      '/api/v1': proxyFlowise
    }
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@ai-agent-platform/shared": path.resolve(
        __dirname,
        "./ai-agent-platform/packages/shared/src"
      ),
    },
  },
}));
