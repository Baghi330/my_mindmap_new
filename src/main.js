import { createApp } from 'vue'
import '@fontsource-variable/vazirmatn'
import './styles/base.css'
import App from './App.vue'

/**
 * فونت فارسی پیش از ساخت برنامه بارگذاری می‌شود تا اندازه‌گیری متن
 * در اولین چیدمان با فونت واقعی انجام شود و گره‌ها جابه‌جا نشوند.
 */
async function mountApplication() {
  if (typeof document !== 'undefined' && document.fonts?.load) {
    try {
      await document.fonts.load('600 16px "Vazirmatn Variable"')
    } catch {
      // اگر مرورگر بارگذاری فونت را نپذیرد، با فونت جایگزین ادامه می‌دهیم.
    }
  }
  createApp(App).mount('#app')
}

mountApplication()
