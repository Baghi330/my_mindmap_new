<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useGrowthEngine } from '../composables/useGrowthEngine.js'
import { useMindmapStore } from '../composables/useMindmapStore.js'
import { useViewport } from '../composables/useViewport.js'
import { getBranchColor } from '../theme/palettes.js'
import { toPersianDigits } from '../utils/text.js'
import { useContextMenu } from '../composables/useInteraction.js'
import MindmapEdge from './MindmapEdge.vue'
import MindmapNode from './MindmapNode.vue'
import NodeEditor from './NodeEditor.vue'
import UiIcon from './UiIcon.vue'

const store = useMindmapStore()
const growthEngine = useGrowthEngine()
const viewport = useViewport()
const { closeContextMenu } = useContextMenu()

const canvasRoot = ref(null)
const theme = computed(() => store.theme.value)
const layout = computed(() => store.layout.value)

let resizeObserver = null
let hasFitted = false
let lastInstantToken = 0
let userAdjustedView = false
let pendingStreamFit = false
let lastAutoFitTime = 0

const activePointers = new Map()
let panState = null
let pinchState = null
let panMoved = false

const gridStyle = computed(() => {
  const scale = viewport.scale.value
  const size = Math.max(16, 26 * scale)
  return {
    backgroundSize: `${size}px ${size}px`,
    backgroundPosition: `${viewport.translateX.value}px ${viewport.translateY.value}px`,
  }
})

const zoomLabel = computed(() => `${toPersianDigits(Math.round(viewport.scale.value * 100))}٪`)

function fitInitialView() {
  if (hasFitted) return
  if (viewport.width.value === 0 || viewport.height.value === 0) return
  if (layout.value.nodes.length === 0) return
  hasFitted = true
  viewport.fitView({ padding: 92, instant: true })
}

function isContentOutOfView() {
  if (viewport.width.value === 0 || viewport.height.value === 0) return false
  const bounds = layout.value.bounds
  const margin = 56
  const scale = viewport.scale.value
  const left = viewport.translateX.value + bounds.minX * scale
  const right = viewport.translateX.value + bounds.maxX * scale
  const top = viewport.translateY.value + bounds.minY * scale
  const bottom = viewport.translateY.value + bounds.maxY * scale
  return (
    left < margin ||
    right > viewport.width.value - margin ||
    top < margin ||
    bottom > viewport.height.value - margin
  )
}

function autoFitIfNeeded() {
  if (userAdjustedView) return
  const now = performance.now()
  if (now - lastAutoFitTime < 320) return
  if (!isContentOutOfView()) return
  lastAutoFitTime = now
  viewport.fitView({ padding: 78, duration: 300 })
}

function handleLayoutChange(nextLayout) {
  viewport.setBounds(nextLayout.bounds)

  const shouldSyncInstantly = store.instantSyncToken.value !== lastInstantToken
  if (shouldSyncInstantly) lastInstantToken = store.instantSyncToken.value

  growthEngine.sync(nextLayout.nodes, {
    instant: shouldSyncInstantly || store.isMotionReduced.value,
  })

  if (!hasFitted) {
    nextTick(fitInitialView)
    return
  }

  if (pendingStreamFit && store.isStreaming.value) {
    pendingStreamFit = false
    userAdjustedView = false
    nextTick(() => viewport.fitView({ padding: 86, duration: 280 }))
    return
  }

  if (store.isStreaming.value && !userAdjustedView) {
    autoFitIfNeeded()
  }
}

watch(layout, handleLayoutChange, { immediate: true, flush: 'post' })

watch(
  () => store.isStreaming.value,
  (streaming, previous) => {
    if (streaming && !previous) {
      pendingStreamFit = true
      userAdjustedView = false
      lastAutoFitTime = 0
    }
  },
)

watch(
  () => store.focusRequest.value,
  (request) => {
    if (!request) return
    const node = store.layout.value.nodeMap.get(request.id)
    if (!node) return
    userAdjustedView = true
    viewport.centerOnNode(node, {
      scale: request.scale ?? Math.max(0.85, Math.min(1.2, viewport.scale.value)),
      duration: 460,
    })
  },
)

