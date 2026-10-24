<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useMindmapStore } from './composables/useMindmapStore.js'
import { useGrowthEngine } from './composables/useGrowthEngine.js'
import { useViewport } from './composables/useViewport.js'
import { useToast } from './composables/useToast.js'
import { printMindmap } from './services/exporters.js'
import { themeToCssVariables } from './theme/palettes.js'
import { toPersianDigits } from './utils/text.js'
import AppHeader from './components/AppHeader.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'
import ContextMenu from './components/ContextMenu.vue'
import EmptyHint from './components/EmptyHint.vue'
import GrowthBar from './components/GrowthBar.vue'
import MindmapCanvas from './components/MindmapCanvas.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import ToastStack from './components/ToastStack.vue'

const store = useMindmapStore()
const growthEngine = useGrowthEngine()
const viewport = useViewport()
const toast = useToast()

const headerRef = ref(null)
let headerResizeObserver = null
let isPrinting = false

/* ---------------------------------- تم ---------------------------------- */

/**
 * متغیرهای رنگ روی ریشه سند نوشته می‌شوند تا پنل‌ها، منوها و پیام‌هایی که
 * با Teleport خارج از برنامه ساخته می‌شوند هم همان تم را بگیرند.
 */
function syncDocumentTheme() {
  if (typeof document === 'undefined') return
  const theme = store.theme.value
  const rootElement = document.documentElement
  const variables = themeToCssVariables(theme)
  for (const [name, value] of Object.entries(variables)) {
    rootElement.style.setProperty(name, value)
  }
  rootElement.dataset.theme = theme.mode
  rootElement.style.colorScheme = theme.mode
  delete rootElement.dataset.preloadTheme
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme.mode === 'dark' ? '#0b0f16' : theme.appBg)
}

watch(() => store.theme.value, syncDocumentTheme, { immediate: true, flush: 'post' })

/* ------------------------------ ارتفاع سربرگ ------------------------------ */

/**
 * ارتفاع واقعی سربرگ اندازه‌گیری می‌شود تا پنل کنار، لایه تاریک و پیام‌ها
 * در همه اندازه‌های صفحه دقیقاً از زیر آن شروع شوند.
 */
function syncHeaderHeight() {
  const headerElement = document.querySelector('.app-header')
  if (!headerElement) return
  const height = Math.ceil(headerElement.getBoundingClientRect().height)
  document.documentElement.style.setProperty('--header-height', `${height}px`)
}

/* ------------------------------ صفحه‌کلید ------------------------------ */

const INTERACTIVE_SELECTOR =
  'button, a, input, textarea, select, [contenteditable="true"], [role="textbox"]'

function isInteractiveTarget(target) {
  if (!target || typeof target.closest !== 'function') return false
  return Boolean(target.closest(INTERACTIVE_SELECTOR))
}

function findNavigationTarget(direction) {
  const current = store.selectedLayoutNode.value
  if (!current) return null
  const nodes = store.layout.value.nodes
  let bestNode = null
  let bestScore = Infinity

  for (const candidate of nodes) {
    if (candidate.id === current.id) continue
    const deltaX = candidate.x - current.x
    const deltaY = candidate.y - current.y
    let forwardDistance = 0
    let crossDistance = 0

    if (direction === 'left') {
      forwardDistance = -deltaX
      crossDistance = Math.abs(deltaY)
    } else if (direction === 'right') {
      forwardDistance = deltaX
      crossDistance = Math.abs(deltaY)
    } else if (direction === 'up') {
      forwardDistance = -deltaY
      crossDistance = Math.abs(deltaX)
    } else {
      forwardDistance = deltaY
      crossDistance = Math.abs(deltaX)
    }

    if (forwardDistance <= 2) continue
    const score = forwardDistance + crossDistance * 0.45
    if (score < bestScore) {
      bestScore = score
      bestNode = candidate
    }
  }

  return bestNode
}

function navigateWithArrow(direction) {
  const target = findNavigationTarget(direction)
  if (!target) return false
  store.selectNode(target.id)
  store.focusNode(target.id, { reveal: true })
  return true
}

function saveNow() {
  const saved = store.saveDocumentNow(true)
  if (saved) toast.success('نقشه در مرورگر ذخیره شد.')
  else toast.error('ذخیره‌سازی ناموفق بود.')
}

