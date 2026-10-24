<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useMindmapStore } from '../composables/useMindmapStore.js'
import { useViewport } from '../composables/useViewport.js'
import { findNode } from '../core/tree.js'

const store = useMindmapStore()
const viewport = useViewport()
const textarea = ref(null)
const draft = ref('')
let suppressBlur = false

const editingNode = computed(() => {
  const id = store.editingId.value
  if (!id) return null
  const layoutNode = store.layout.value.nodeMap.get(id)
  const treeNode = findNode(store.tree.value, id)
  if (!layoutNode || !treeNode) return null
  return { layout: layoutNode, tree: treeNode }
})

const editorStyle = computed(() => {
  const item = editingNode.value
  if (!item) return {}
  const scale = viewport.scale.value
  const width = Math.max(150, item.layout.width * scale)
  const minHeight = Math.max(40, item.layout.height * scale)
  return {
    left: `${viewport.translateX.value + item.layout.x * scale}px`,
    top: `${viewport.translateY.value + item.layout.y * scale}px`,
    width: `${width}px`,
    minHeight: `${minHeight}px`,
    fontSize: `${Math.max(12, item.layout.fontSize * scale)}px`,
    borderRadius: `${Math.max(8, item.layout.radius * scale)}px`,
  }
})

function focusEditor() {
  nextTick(() => {
    const element = textarea.value
    if (!element) return
    element.focus({ preventScroll: true })
    element.select()
    resizeTextarea()
  })
}

function resizeTextarea() {
  const element = textarea.value
  if (!element) return
  element.style.height = 'auto'
  const item = editingNode.value
  const minHeight = item ? Math.max(38, item.layout.height * viewport.scale.value - 12) : 38
  element.style.height = `${Math.max(minHeight, element.scrollHeight)}px`
}

watch(
  () => store.editingId.value,
  (id) => {
    if (!id) {
      draft.value = ''
      return
    }
    const treeNode = findNode(store.tree.value, id)
    draft.value = treeNode ? treeNode.label : ''
    suppressBlur = false
    focusEditor()
  },
  { immediate: true },
)

watch(draft, () => {
  resizeTextarea()
})

function commit() {
  if (suppressBlur) return
  const id = store.editingId.value
  if (!id) return
  const result = store.commitLabel(id, draft.value)
  if (!result.ok) {
    nextTick(() => textarea.value?.focus())
  }
}

function cancel() {
  suppressBlur = true
  store.stopEditing()
  nextTick(() => {
    suppressBlur = false
  })
}

function handleKeydown(event) {
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    cancel()
    return
  }
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    event.stopPropagation()
    commit()
    return
  }
  if (event.key === 'Tab') {
    event.preventDefault()
    event.stopPropagation()
    commit()
  }
}

function handleBlur() {
  if (suppressBlur) return
  commit()
}
</script>

<template>
  <div
    v-if="editingNode"
    class="node-editor"
    :style="editorStyle"
    @pointerdown.stop
    @wheel.stop
    @dblclick.stop
    @contextmenu.stop.prevent
  >
    <textarea
      ref="textarea"
      v-model="draft"
      class="node-editor-input"
      dir="auto"
      spellcheck="false"
      rows="1"
      aria-label="ویرایش عنوان گره"
      @keydown="handleKeydown"
      @blur="handleBlur"
    />
    <div class="node-editor-hint">
      <kbd>Enter</kbd> ذخیره
      <span aria-hidden="true">·</span>
      <kbd>Esc</kbd> انصراف
      <span aria-hidden="true">·</span>
      <kbd>Shift+Enter</kbd> خط جدید
    </div>
  </div>
</template>

<style scoped>
.node-editor {
  position: absolute;
  z-index: 40;
  transform: translate(-50%, -50%);
  padding: 5px;
  border-radius: 12px;
  background: var(--panel-bg);
  border: 1px solid var(--accent);
  box-shadow:
    0 0 0 4px color-mix(in srgb, var(--accent) 12%, transparent),
    0 18px 40px -18px var(--shadow);
  backdrop-filter: blur(10px);
}

.node-editor-input {
  display: block;
  width: 100%;
  min-height: 38px;
  height: 100%;
  padding: 6px 8px;
  border: 0;
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
  font-family:
    'Vazirmatn Variable',
    Vazirmatn,
    'Noto Sans Arabic UI',
    'Segoe UI',
    Tahoma,
    sans-serif;
  font-weight: 600;
  line-height: 1.75;
  text-align: start;
  resize: none;
  overflow: auto;
  outline: none;
}

.node-editor-hint {
  position: absolute;
  top: calc(100% + 7px);
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  font-size: 10px;
  color: var(--text-faint);
  display: flex;
  align-items: center;
  gap: 4px;
  pointer-events: none;
  background: var(--panel-bg);
  padding: 2px 7px;
  border-radius: 6px;
  border: 1px solid var(--border);
}

.node-editor-hint kbd {
  font-family: inherit;
  font-size: 9px;
  padding: 0 3px;
  border-radius: 3px;
  border: 1px solid var(--border-strong);
  background: var(--surface-muted);
  color: var(--text-muted);
}

@media (max-width: 720px) {
  .node-editor-hint {
    display: none;
  }
}
</style>
