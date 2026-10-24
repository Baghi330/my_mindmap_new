/**
 * دیالوگ تأیید سبک و قابل استفاده با await.
 */
import { ref } from 'vue'

const confirmState = ref(null)

export function askConfirm(options = {}) {
  if (confirmState.value) {
    confirmState.value.resolve(false)
  }
  return new Promise((resolve) => {
    confirmState.value = {
      title: options.title || 'تأیید عملیات',
      message: options.message || '',
      confirmLabel: options.confirmLabel || 'تأیید',
      cancelLabel: options.cancelLabel || 'انصراف',
      tone: options.tone || 'default',
      resolve,
    }
  })
}

export function resolveConfirm(value) {
  const current = confirmState.value
  if (!current) return
  confirmState.value = null
  current.resolve(Boolean(value))
}

export function useConfirm() {
  return { confirmState, askConfirm, resolveConfirm }
}
