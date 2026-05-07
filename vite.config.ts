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

  return {
    ...baseConfig,
    build: {
      outDir: 'lib-dist',
      lib: {
        entry: path.resolve(__dirname, "src/index.ts"),
        name: "VueScanr",
        fileName: (format) => `vuescanr.${format}.js`,
      },
      rollupOptions: {
        external: ["vue"],
        output: {
          globals: {
            vue: "Vue",
          },
        },
      },
    },
    define: {
      __DEV__: true,
    },
  };
});
