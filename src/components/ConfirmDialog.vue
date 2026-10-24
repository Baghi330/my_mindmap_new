<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useConfirm } from '../composables/useConfirm.js'
import UiIcon from './UiIcon.vue'

const { confirmState, resolveConfirm } = useConfirm()
const cancelButton = ref(null)

watch(confirmState, (state) => {
  if (state) {
    nextTick(() => cancelButton.value?.focus())
  }
})

function handleKeydown(event) {
  if (!confirmState.value) return
  if (event.key === 'Escape') {
    event.preventDefault()
    resolveConfirm(false)
  } else if (event.key === 'Enter' && !event.isComposing) {
    const target = event.target
    if (target?.tagName === 'TEXTAREA') return
    event.preventDefault()
    resolveConfirm(true)
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div
        v-if="confirmState"
        class="dialog-overlay"
        role="presentation"
        @pointerdown.self="resolveConfirm(false)"
      >
        <div
          class="dialog card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          :class="{ 'is-danger': confirmState.tone === 'danger' }"
        >
          <div class="dialog-icon">
            <UiIcon
              :name="confirmState.tone === 'danger' ? 'trash' : 'info'"
              :size="19"
            />
          </div>
          <h2 id="confirm-title">{{ confirmState.title }}</h2>
          <p>{{ confirmState.message }}</p>
          <div class="dialog-actions">
            <button
              ref="cancelButton"
              type="button"
              class="btn btn-outline"
              @click="resolveConfirm(false)"
            >
              {{ confirmState.cancelLabel }}
            </button>
            <button
              type="button"
              class="btn"
              :class="confirmState.tone === 'danger' ? 'btn-danger' : 'btn-primary'"
              @click="resolveConfirm(true)"
            >
              {{ confirmState.confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 260;
  display: grid;
  place-items: center;
  padding: 18px;
  background: color-mix(in srgb, #0a0f18 42%, transparent);
  backdrop-filter: blur(4px);
}

.dialog {
  width: min(400px, 100%);
  padding: 20px;
  border-radius: 18px;
  background: var(--surface);
  text-align: right;
}

.dialog-icon {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 11px;
  margin-bottom: 12px;
  color: var(--accent);
  background: var(--accent-soft);
}

.dialog.is-danger .dialog-icon {
  color: var(--danger);
  background: var(--danger-soft);
}

.dialog h2 {
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 700;
}

.dialog p {
  margin: 0;
  font-size: 12px;
  line-height: 1.85;
  color: var(--text-muted);
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 7px;
  margin-top: 18px;
}

.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 180ms ease;
}

.dialog-enter-active .dialog,
.dialog-leave-active .dialog {
  transition: transform 200ms ease;
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}

.dialog-enter-from .dialog,
.dialog-leave-to .dialog {
  transform: translateY(8px) scale(0.98);
}
</style>
