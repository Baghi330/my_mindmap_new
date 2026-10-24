<script setup>
import { computed, ref } from 'vue'
import { useMindmapStore } from '../composables/useMindmapStore.js'
import UiIcon from './UiIcon.vue'

const store = useMindmapStore()
const dismissed = ref(false)

const isVisible = computed(
  () => !dismissed.value && store.nodeCount.value <= 1 && !store.isStreaming.value,
)
</script>

<template>
  <Transition name="empty-hint">
    <div v-if="isVisible" class="empty-hint card">
      <button
        type="button"
        class="empty-close"
        title="بستن راهنما"
        aria-label="بستن راهنما"
        @click="dismissed = true"
      >
        <UiIcon name="close" :size="13" />
      </button>
      <div class="empty-head">
        <span class="empty-icon">
          <UiIcon name="sparkles" :size="18" />
        </span>
        <div>
          <strong>از یک موضوع شروع کنید</strong>
          <p>یک نمونهٔ آماده را ببینید یا عنوان گره مرکزی را ویرایش کنید.</p>
        </div>
      </div>
      <div class="empty-actions">
        <button
          type="button"
          class="btn btn-primary btn-sm"
          @click="store.startGeneration('incremental')"
        >
          <UiIcon name="sparkles" :size="14" />
          شبیه‌سازی دریافت تدریجی
        </button>
        <button
          type="button"
          class="btn btn-outline btn-sm"
          @click="store.startGeneration('full')"
        >
          <UiIcon name="branch" :size="14" />
          نمونهٔ کامل
        </button>
      </div>
      <div class="empty-foot">
        <span><kbd>Enter</kbd> ویرایش عنوان</span>
        <span><kbd>Tab</kbd> افزودن فرزند</span>
        <button
          type="button"
          class="empty-edit"
          @click="store.startEditing(store.tree.value.id)"
        >
          ویرایش موضوع مرکزی
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.empty-hint {
  position: fixed;
  z-index: 30;
  top: calc(var(--header-height, 64px) + 16px);
  right: 18px;
  width: 336px;
  padding: 14px;
  border-radius: 16px;
}

.empty-close {
  position: absolute;
  top: 8px;
  left: 8px;
  display: grid;
  place-items: center;
  width: 25px;
  height: 25px;
  border-radius: 7px;
  color: var(--text-faint);
}

.empty-close:hover {
  background: var(--surface-hover);
  color: var(--text);
}

.empty-head {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding-inline-end: 20px;
}

.empty-icon {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  flex: none;
  border-radius: 10px;
  color: var(--accent);
  background: var(--accent-soft);
}

.empty-head strong {
  display: block;
  font-size: 12.8px;
  font-weight: 700;
  margin-bottom: 2px;
}

.empty-head p {
  margin: 0;
  font-size: 11px;
  line-height: 1.7;
  color: var(--text-muted);
}

.empty-actions {
  display: flex;
  gap: 6px;
  margin-top: 11px;
  flex-wrap: wrap;
}

.empty-actions .btn {
  flex: 1;
  min-width: 130px;
}

.empty-foot {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 10px;
  padding-top: 9px;
  border-top: 1px solid var(--border);
  font-size: 9.5px;
  color: var(--text-faint);
}

.empty-foot kbd {
  font-family: inherit;
  font-size: 8.5px;
  padding: 0 4px;
  border-radius: 3px;
  border: 1px solid var(--border-strong);
  background: var(--surface);
}

.empty-edit {
  margin-inline-start: auto;
  font-size: 9.5px;
  font-weight: 600;
  color: var(--accent);
  padding: 3px 6px;
  border-radius: 5px;
}

.empty-edit:hover {
  background: var(--accent-soft);
}

.empty-hint-enter-active,
.empty-hint-leave-active {
  transition:
    opacity 220ms ease,
    transform 220ms ease;
}

.empty-hint-enter-from,
.empty-hint-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (max-width: 720px) {
  .empty-hint {
    top: calc(var(--header-height, 96px) + 10px);
    right: 10px;
    left: 10px;
    width: auto;
  }

  .empty-foot {
    display: none;
  }
}
</style>