onMounted(() => {
  const element = canvasRoot.value
  if (!element) return
  resizeObserver = new ResizeObserver((entries) => {
    const entry = entries[0]
    if (!entry) return
    viewport.setViewportSize(entry.contentRect.width, entry.contentRect.height)
    if (!hasFitted) nextTick(fitInitialView)
    if (store.isStreaming.value && !userAdjustedView) autoFitIfNeeded()
  })
  resizeObserver.observe(element)
  const rect = element.getBoundingClientRect()
  viewport.setViewportSize(rect.width, rect.height)
  nextTick(fitInitialView)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  viewport.cancelAnimation()
  activePointers.clear()
  document.body.classList.remove('is-dragging-node', 'is-panning-canvas')
})

function handleWheel(event) {
  if (!canvasRoot.value) return
  const rect = canvasRoot.value.getBoundingClientRect()
  const factor = Math.exp(-event.deltaY * 0.0016)
  viewport.zoomBy(factor, {
    screenX: event.clientX - rect.left,
    screenY: event.clientY - rect.top,
    instant: true,
  })
  userAdjustedView = true
  closeContextMenu()
}

function handlePointerDown(event) {
  closeContextMenu()
  if (event.pointerType === 'mouse' && event.button !== 0 && event.button !== 1) return
  if (event.button === 2) return
  const element = canvasRoot.value
  if (!element) return
  element.setPointerCapture?.(event.pointerId)
  activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
  panMoved = false
  if (activePointers.size === 1) {
    panState = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    }
    element.classList.add('is-panning')
  } else if (activePointers.size === 2) {
    panState = null
    startPinch()
  }
}

function startPinch() {
  const points = [...activePointers.values()]
  if (points.length < 2) return
  const midX = (points[0].x + points[1].x) / 2
  const midY = (points[0].y + points[1].y) / 2
  pinchState = {
    distance: Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y),
    midX,
    midY,
  }
  userAdjustedView = true
}

function handlePointerMove(event) {
  if (!activePointers.has(event.pointerId)) return
  activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY })

  if (activePointers.size >= 2 && pinchState) {
    const points = [...activePointers.values()]
    const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y)
    const midX = (points[0].x + points[1].x) / 2
    const midY = (points[0].y + points[1].y) / 2
    if (pinchState.distance > 0) {
      const rect = canvasRoot.value.getBoundingClientRect()
      viewport.panBy(midX - pinchState.midX, midY - pinchState.midY)
      viewport.zoomBy(distance / pinchState.distance, {
        screenX: midX - rect.left,
        screenY: midY - rect.top,
        instant: true,
      })
    }
    pinchState = { distance, midX, midY }
    panMoved = true
    return
  }

  if (panState && panState.pointerId === event.pointerId) {
    const deltaX = event.clientX - panState.x
    const deltaY = event.clientY - panState.y
    if (!panMoved && Math.hypot(deltaX, deltaY) > 3) {
      panMoved = true
      userAdjustedView = true
      document.body.classList.add('is-panning-canvas')
    }
    if (panMoved) {
      viewport.panBy(deltaX, deltaY)
      panState.x = event.clientX
      panState.y = event.clientY
    }
  }
}

function endPointer(event) {
  activePointers.delete(event.pointerId)
  if (activePointers.size < 2) pinchState = null
  if (panState && panState.pointerId === event.pointerId) panState = null
  if (activePointers.size === 0) {
    canvasRoot.value?.classList.remove('is-panning')
    document.body.classList.remove('is-panning-canvas')
    if (panState && panMoved) viewport.cancelAnimation()
    panState = null
  }
  try {
    canvasRoot.value?.releasePointerCapture?.(event.pointerId)
  } catch {
    // آزادسازی اشاره‌گر پس از پایان لمس ممکن است خطا بدهد؛ نادیده گرفته می‌شود.
  }
}

function handleBackgroundContextMenu(event) {
  event.preventDefault()
  closeContextMenu()
}

function handleCanvasDoubleClick() {
  closeContextMenu()
}

const canvasControls = [
  { action: 'zoomIn', icon: 'plus', label: 'بزرگ‌نمایی' },
  { action: 'zoomOut', icon: 'minus', label: 'کوچک‌نمایی' },
  { action: 'fit', icon: 'fit', label: 'نمایش کل درخت' },
  { action: 'root', icon: 'target', label: 'بازگشت به گره مرکزی' },
]

function runCanvasAction(action) {
  userAdjustedView = true
  if (action === 'zoomIn') viewport.zoomIn()
  else if (action === 'zoomOut') viewport.zoomOut()
  else if (action === 'fit') viewport.fitView({ padding: 92, duration: 380 })
  else if (action === 'root') {
    const rootNode = layout.value.nodeMap.get(store.tree.value.id)
    if (rootNode) viewport.centerOnNode(rootNode, { scale: 1, duration: 420 })
  }
}
</script>

