import { createApp } from "vue";
import "@fontsource-variable/vazirmatn";
import "./styles/base.css";
import App from "./App.vue";

/**
 * نقطه اتصال داده پروژه میزبان.
 * در پروژه خودتان داده را از API بگیرید و به پراپ data بدهید:
 *
 *   const data = await fetch('/api/mindmap').then((r) => r.json())
 *   createApp(App, { data }).mount('#app')
 *
 * ساختار: { id, label, note?, collapsed?, children: [...] } یا { root }
 * تا وقتی داده‌ای نرسد، نقشه خالی و فقط با گره مرکزی نمایش داده می‌شود.
 */
const projectData = window.__MINDMAP_DATA__ ?? null;

/**
 * فونت فارسی پیش از ساخت برنامه بارگذاری می‌شود تا اندازه‌گیری متن
 * در اولین چیدمان با فونت واقعی انجام شود و گره‌ها جابه‌جا نشوند.
 */
async function mountApplication() {
  if (typeof document !== "undefined" && document.fonts?.load) {
    try {
      await document.fonts.load('600 16px "Vazirmatn Variable"');
    } catch {
      // اگر مرورگر بارگذاری فونت را نپذیرد، با فونت جایگزین ادامه می‌دهیم.
    }
  }
  createApp(App, { data: projectData }).mount("#app");
}

mountApplication();
