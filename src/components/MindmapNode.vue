<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useGrowthEngine } from '../composables/useGrowthEngine.js'
import { useMindmapStore } from '../composables/useMindmapStore.js'
import { useNodeDragState, useContextMenu } from '../composables/useInteraction.js'
import { useViewport } from '../composables/useViewport.js'
import {
  resolveDropTarget,
  shouldCommitTarget,
  DROP_NONE,
} from '../core/dragTarget.js'
import { getBranchColor } from '../theme/palettes.js'
import { toPersianDigits } from '../utils/text.js'
import UiIcon from './UiIcon.vue'

const props = defineProps({
  node: { type: Object, required: true },
  theme: { type: Object, required: true },
  interactive: { type: Boolean, default: true },
})

const store = useMindmapStore()
const growthEngine = useGrowthEngine()
const viewport = useViewport()
const { dragState, beginDrag, setDragPreview, setMousePosition, resetDrag } =
  useNodeDragState()
const { openContextMenu } = useContextMenu()

const DRAG_THRESHOLD = 5

const growthElement = ref(null)
const isHovered = ref(false)
let pointerSession = null
let dragStarted = false
let pointerMoveHandler = null
let pointerUpHandler = null
let pointerCancelHandler = null
let frameRequested = false

const isRoot = computed(() => props.node.depth === 0)
const isSelected = computed(() => store.selectedId.value === props.node.id)
const isSearchMatch = computed(() => store.searchMatchIds.value.has(props.node.id))
const isActiveMatch = computed(
  () => store.activeSearchResult.value?.id === props.node.id,
)
const isDragging = computed(() => dragState.draggingId === props.node.id)
const isDropTarget = computed(
  () => Boolean(dragState.preview.valid) && dragState.targetId === props.node.id,
)
const isInvalidTarget = computed(
  () => dragState.targetId === props.node.id && !dragState.preview.valid,
)
/** جهتی که گره پس از رهاکردن می‌گیرد (فقط انگیزه بصری) */
const proposedSide = computed(() =>
  dragState.targetId === props.node.id ? dragState.preview.side : null,
)


const branchColor = computed(() => getBranchColor(props.theme, props.node.branchIndex))

const colors = computed(() => {
  if (isRoot.value) {
    return {
      fill: props.theme.rootFill,
      stroke: props.theme.rootStroke,
      text: props.theme.rootText,
    }
  }
  return {
    fill: props.node.depth === 1 ? props.theme.nodeFill : props.theme.nodeFillSubtle,
    stroke:
      props.node.depth === 1 ? props.theme.nodeStrokeStrong : props.theme.nodeStroke,
    text: props.node.depth === 1 ? props.theme.nodeText : props.theme.nodeTextMuted,
  }
})

const halfWidth = computed(() => props.node.width / 2)
const halfHeight = computed(() => props.node.height / 2)

const linePositions = computed(() => {
  const startY = -halfHeight.value + props.node.paddingY + props.node.lineHeight / 2
  return props.node.lines.map((line, index) => ({
    ...line,
    y: startY + index * props.node.lineHeight,
  }))
})

const badgeX = computed(() => {
  if (props.node.side === 'right') return halfWidth.value
  if (props.node.side === 'left') return -halfWidth.value
  return -halfWidth.value
})

const badgeRadius = computed(() => (props.node.hiddenCount > 99 ? 12 : 10.5))
const noteDotX = computed(() =>
  props.node.side === 'left' ? -halfWidth.value + 9 : halfWidth.value - 9,
)
const showBadge = computed(
  () => props.node.hasChildren && (props.node.collapsed || isSelected.value || isHovered.value),
)

const barX = computed(() =>
  props.node.side === 'left' ? halfWidth.value - 4.5 : -halfWidth.value + 1.5,
)
const barHeight = computed(() => Math.max(6, props.node.height - 15))

function selectNode() {
  store.selectNode(props.node.id)
}

function handlePointerDown(event) {
  if (event.button !== 0) return
  event.stopPropagation()
  selectNode()
  if (!props.interactive) return
  if (isRoot.value) return
  pointerSession = {
    x: event.clientX,
    y: event.clientY,
    pointerId: event.pointerId,
  }
  dragStarted = false
  pointerMoveHandler = handlePointerMove
  pointerUpHandler = handlePointerUp
  pointerCancelHandler = handlePointerCancel
  window.addEventListener('pointermove', pointerMoveHandler)
  window.addEventListener('pointerup', pointerUpHandler)
  window.addEventListener('pointercancel', pointerCancelHandler)
  window.addEventListener('keydown', handleDragKeydown)
}

