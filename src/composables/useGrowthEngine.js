/**
 * موتور رشد تدریجی درخت.
 *
 * هر گره یک بازه زمانی دارد: ابتدا خط اتصال از والد کشیده می‌شود و
 * کمی پیش از رسیدن کامل خط، خود گره با یک پاپ نرم ظاهر می‌شود.
 * زمان‌بندی واقعی بر اساس ساختار درخت و فاصله گره‌ها ساخته می‌شود،
 * نه با انیمیشن‌های تصادفی.
 *
 * این موتور مستقیماً روی عناصر SVG می‌نویسد تا در هر فریم کل درخت
 * دوباره رندر نشود. توقف، ادامه، تغییر سرعت، جهش و پخش مجدد پشتیبانی می‌شود.
 */
import { ref } from 'vue'

const EDGE_MIN_DURATION = 230
const EDGE_MAX_DURATION = 480
const NODE_DURATION = 300
const ROOT_DURATION = 420
const SIBLING_GAP = 55
const EDGE_OVERLAP = 90
const NEW_NODE_DELAY = 90

const clamp01 = (value) => Math.min(1, Math.max(0, value))

function easeOutCubic(value) {
  const t = clamp01(value)
  return 1 - Math.pow(1 - t, 3)
}

function easeOutBack(value) {
  const t = clamp01(value)
  const c1 = 1.35
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

export function createGrowthEngine() {
  const isPlaying = ref(false)
  const isComplete = ref(true)
  const progress = ref(1)
  const drawnCount = ref(0)
  const totalCount = ref(0)
  const speed = ref(1)

  const entries = new Map()
  const nodeElements = new Map()
  const edgeElements = new Map()
  let lastNodes = []
  let nodeById = new Map()
  let clock = 0
  let maxEnd = 0
  let rafId = 0
  let lastFrameTime = 0
  let userPaused = false

  const applyEdgeState = (entry, edgeProgress) => {
    const element = edgeElements.get(entry.id)
    if (!element) return
    const ease = easeOutCubic(edgeProgress)
    element.setAttribute('stroke-dashoffset', String(1 - ease))
    element.style.opacity = edgeProgress > 0 ? '1' : '0'
  }

  const applyNodeState = (entry, nodeProgress) => {
    const element = nodeElements.get(entry.id)
    if (!element) return
    if (nodeProgress <= 0) {
      element.setAttribute('opacity', '0')
      element.setAttribute('transform', 'scale(0.86)')
      return
    }
    const fade = easeOutCubic(Math.min(1, nodeProgress * 1.9))
    const scale = 0.86 + 0.14 * easeOutBack(nodeProgress)
    element.setAttribute('opacity', String(fade))
    element.setAttribute('transform', `scale(${scale.toFixed(4)})`)
  }

  const applyEntryAtClock = (entry, now) => {
    const edgeProgress =
      entry.edgeDur > 0 ? clamp01((now - entry.edgeStart) / entry.edgeDur) : 1
    const nodeProgress = clamp01((now - entry.nodeStart) / entry.nodeDur)
    applyEdgeState(entry, edgeProgress)
    applyNodeState(entry, nodeProgress)
    if (edgeProgress >= 1) entry.edgeDone = true
    if (nodeProgress >= 1) entry.nodeDone = true
  }

  const hideEntry = (entry) => {
    const edge = edgeElements.get(entry.id)
    if (edge) {
      edge.setAttribute('stroke-dashoffset', '1')
      edge.style.opacity = '0'
    }
    const node = nodeElements.get(entry.id)
    if (node) {
      node.setAttribute('opacity', '0')
      node.setAttribute('transform', 'scale(0.86)')
    }
    entry.edgeDone = false
    entry.nodeDone = false
  }

  const refreshCounters = () => {
    totalCount.value = entries.size
    let drawn = 0
    for (const entry of entries.values()) {
      if (clock >= entry.nodeStart + entry.nodeDur) drawn += 1
    }
    drawnCount.value = drawn
    progress.value = entries.size === 0 ? 1 : drawn / entries.size
  }

  const computeMaxEnd = () => {
    maxEnd = 0
    for (const entry of entries.values()) {
      if (entry.nodeEnd > maxEnd) maxEnd = entry.nodeEnd
    }
  }

  const setCompletedState = () => {
    isPlaying.value = false
    isComplete.value = true
    progress.value = 1
    drawnCount.value = totalCount.value
    if (rafId) cancelAnimationFrame(rafId)
    rafId = 0
    lastFrameTime = 0
  }

  const finishAll = () => {
    if (entries.size === 0) {
      clock = 0
      setCompletedState()
      return
    }
    clock = maxEnd
    for (const entry of entries.values()) {
      applyEdgeState(entry, 1)
      applyNodeState(entry, 1)
      entry.edgeDone = true
      entry.nodeDone = true
    }
    setCompletedState()
  }

  const frame = (timestamp) => {
    rafId = 0
    if (!isPlaying.value) return
    const delta = lastFrameTime ? Math.min(timestamp - lastFrameTime, 120) : 16
    lastFrameTime = timestamp
    clock += delta * Math.max(0.1, speed.value)

    for (const entry of entries.values()) {
      if (entry.nodeDone && entry.edgeDone) continue
      applyEntryAtClock(entry, clock)
    }
    refreshCounters()

    if (clock >= maxEnd) {
      finishAll()
      return
    }
    rafId = requestAnimationFrame(frame)
  }

  const play = () => {
    if (entries.size === 0) return
    if (isComplete.value && clock >= maxEnd) return
    userPaused = false
    isPlaying.value = true
    isComplete.value = false
    lastFrameTime = 0
    if (!rafId) rafId = requestAnimationFrame(frame)
  }

  const pause = () => {
    userPaused = true
    isPlaying.value = false
    if (rafId) cancelAnimationFrame(rafId)
    rafId = 0
    lastFrameTime = 0
  }

  const togglePlayback = () => {
    if (isPlaying.value) pause()
    else if (isComplete.value) replay()
    else play()
  }

  const scheduleFullSequence = (nodes) => {
    let cursor = 0
    for (const node of nodes) {
      const parentEntry = node.parentId ? entries.get(node.parentId) : null
      const parentNode = node.parentId ? nodeById.get(node.parentId) : null
      const distance =
        parentNode && node ? Math.hypot(node.x - parentNode.x, node.y - parentNode.y) : 0
      const edgeDur =
        node.parentId == null
          ? 0
          : Math.min(EDGE_MAX_DURATION, Math.max(EDGE_MIN_DURATION, 200 + distance * 0.18))
      const start = node.parentId
        ? Math.max(cursor, parentEntry ? parentEntry.nodeEnd - EDGE_OVERLAP : 0)
        : 0
      const nodeStart = start + edgeDur * 0.78
      const nodeDur = node.parentId ? NODE_DURATION : ROOT_DURATION
      const nodeEnd = nodeStart + nodeDur
      entries.set(node.id, {
        id: node.id,
        parentId: node.parentId,
        edgeStart: start,
        edgeDur,
        nodeStart,
        nodeDur,
        nodeEnd,
        edgeDone: false,
        nodeDone: false,
      })
      cursor = nodeEnd + SIBLING_GAP
    }
  }

  const scheduleAppendedNodes = (nodes, now) => {
    const childCursors = new Map()
    for (const [parentId, entry] of entries.entries()) {
      childCursors.set(parentId, entry.nodeEnd)
    }
    for (const node of nodes) {
      const parentEntry = node.parentId ? entries.get(node.parentId) : null
      const parentNode = node.parentId ? nodeById.get(node.parentId) : null
      const distance =
        parentNode && node ? Math.hypot(node.x - parentNode.x, node.y - parentNode.y) : 0
      const edgeDur =
        node.parentId == null
          ? 0
          : Math.min(EDGE_MAX_DURATION, Math.max(EDGE_MIN_DURATION, 200 + distance * 0.18))
      const parentCursor = node.parentId ? childCursors.get(node.parentId) || 0 : 0
      const parentReady = parentEntry ? parentEntry.nodeEnd - EDGE_OVERLAP : now
      const start = node.parentId
        ? Math.max(now + NEW_NODE_DELAY, parentReady, parentCursor)
        : now
      const nodeStart = start + edgeDur * 0.78
      const nodeDur = node.parentId ? NODE_DURATION : ROOT_DURATION
      const nodeEnd = nodeStart + nodeDur
      entries.set(node.id, {
        id: node.id,
        parentId: node.parentId,
        edgeStart: start,
        edgeDur,
        nodeStart,
        nodeDur,
        nodeEnd,
        edgeDone: false,
        nodeDone: false,
      })
      if (node.parentId) childCursors.set(node.parentId, nodeEnd + SIBLING_GAP)
    }
  }

  const sync = (layoutNodes, options = {}) => {
    lastNodes = Array.isArray(layoutNodes) ? layoutNodes : []
    nodeById = new Map(lastNodes.map((node) => [node.id, node]))
    const wanted = new Set(lastNodes.map((node) => node.id))

    let removedAny = false
    for (const id of [...entries.keys()]) {
      if (!wanted.has(id)) {
        entries.delete(id)
        removedAny = true
      }
    }
    if (removedAny) {
      nodeElements.forEach((element, id) => {
        if (!wanted.has(id)) element.setAttribute('opacity', '0')
      })
      edgeElements.forEach((element, id) => {
        if (!wanted.has(id)) element.setAttribute('stroke-dashoffset', '1')
      })
    }

    const newNodes = lastNodes.filter((node) => !entries.has(node.id))
    const isInitialSchedule = entries.size === 0

    if (newNodes.length > 0) {
      const now = clock
      if (isInitialSchedule) {
        scheduleFullSequence(newNodes)
      } else {
        scheduleAppendedNodes(newNodes, now)
      }
      for (const node of newNodes) {
        const entry = entries.get(node.id)
        applyEntryAtClock(entry, clock)
      }
      computeMaxEnd()
      refreshCounters()
      if (options.instant) {
        finishAll()
        return
      }
      isComplete.value = false
      if (!userPaused) play()
      return
    }

    computeMaxEnd()
    refreshCounters()
    if (entries.size === 0) {
      setCompletedState()
      return
    }
    if (options.instant) {
      finishAll()
      return
    }
    if (clock >= maxEnd) setCompletedState()
  }

  const reset = () => {
    pause()
    userPaused = false
    entries.clear()
    lastNodes = []
    nodeById = new Map()
    clock = 0
    maxEnd = 0
    progress.value = 0
    drawnCount.value = 0
    totalCount.value = 0
    isComplete.value = false
    for (const element of nodeElements.values()) {
      element.setAttribute('opacity', '0')
      element.setAttribute('transform', 'scale(0.86)')
    }
    for (const element of edgeElements.values()) {
      element.setAttribute('stroke-dashoffset', '1')
      element.style.opacity = '0'
    }
  }

  const replay = () => {
    if (lastNodes.length === 0) return false
    if (rafId) cancelAnimationFrame(rafId)
    rafId = 0
    entries.clear()
    clock = 0
    maxEnd = 0
    userPaused = false
    for (const element of nodeElements.values()) {
      element.setAttribute('opacity', '0')
      element.setAttribute('transform', 'scale(0.86)')
    }
    for (const element of edgeElements.values()) {
      element.setAttribute('stroke-dashoffset', '1')
      element.style.opacity = '0'
    }
    scheduleFullSequence(lastNodes)
    computeMaxEnd()
    refreshCounters()
    isComplete.value = false
    play()
    return true
  }

  const getSubtreeIds = (rootId) => {
    const ids = new Set([rootId])
    let changed = true
    while (changed) {
      changed = false
      for (const node of lastNodes) {
        if (node.parentId && ids.has(node.parentId) && !ids.has(node.id)) {
          ids.add(node.id)
          changed = true
        }
      }
    }
    return ids
  }

  const replaySubtree = (rootId) => {
    if (!nodeById.has(rootId)) return false
    const subtreeIds = getSubtreeIds(rootId)
    for (const id of subtreeIds) {
      const entry = entries.get(id)
      if (entry) hideEntry(entry)
      entries.delete(id)
    }
    const subtreeNodes = lastNodes.filter((node) => subtreeIds.has(node.id))
    const startFrom = clock + NEW_NODE_DELAY
    const childCursors = new Map()
    for (const [id, entry] of entries.entries()) childCursors.set(id, entry.nodeEnd)

    for (const node of subtreeNodes) {
      const parentEntry = node.parentId ? entries.get(node.parentId) : null
      const parentNode = node.parentId ? nodeById.get(node.parentId) : null
      const distance =
        parentNode && node ? Math.hypot(node.x - parentNode.x, node.y - parentNode.y) : 0
      const edgeDur =
        node.parentId == null
          ? 0
          : Math.min(EDGE_MAX_DURATION, Math.max(EDGE_MIN_DURATION, 200 + distance * 0.18))
      const parentReady = parentEntry ? parentEntry.nodeEnd - EDGE_OVERLAP : startFrom
      const parentCursor = node.parentId ? childCursors.get(node.parentId) || 0 : 0
      const start = node.parentId
        ? Math.max(startFrom, parentReady, parentCursor)
        : startFrom
      const nodeStart = start + edgeDur * 0.78
      const nodeDur = node.parentId ? NODE_DURATION : ROOT_DURATION
      const nodeEnd = nodeStart + nodeDur
      const entry = {
        id: node.id,
        parentId: node.parentId,
        edgeStart: start,
        edgeDur,
        nodeStart,
        nodeDur,
        nodeEnd,
        edgeDone: false,
        nodeDone: false,
      }
      entries.set(node.id, entry)
      if (node.parentId) childCursors.set(node.parentId, nodeEnd + SIBLING_GAP)
    }
    computeMaxEnd()
    refreshCounters()
    userPaused = false
    isComplete.value = false
    play()
    return true
  }

  const registerNodeElement = (id, element) => {
    if (!element) {
      nodeElements.delete(id)
      return
    }
    nodeElements.set(id, element)
    const entry = entries.get(id)
    if (!entry) {
      element.setAttribute('opacity', '0')
      element.setAttribute('transform', 'scale(0.86)')
      return
    }
    applyEntryAtClock(entry, clock)
  }

  const registerEdgeElement = (id, element) => {
    if (!element) {
      edgeElements.delete(id)
      return
    }
    edgeElements.set(id, element)
    const entry = entries.get(id)
    if (!entry) {
      element.setAttribute('stroke-dashoffset', '1')
      element.style.opacity = '0'
      return
    }
    applyEntryAtClock(entry, clock)
  }

  const destroy = () => {
    pause()
    entries.clear()
    nodeElements.clear()
    edgeElements.clear()
    lastNodes = []
  }

  return {
    isPlaying,
    isComplete,
    progress,
    drawnCount,
    totalCount,
    speed,
    sync,
    play,
    pause,
    togglePlayback,
    finishAll,
    reset,
    replay,
    replaySubtree,
    registerNodeElement,
    registerEdgeElement,
    destroy,
    get hasPlayableNodes() {
      return lastNodes.length > 0
    },
  }
}

/** نمونه سراسری برای اشتراک بین کنترل‌ها و بوم */
let sharedEngine = null
export function useGrowthEngine() {
  if (!sharedEngine) sharedEngine = createGrowthEngine()
  return sharedEngine
}