<template>
  <div
    ref="canvasRoot"
    class="mindmap-canvas"
    :style="gridStyle"
    @wheel.prevent="handleWheel"
    @pointerdown="handlePointerDown"
    @pointermove="handlePointerMove"
    @pointerup="endPointer"
    @pointercancel="endPointer"
    @contextmenu="handleBackgroundContextMenu"
    @dblclick="handleCanvasDoubleClick"
  >
    <svg class="mindmap-svg" :width="viewport.width.value" :height="viewport.height.value" aria-label="بوم مایندمپ">
      <defs>
        <filter id="node-shadow" x="-40%" y="-40%" width="180%" height="200%">
          <feDropShadow
            dx="0"
            dy="2.5"
            stdDeviation="4"
            :flood-color="theme.mode === 'dark' ? '#000000' : '#1e2a44'"
            :flood-opacity="theme.mode === 'dark' ? 0.5 : 0.11"
          />
        </filter>
        <filter id="node-shadow-strong" x="-50%" y="-50%" width="200%" height="220%">
          <feDropShadow
            dx="0"
            dy="5"
            stdDeviation="9"
            :flood-color="theme.mode === 'dark' ? '#000000' : '#1e2a44'"
            :flood-opacity="theme.mode === 'dark' ? 0.62 : 0.2"
          />
        </filter>
      </defs>
      <g class="graph-layer" :style="{ transform: viewport.transformStyle.value }">
        <MindmapEdge
          v-for="edge in layout.edges"
          :key="edge.id"
          :edge="edge"
          :color="getBranchColor(theme, layout.nodeMap.get(edge.id)?.branchIndex ?? 0)"
        />
        <MindmapNode
          v-for="node in layout.nodes"
          :key="node.id"
          :node="node"
          :theme="theme"
        />
      </g>
    </svg>

    <div class="canvas-controls" @pointerdown.stop>
      <button
        v-for="control in canvasControls"
        :key="control.action"
        class="canvas-control"
        type="button"
        :title="control.label"
        :aria-label="control.label"
        @click="runCanvasAction(control.action)"
      >
        <UiIcon :name="control.icon" :size="17" />
      </button>
      <button
        class="canvas-zoom-label"
        type="button"
        title="قاب‌بندی کل درخت"
        @click="runCanvasAction('fit')"
      >
        {{ zoomLabel }}
      </button>
    </div>

    <NodeEditor />
  </div>
</template>

<style scoped>
.mindmap-canvas {
  position: absolute;
  inset: 0;
  overflow: hidden;
  touch-action: none;
  cursor: grab;
  background-color: var(--stage-bg);
  background-image: radial-gradient(circle, var(--grid-dot) 1px, transparent 1.15px);
  background-repeat: repeat;
  user-select: none;
  outline: none;
  --grid-size: 26px;
}

.mindmap-canvas::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(
    115% 90% at 78% 8%,
    color-mix(in srgb, var(--accent) 5%, transparent),
    transparent 58%
  );
}

.mindmap-canvas.is-panning {
  cursor: grabbing;
}

.mindmap-svg {
  position: absolute;
  inset: 0;
  overflow: visible;
}

.graph-layer {
  transform-origin: 0 0;
  will-change: transform;
}

.canvas-controls {
  position: absolute;
  left: 18px;
  bottom: 20px;
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 5px;
  border-radius: 13px;
  border: 1px solid var(--border);
  background: var(--panel-bg);
  backdrop-filter: blur(16px);
  box-shadow: 0 14px 34px -24px var(--shadow);
}

.canvas-control {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 32px;
  border-radius: 8px;
  color: var(--text-muted);
  transition:
    background-color 150ms ease,
    color 150ms ease;
}

.canvas-control:hover {
  background: var(--surface-hover);
  color: var(--text);
}

.canvas-zoom-label {
  width: 38px;
  height: 24px;
  border-radius: 7px;
  font-size: 9.5px;
  font-weight: 700;
  color: var(--text-faint);
  transition:
    background-color 150ms ease,
    color 150ms ease;
}

.canvas-zoom-label:hover {
  background: var(--surface-hover);
  color: var(--text-muted);
}

@media (max-width: 720px) {
  .canvas-controls {
    left: 10px;
    bottom: 86px;
    padding: 4px;
  }

  .canvas-control {
    width: 32px;
    height: 30px;
  }
}
</style>