/** تبدیل مختصات صفحه به مختصات دنیای مایندمپ، هم‌سو با چیدمان */
function screenToWorld(clientX, clientY) {
  const canvas = document.querySelector('.mindmap-canvas')
  const rect = canvas?.getBoundingClientRect()
  if (!rect) return viewport.screenToWorld(clientX, clientY)
  return viewport.screenToWorld(clientX - rect.left, clientY - rect.top)
}

/**
 * در حالت «جای آزاد» شبح باید دقیقاً زیر نشانگر بماند، поэтому پیش‌نمایش
 * ایندکس درج و سمت به‌روز شود؛ خود مقصد با shouldCommitTarget پایدار می‌ماند.
 */
function updatePreview(clientX, clientY) {
  const world = screenToWorld(clientX, clientY)
  setMousePosition(clientX, clientY, world)

  const next = resolveDropTarget(store.tree.value, props.node.id, world, store.layout.value)
  if (!shouldCommitTarget(dragState.preview, next)) return
  setDragPreview(next)
}

function handlePointerMove(event) {
  if (!pointerSession) return
  if (!dragStarted) {
    const deltaX = event.clientX - pointerSession.x
    const deltaY = event.clientY - pointerSession.y
    if (Math.hypot(deltaX, deltaY) < DRAG_THRESHOLD) return
    dragStarted = true
    beginDrag(props.node.id)
    document.body.classList.add('is-dragging-node')
  }
  // محاسبه پیش‌نمایش حداکثر یک‌ بار در هر فریم
  pointerSession.lastX = event.clientX
  pointerSession.lastY = event.clientY
  if (frameRequested) return
  frameRequested = true
  requestAnimationFrame(() => {
    frameRequested = false
    if (!pointerSession) return
    updatePreview(pointerSession.lastX, pointerSession.lastY)
  })
}

function finishDrag(commit) {
  if (pointerMoveHandler) window.removeEventListener('pointermove', pointerMoveHandler)
  if (pointerUpHandler) {
    window.removeEventListener('pointerup', pointerUpHandler)
    window.removeEventListener('pointercancel', pointerCancelHandler)
  }
  window.removeEventListener('keydown', handleDragKeydown)
  pointerMoveHandler = null
  pointerUpHandler = null
  pointerCancelHandler = null
  const preview = dragState.preview
  if (commit && dragStarted && preview && preview.valid && preview.kind !== DROP_NONE) {
    store.applyDrop(props.node.id, preview)
  }
  dragStarted = false
  pointerSession = null
  frameRequested = false
  resetDrag()
  document.body.classList.remove('is-dragging-node')
}

function handlePointerUp() {
  finishDrag(true)
}

function handlePointerCancel() {
  finishDrag(false)
}

function handleDragKeydown(event) {
  if (event.key !== 'Escape') return
  event.preventDefault()
  event.stopPropagation()
  finishDrag(false)
}

function handleDoubleClick(event) {
  event.stopPropagation()
  if (!props.interactive) return
  store.startEditing(props.node.id)
}

function handleContextMenu(event) {
  event.preventDefault()
  event.stopPropagation()
  if (!props.interactive) return
  selectNode()
  openContextMenu(props.node.id, event.clientX, event.clientY)
}

function toggleCollapse(event) {
  event.stopPropagation()
  store.toggleCollapse(props.node.id)
}

onMounted(() => {
  growthEngine.registerNodeElement(props.node.id, growthElement.value)
})

onBeforeUnmount(() => {
  growthEngine.registerNodeElement(props.node.id, null)
  finishDrag(false)
})
</script>

