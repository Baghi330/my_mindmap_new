<script setup>
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { useMindmapStore } from '../composables/useMindmapStore.js'
import { useToast } from '../composables/useToast.js'
import { useContextMenu } from '../composables/useInteraction.js'
import {
  countDescendants,
  findNode,
  findNodeWithParent,
  getSiblingInfo,
} from '../core/tree.js'
import { toPersianDigits } from '../utils/text.js'
import UiIcon from './UiIcon.vue'

const store = useMindmapStore()
const toast = useToast()
const { contextMenu, closeContextMenu } = useContextMenu()

const node = computed(() =>
  contextMenu.value ? findNode(store.tree.value, contextMenu.value.nodeId) : null,
)
const isRoot = computed(() => node.value?.id === store.tree.value.id)
const hasChildren = computed(() => (node.value?.children?.length || 0) > 0)
const descendantCount = computed(() => (node.value ? countDescendants(node.value) : 0))
const siblingInfo = computed(() =>
  node.value ? getSiblingInfo(store.tree.value, node.value.id) : null,
)
const canMoveUp = computed(() => Boolean(siblingInfo.value && siblingInfo.value.index > 0))
const canMoveDown = computed(() =>
  Boolean(siblingInfo.value && siblingInfo.value.index < siblingInfo.value.count - 1),
)

const menuStyle = computed(() => {
  const current = contextMenu.value
  if (!current) return {}
  const width = 238
  const height = 470
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800
  const left = Math.max(8, Math.min(current.x, viewportWidth - width - 8))
  const top = Math.max(8, Math.min(current.y, viewportHeight - height - 8))
  return { left: `${left}px`, top: `${top}px` }
})

watch(
  () => store.treeRevision.value,
  () => {
    if (contextMenu.value && !node.value) closeContextMenu()
  },
)

function execute(action) {
  if (!node.value) return
  const nodeId = node.value.id
  closeContextMenu()
  if (action === 'child') store.addChild(nodeId)
  else if (action === 'sibling') store.addSibling(nodeId)
  else if (action === 'edit') store.startEditing(nodeId)
  else if (action === 'note') {
    store.selectNode(nodeId)
    store.openPanel('node')
  } else if (action === 'collapse') store.toggleCollapse(nodeId)
  else if (action === 'replay') store.replayBranch(nodeId)
  else if (action === 'focus') store.focusNode(nodeId)
  else if (action === 'move-up') store.moveSibling(nodeId, -1)
  else if (action === 'move-down') store.moveSibling(nodeId, 1)
  else if (action === 'delete') store.requestDeleteNode(nodeId)
}

function handlePointerDown(event) {
  if (!contextMenu.value) return
  if (event.target.closest?.('.context-menu')) return
  closeContextMenu()
}

function handleKeydown(event) {
  if (event.key === 'Escape' && contextMenu.value) closeContextMenu()
}

onMounted(() => {
  document.addEventListener('pointerdown', handlePointerDown, true)
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handlePointerDown, true)
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="context-fade">
      <div
        v-if="contextMenu && node"
        class="context-menu menu"
        :style="menuStyle"
        role="menu"
        aria-label="عملیات گره"
      >
        <div class="context-title">
          <span class="context-dot" aria-hidden="true"></span>
          <span class="context-label">{{ node.label }}</span>
          <span v-if="descendantCount > 0" class="context-count">
            {{ toPersianDigits(descendantCount) }}
          </span>
        </div>
        <div class="menu-separator"></div>
        <button type="button" class="menu-item" role="menuitem" @click="execute('child')">
          <UiIcon name="plus" :size="15" />
          <span>افزودن فرزند</span>
          <span class="menu-hint">Tab</span>
        </button>
        <button
          type="button"
          class="menu-item"
          role="menuitem"
          :disabled="isRoot"
          @click="execute('sibling')"
        >
          <UiIcon name="branch" :size="15" />
          <span>افزودن همسایه</span>
          <span class="menu-hint">⇧Enter</span>
        </button>
        <button type="button" class="menu-item" role="menuitem" @click="execute('edit')">
          <UiIcon name="pencil" :size="15" />
          <span>ویرایش عنوان</span>
          <span class="menu-hint">Enter</span>
        </button>
        <button type="button" class="menu-item" role="menuitem" @click="execute('note')">
          <UiIcon name="note" :size="15" />
          <span>{{ node.note ? 'ویرایش یادداشت' : 'افزودن یادداشت' }}</span>
        </button>
        <div class="menu-separator"></div>
        <button
          v-if="hasChildren"
          type="button"
          class="menu-item"
          role="menuitem"
          @click="execute('collapse')"
        >
          <UiIcon :name="node.collapsed ? 'plus' : 'minus'" :size="15" />
          <span>{{ node.collapsed ? 'باز کردن شاخه' : 'بستن شاخه' }}</span>
        </button>
        <button type="button" class="menu-item" role="menuitem" @click="execute('replay')">
          <UiIcon name="replay" :size="15" />
          <span>پخش رشد این شاخه</span>
        </button>
        <button type="button" class="menu-item" role="menuitem" @click="execute('focus')">
          <UiIcon name="target" :size="15" />
          <span>تمرکز روی گره</span>
        </button>
        <div class="menu-separator"></div>
        <button
          type="button"
          class="menu-item"
          role="menuitem"
          :disabled="!canMoveUp"
          @click="execute('move-up')"
        >
          <UiIcon name="arrow-up" :size="15" />
          <span>جابه‌جایی به بالا</span>
        </button>
        <button
          type="button"
          class="menu-item"
          role="menuitem"
          :disabled="!canMoveDown"
          @click="execute('move-down')"
        >
          <UiIcon name="arrow-down" :size="15" />
          <span>جابه‌جایی به پایین</span>
        </button>
        <div class="menu-separator"></div>
        <button
          type="button"
          class="menu-item is-danger"
          role="menuitem"
          :disabled="isRoot"
          @click="execute('delete')"
        >
          <UiIcon name="trash" :size="15" />
          <span>حذف گره</span>
          <span class="menu-hint">Del</span>
        </button>
        <p v-if="isRoot" class="context-root-hint">
          گره مرکزی قابل حذف یا جابه‌جایی نیست.
        </p>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.context-menu {
  position: fixed;
  z-index: 200;
  min-width: 238px;
}

.context-title {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 9px 6px;
}

.context-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent);
  flex: none;
}

.context-label {
  flex: 1;
  min-width: 0;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.context-count {
  flex: none;
  font-size: 9.5px;
  color: var(--text-faint);
  background: var(--surface-muted);
  border-radius: 5px;
  padding: 0 5px;
}

.context-root-hint {
  margin: 4px 8px 4px;
  font-size: 9.5px;
  line-height: 1.7;
  color: var(--text-faint);
}

.context-fade-enter-active,
.context-fade-leave-active {
  transition:
    opacity 120ms ease,
    transform 120ms ease;
  transform-origin: top left;
}

.context-fade-enter-from,
.context-fade-leave-to {
  opacity: 0;
  transform: scale(0.97) translateY(-3px);
}
</style>