async function printCurrentMindmap() {
  if (isPrinting) return
  isPrinting = true
  try {
    await printMindmap(store.layout.value, {
      theme: store.theme.value,
      title: store.rootLabel.value,
      subtitle: 'ذهن‌نگار • مایندمپ پژوهشی',
    })
    toast.info('پنجره چاپ آماده شد.')
  } catch (error) {
    toast.error(`چاپ ناموفق بود: ${error?.message || 'خطای نامشخص'}`)
  } finally {
    isPrinting = false
  }
}

function handleGlobalKeydown(event) {
  if (event.isComposing || event.defaultPrevented) return

  if (event.key === 'Escape') {
    if (store.activePanel.value) store.closePanel()
    else if (store.searchQuery.value) store.clearSearch()
    else if (store.editingId.value) store.stopEditing()
    return
  }

  const isEditable = store.isEditableTarget(event.target)
  const hasCommandModifier = event.ctrlKey || event.metaKey

  if (hasCommandModifier) {
    const key = event.key.toLowerCase()
    if (key === 's') {
      event.preventDefault()
      saveNow()
      return
    }
    if (key === 'p') {
      event.preventDefault()
      printCurrentMindmap()
      return
    }
    if (key === 'f') {
      event.preventDefault()
      headerRef.value?.focusSearch()
      return
    }
    if (isEditable) return
    if (key === 'z') {
      event.preventDefault()
      if (event.shiftKey) store.redo()
      else store.undo()
      return
    }
    if (key === 'y') {
      event.preventDefault()
      store.redo()
      return
    }
    if (event.key === '0') {
      event.preventDefault()
      viewport.fitView({ padding: 92, duration: 420 })
      return
    }
    if (event.key === '+' || event.key === '=') {
      event.preventDefault()
      viewport.zoomIn()
      return
    }
    if (event.key === '-' || event.key === '_') {
      event.preventDefault()
      viewport.zoomOut()
    }
    return
  }

  if (isEditable || isInteractiveTarget(event.target) || event.altKey) return

  if (event.key === 'Tab') {
    if (event.shiftKey) return
    event.preventDefault()
    store.addChild()
    return
  }
  if (event.key === 'Enter') {
    event.preventDefault()
    if (event.shiftKey) store.addSibling()
    else store.startEditing()
    return
  }
  if (event.key === 'F2') {
    event.preventDefault()
    store.startEditing()
    return
  }
  if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault()
    store.requestDeleteNode()
    return
  }
  if (event.key === ' ' || event.code === 'Space') {
    if (event.repeat) return
    event.preventDefault()
    growthEngine.togglePlayback()
    return
  }

  const arrowDirections = {
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ArrowUp: 'up',
    ArrowDown: 'down',
  }
  const direction = arrowDirections[event.key]
  if (direction && navigateWithArrow(direction)) {
    event.preventDefault()
  }
}

/* ------------------------------- چرخه عمر ------------------------------- */

function announceInitialWarnings() {
  const warnings = store.initialWarnings.value
  if (!Array.isArray(warnings) || warnings.length === 0) return
  const firstWarning = warnings[0]
  const message =
    warnings.length === 1
      ? firstWarning
      : `${firstWarning} (${toPersianDigits(warnings.length)} هشدار در بازیابی سند)`
  toast.warning(message, 6500)
}

onMounted(() => {
  syncHeaderHeight()
  if (typeof ResizeObserver !== 'undefined') {
    const headerElement = document.querySelector('.app-header')
    if (headerElement) {
      headerResizeObserver = new ResizeObserver(syncHeaderHeight)
      headerResizeObserver.observe(headerElement)
    }
  }
  window.addEventListener('resize', syncHeaderHeight)
  window.addEventListener('keydown', handleGlobalKeydown)
  announceInitialWarnings()
})

onBeforeUnmount(() => {
  headerResizeObserver?.disconnect()
  headerResizeObserver = null
  window.removeEventListener('resize', syncHeaderHeight)
  window.removeEventListener('keydown', handleGlobalKeydown)
})
</script>

<template>
  <div class="app-shell">
    <AppHeader ref="headerRef" />

    <main class="app-stage">
      <MindmapCanvas />
      <EmptyHint />
    </main>

    <GrowthBar />
    <SettingsPanel />
    <ContextMenu />
    <ToastStack />
    <ConfirmDialog />
  </div>
</template>

<style scoped>
.app-shell {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  color: var(--text);
  background: var(--app-bg);
}

.app-stage {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
}
</style>