<template>
  <g
    class="mindmap-node"
    :class="{
      'is-root': isRoot,
      'is-selected': isSelected,
      'is-dragging': isDragging,
      'is-drop-target': isDropTarget,
      'is-invalid-target': isInvalidTarget,
      'is-search-match': isSearchMatch,
    }"
    :data-node-id="node.id"
    :transform="`translate(${node.x} ${node.y})`"
    role="button"
    :aria-label="node.label"
    @pointerdown="handlePointerDown"
    @pointerenter="isHovered = true"
    @pointerleave="isHovered = false"
    @dblclick="handleDoubleClick"
    @contextmenu="handleContextMenu"
  >
    <title>{{ node.label }}{{ node.hasNote ? ' — یادداشت دارد' : '' }}</title>
    <g ref="growthElement" class="node-growth" opacity="0">
      <rect
        v-if="isDropTarget"
        class="drop-glow"
        :x="-halfWidth - 7"
        :y="-halfHeight - 7"
        :width="node.width + 14"
        :height="node.height + 14"
        :rx="node.radius + 7"
        fill="none"
        :stroke="theme.accent"
        stroke-width="2"
        stroke-dasharray="5 4"
      />
      <rect
        v-if="isInvalidTarget"
        class="invalid-glow"
        :x="-halfWidth - 6"
        :y="-halfHeight - 6"
        :width="node.width + 12"
        :height="node.height + 12"
        :rx="node.radius + 6"
        fill="none"
        :stroke="theme.danger"
        stroke-width="1.6"
        stroke-dasharray="3 3"
        opacity="0.7"
      />
      <rect
        v-if="isSearchMatch"
        class="search-glow"
        :class="{ 'is-active': isActiveMatch }"
        :x="-halfWidth - 5"
        :y="-halfHeight - 5"
        :width="node.width + 10"
        :height="node.height + 10"
        :rx="node.radius + 5"
        :fill="isActiveMatch ? theme.searchFill : 'none'"
        :stroke="theme.searchRing"
        :stroke-width="isActiveMatch ? 2 : 1.4"
        :stroke-dasharray="isActiveMatch ? 'none' : '4 3'"
      />
      <rect
        v-if="isSelected"
        class="selection-ring"
        :x="-halfWidth - 3.5"
        :y="-halfHeight - 3.5"
        :width="node.width + 7"
        :height="node.height + 7"
        :rx="node.radius + 3.5"
        fill="none"
        :stroke="theme.selectionRing"
        stroke-width="1.6"
        opacity="0.95"
      />
      <rect
        class="node-surface"
        :x="-halfWidth"
        :y="-halfHeight"
        :width="node.width"
        :height="node.height"
        :rx="node.radius"
        :fill="colors.fill"
        :stroke="colors.stroke"
        stroke-width="1.1"
        :filter="isRoot ? 'url(#node-shadow-strong)' : 'url(#node-shadow)'"
      />
      <rect
        v-if="!isRoot && node.branchIndex >= 0"
        class="branch-bar"
        :x="barX"
        :y="-barHeight / 2"
        width="3"
        :height="barHeight"
        rx="1.5"
        :fill="branchColor"
        :opacity="node.depth === 1 ? 0.9 : 0.42"
      />
      <rect
        class="hover-ring"
        :x="-halfWidth - 2"
        :y="-halfHeight - 2"
        :width="node.width + 4"
        :height="node.height + 4"
        :rx="node.radius + 2"
        fill="none"
        :stroke="theme.borderStrong"
        stroke-width="1"
      />
      <text
        v-for="(line, index) in linePositions"
        :key="index"
        class="node-label"
        x="0"
        :y="line.y"
        text-anchor="middle"
        dominant-baseline="central"
        :direction="line.direction"
        :font-size="node.fontSize"
        :font-weight="node.fontWeight"
        :fill="colors.text"
      >
        {{ line.text }}
      </text>
      <circle
        v-if="node.hasNote"
        class="note-dot"
        :cx="noteDotX"
        :cy="-halfHeight + 9"
        r="3"
        :fill="theme.noteColor"
        opacity="0.9"
      >
        <title>این گره یادداشت دارد</title>
      </circle>
      <g
        v-if="node.hasChildren"
        class="collapse-toggle"
        :class="{ 'is-visible': showBadge }"
        @pointerdown.stop
        @dblclick.stop
        @click.stop="toggleCollapse"
      >
        <circle
          :cx="badgeX"
          cy="0"
          :r="badgeRadius"
          :fill="theme.badgeFill"
          :stroke="node.collapsed ? branchColor : theme.badgeStroke"
          :stroke-width="node.collapsed ? 1.4 : 1"
        >
          <title>{{ node.collapsed ? 'باز کردن شاخه' : 'بستن شاخه' }}</title>
        </circle>
        <text
          class="badge-text"
          :x="badgeX"
          y="0.5"
          text-anchor="middle"
          dominant-baseline="central"
          :font-size="node.hiddenCount > 99 ? 8.5 : 9.5"
          font-weight="700"
          :fill="node.collapsed ? branchColor : theme.badgeText"
        >
          {{ node.collapsed ? toPersianDigits(node.hiddenCount) : '−' }}
        </text>
      </g>
      <!-- جهت مقصد: فلش رو به سمت شاخه‌ای که گره در آن قرار می‌گیرد -->
      <g v-if="proposedSide && isDropTarget" class="side-indicator">
        <path
          :d="proposedSide === 'left' ? '-A -A L 0 -A L -A 0 Z' : 'A -A L 0 -A L A 0 Z'"
          :transform="`translate(${proposedSide === 'left' ? -halfWidth - 26 : halfWidth + 26} 0)`"
          :fill="theme.accent"
          opacity="0.9"
        />
      </g>
      <g v-if="isDropTarget" class="drop-label">
        <rect
          :x="-halfWidth"
          :y="halfHeight + 9"
          :width="node.width"
          height="19"
          rx="6"
          :fill="theme.accent"
        />
        <text
          x="0"
          :y="halfHeight + 19"
          text-anchor="middle"
          dominant-baseline="central"
          font-size="9.5"
          font-weight="600"
          :fill="theme.accentText"
        >
          {{ dragState.preview.kind === 'child' ? 'فرزند این گره' : 'درج در این جایگاه' }}
        </text>
      </g>
      <UiIcon
        v-if="isDragging"
        name="branch"
        :size="14"
        class="drag-icon"
        :x="-7"
        :y="halfHeight + 6"
      />
    </g>
  </g>
