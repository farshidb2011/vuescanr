import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";

export default defineConfig(() => {
  const baseConfig = {
    plugins: [vue()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
  };
  // playground (dev + build)
  return {
    ...baseConfig,
    root: "playground",
    server: {
      https: {
        key: "./nginx/localhost-key.pem",
        cert: "./nginx/localhost-cert.pem",
      },
      host: true,
      port: 5173,
    },
    build: {
      outDir: path.resolve(__dirname, "playground-dist"),
      emptyOutDir: true,
    },
  };
});
