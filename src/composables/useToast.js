/**
 * پیام‌های کوتاه بازخورد (Toast) برای موفقیت، خطا و اطلاع‌رسانی.
 */
import { ref } from 'vue'

const toasts = ref([])
const timers = new Map()
let nextId = 1

function dismissToast(id) {
  const timer = timers.get(id)
  if (timer) {
    clearTimeout(timer)
    timers.delete(id)
  }
  toasts.value = toasts.value.filter((toast) => toast.id !== id)
}

function pushToast(message, type = 'info', duration = 3600) {
  if (!message) return null
  const id = nextId
  nextId += 1
  toasts.value = [...toasts.value.slice(-3), { id, message, type }]
  if (duration > 0) {
    const timer = setTimeout(() => dismissToast(id), duration)
    timers.set(id, timer)
  }
  return id
}

/** پاک‌سازی همه تایمرها هنگام بسته‌شدن برنامه */
function clearToasts() {
  timers.forEach((timer) => clearTimeout(timer))
  timers.clear()
  toasts.value = []
}

export function useToast() {
  return {
    toasts,
    dismissToast,
    clearToasts,
    info: (message, duration) => pushToast(message, 'info', duration),
    success: (message, duration) => pushToast(message, 'success', duration),
    error: (message, duration) => pushToast(message, 'error', duration ?? 5200),
    warning: (message, duration) => pushToast(message, 'warning', duration),
  }
}