</template>

<style scoped>
.mindmap-node {
  cursor: grab;
  outline: none;
  -webkit-tap-highlight-color: transparent;
}

.mindmap-node.is-dragging {
  cursor: grabbing;
}

.mindmap-node .node-growth {
  will-change: transform, opacity;
}

.mindmap-node.is-dragging .node-growth {
  filter: opacity(0.38);
  transition: opacity 120ms ease;
}

.mindmap-node.is-dragging .node-surface {
  stroke-dasharray: 4 3;
}

.node-label {
  font-family:
    'Vazirmatn Variable',
    Vazirmatn,
    'Noto Sans Arabic UI',
    'Segoe UI',
    Tahoma,
    sans-serif;
  pointer-events: none;
  user-select: none;
  letter-spacing: 0;
}

.badge-text {
  font-family:
    'Vazirmatn Variable',
    Vazirmatn,
    'Noto Sans Arabic UI',
    'Segoe UI',
    Tahoma,
    sans-serif;
  pointer-events: none;
  user-select: none;
}

.hover-ring {
  opacity: 0;
  pointer-events: none;
  transition: opacity 140ms ease;
}

.mindmap-node:hover .hover-ring {
  opacity: 0.75;
}



.selection-ring {
  pointer-events: none;
}

.search-glow {
  pointer-events: none;
}

.drop-glow,
.invalid-glow,
.side-indicator {
  pointer-events: none;
  transition: opacity 120ms ease;
}

.side-indicator {
  animation: side-pulse 1.1s ease-in-out infinite;
}

@keyframes side-pulse {
  0%,
  100% {
    opacity: 0.65;
  }
  50% {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .side-indicator {
    animation: none;
  }
}

.collapse-toggle {
  cursor: pointer;
  opacity: 0;
  transition: opacity 150ms ease;
}

.collapse-toggle.is-visible {
  opacity: 1;
}

.collapse-toggle circle {
  transition: stroke 150ms ease;
}

.drop-label {
  pointer-events: none;
}

.drag-icon {
  pointer-events: none;
  color: var(--accent);
}

.mindmap-node.is-drop-target .node-surface {
  stroke: var(--accent);
  stroke-width: 1.8;
}

.mindmap-node.is-invalid-target {
  cursor: no-drop;
}

.mindmap-node.is-invalid-target .node-surface {
  stroke-dasharray: 3 3;
}
</style>
