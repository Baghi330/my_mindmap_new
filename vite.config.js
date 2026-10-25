import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [vue()],

  server: {
    host: "127.0.0.1",
    port: 5173,
  },

  test: {
    environment: "node",
    include: ["tests/**/*.test.js"],
  },

  build: {
    lib: {
      // ورودی مخصوص کتابخانه
      entry: resolve(import.meta.dirname, "src/lib.js"),

      // نام خروجی کتابخانه
      name: "MindmapAI",

      // خروجی مناسب برای پروژه‌های Vue و Nuxt
      formats: ["es"],

      // نام دقیق فایل JavaScript
      fileName: () => "mindmap-ai.js",

      // نام دقیق فایل CSS
      cssFileName: "mindmap-ai",
    },

    rollupOptions: {
      // Vue باید توسط پروژه مصرف‌کننده تأمین شود
      external: ["vue"],
    },

    emptyOutDir: true,
  },
});
