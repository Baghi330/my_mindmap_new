<script setup>
import { useToast } from '../composables/useToast.js'
import UiIcon from './UiIcon.vue'

const { toasts, dismissToast } = useToast()

const icons = {
  success: 'check-circle',
  error: 'alert',
  warning: 'alert',
  info: 'info',
}
</script>

<template>
  <Teleport to="body">
    <TransitionGroup name="toast" tag="div" class="toast-stack" aria-live="polite">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="toast"
        :class="`is-${toast.type}`"
        role="status"
      >
        <span class="toast-icon">
          <UiIcon :name="icons[toast.type] || 'info'" :size="16" />
        </span>
        <span class="toast-message">{{ toast.message }}</span>
        <button
          type="button"
          class="toast-close"
          title="بستن"
          aria-label="بستن پیام"
          @click="dismissToast(toast.id)"
        >
          <UiIcon name="close" :size="12" />
        </button>
      </div>
    </TransitionGroup>
  </Teleport>
</template>

<style scoped>
.toast-stack {
  position: fixed;
  z-index: 300;
  top: calc(var(--header-height, 64px) + 14px);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  gap: 7px;
  width: min(420px, calc(100vw - 24px));
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 9px 10px;
  border-radius: 11px;
  border: 1px solid var(--border);
  background: var(--surface);
  box-shadow: 0 16px 36px -22px var(--shadow);
  pointer-events: auto;
}

.toast-icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 24px;
  height: 24px;
  border-radius: 7px;
  color: var(--accent);
  background: var(--accent-soft);
}

.toast.is-success .toast-icon {
  color: var(--success);
  background: var(--success-soft);
}

.toast.is-error .toast-icon {
  color: var(--danger);
  background: var(--danger-soft);
}

.toast.is-warning .toast-icon {
  color: var(--warning);
  background: var(--warning-soft);
}

.toast-message {
  flex: 1;
  padding-top: 1px;
  font-size: 11.5px;
  line-height: 1.75;
  color: var(--text);
  word-break: break-word;
}

.toast-close {
  display: grid;
  place-items: center;
  flex: none;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  color: var(--text-faint);
}

.toast-close:hover {
  background: var(--surface-hover);
  color: var(--text);
}

.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 200ms ease,
    transform 200ms ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}

.toast-move {
  transition: transform 200ms ease;
}
</style>
