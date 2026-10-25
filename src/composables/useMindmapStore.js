/**
 * فروشگاه مرکزی مایندمپ.
 * داده، تنظیمات، تاریخچه، جست‌وجو و فرایند دریافت داده در همین لایه مدیریت
 * می‌شوند؛ کامپوننت‌ها فقط نمایش و تعامل را بر عهده دارند.
 */
import { computed, nextTick, reactive, ref, toRaw, watch } from 'vue'
import {
  addChildNode,
  addSiblingNode,
  cloneTree,
  collectIds,
  countDescendants,
  countNodes,
  createNode,
  findNode,
  findNodeWithParent,
  getSiblingInfo,
  isDescendant,
  mergeNodeEvents,
  moveNodeAmongSiblings,
  normalizeTree,
  removeNode,
  reparentNode,
  searchNodes,
  toggleNodeCollapsed,
  updateNodeLabel,
  updateNodeNote,
  walkTree,
} from '../core/tree.js'
import { createHistoryStore } from '../core/history.js'
import { createNodeMeasurer } from '../core/measure.js'
import { layoutMindmap } from '../core/layout.js'
import { getTheme } from '../theme/palettes.js'
import { blankMindmap } from '../data/sampleMindmap.js'
import { StreamAbortedError, streamSampleMindmap } from '../services/mindmapStream.js'
import { normalizePersianText, toPersianDigits } from '../utils/text.js'
import { useGrowthEngine } from './useGrowthEngine.js'
import { useToast } from './useToast.js'
import { askConfirm } from './useConfirm.js'

const DOCUMENT_KEY = 'mindmap-ai:document:v1'
const SETTINGS_KEY = 'mindmap-ai:settings:v1'
const SCHEMA_VERSION = 1

const DEFAULT_PREFERENCES = {
  theme: 'system',
  direction: 'balanced',
  fontScale: 1,
  growthSpeed: 1,
  motion: 'auto',
  autoSave: true,
}

const VALID_THEMES = new Set(['system', 'light', 'dark'])
const VALID_DIRECTIONS = new Set(['balanced', 'rtl', 'ltr'])
const VALID_MOTION = new Set(['auto', 'full', 'reduced'])

function clampValue(value, minimum, maximum, fallback) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.min(maximum, Math.max(minimum, numeric))
}

function sanitizePreferences(raw) {
  const source = raw && typeof raw === 'object' ? raw : {}
  return {
    theme: VALID_THEMES.has(source.theme) ? source.theme : DEFAULT_PREFERENCES.theme,
    direction: VALID_DIRECTIONS.has(source.direction)
      ? source.direction
      : DEFAULT_PREFERENCES.direction,
    fontScale: clampValue(source.fontScale, 0.8, 1.35, DEFAULT_PREFERENCES.fontScale),
    growthSpeed: clampValue(source.growthSpeed, 0.5, 3, DEFAULT_PREFERENCES.growthSpeed),
    motion: VALID_MOTION.has(source.motion) ? source.motion : DEFAULT_PREFERENCES.motion,
    autoSave: source.autoSave !== false,
  }
}

function readJsonStorage(key) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function readStoredDocument() {
  const stored = readJsonStorage(DOCUMENT_KEY)
  if (!stored) return null
  const candidate = stored.root ?? stored.tree ?? stored
  const normalized = normalizeTree(candidate)
  if (!normalized.ok) return null
  return {
    tree: normalized.tree,
    savedAt: typeof stored.savedAt === 'string' ? stored.savedAt : null,
    warnings: normalized.warnings,
  }
}

function readStoredPreferences() {
  return sanitizePreferences(readJsonStorage(SETTINGS_KEY))
}

function createStore() {
  const growthEngine = useGrowthEngine()
  const toast = useToast()
  const history = createHistoryStore({ limit: 60 })
  const historyVersion = ref(0)
  const historySuspended = ref(false)

  const storedDocument = readStoredDocument()
  const storedPreferences = readStoredPreferences()

  const preferences = reactive({ ...storedPreferences })
  // بدون دادهٔ تستی: تا وقتی داده‌ای از پراپ یا ذخیره‌سازی نیاید، فقط ریشه خالی است.
  const tree = ref(storedDocument?.tree ?? cloneTree(blankMindmap))
  const treeRevision = ref(0)
  const selectedId = ref(tree.value.id)
  const editingId = ref(null)
  const activePanel = ref(null)
  const savedAt = ref(storedDocument?.savedAt || null)
  const saveErrorNotified = ref(false)
  const instantSyncToken = ref(1)

  const mediaState = reactive({
    prefersDark: false,
    prefersReducedMotion: false,
  })

  if (typeof window !== 'undefined' && window.matchMedia) {
    const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    mediaState.prefersDark = darkQuery.matches
    mediaState.prefersReducedMotion = motionQuery.matches
    darkQuery.addEventListener?.('change', (event) => {
      mediaState.prefersDark = event.matches
    })
    motionQuery.addEventListener?.('change', (event) => {
      mediaState.prefersReducedMotion = event.matches
    })
  }

  const resolvedTheme = computed(() => {
    if (preferences.theme === 'system') return mediaState.prefersDark ? 'dark' : 'light'
    return preferences.theme
  })
  const theme = computed(() => getTheme(resolvedTheme.value))
  const isMotionReduced = computed(
    () =>
      preferences.motion === 'reduced' ||
      (preferences.motion === 'auto' && mediaState.prefersReducedMotion),
  )

  const measurer = computed(() =>
    createNodeMeasurer({ fontScale: preferences.fontScale }),
  )

  const layout = computed(() => {
    treeRevision.value
    preferences.fontScale
    preferences.direction
    return layoutMindmap(toRaw(tree.value), {
      measure: measurer.value,
      direction: preferences.direction,
      horizontalGap: 54,
      verticalGap: 16,
      rootGap: 78,
    })
  })

  const nodeCount = computed(() => layout.value.nodeCount)
  const nodeCountLabel = computed(() => toPersianDigits(nodeCount.value))

  const selectedTreeNode = computed(() => {
    treeRevision.value
    return findNode(toRaw(tree.value), selectedId.value)
  })
  const selectedLayoutNode = computed(() => layout.value.nodeMap.get(selectedId.value) || null)

  const treeDepth = computed(() => {
    let maximum = 0
    walkTree(toRaw(tree.value), (node, parent, depth) => {
      maximum = Math.max(maximum, depth)
    })
    return maximum
  })

  const rootLabel = computed(() => tree.value?.label || 'مایندمپ')

  /* ------------------------------- ذخیره‌سازی ------------------------------- */

  let saveTimer = 0

  function saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(preferences))
    } catch {
      // تنظیمات حیاتی نیستند؛ خطای ذخیره بی‌صدا نادیده گرفته می‌شود.
    }
  }

  function saveDocumentNow(force = false) {
    if (!preferences.autoSave && !force) return false
    try {
      const payload = {
        version: SCHEMA_VERSION,
        savedAt: new Date().toISOString(),
        root: toRaw(tree.value),
      }
      localStorage.setItem(DOCUMENT_KEY, JSON.stringify(payload))
      savedAt.value = payload.savedAt
      saveErrorNotified.value = false
      return true
    } catch {
      if (!saveErrorNotified.value) {
        saveErrorNotified.value = true
        toast.error('ذخیره‌سازی خودکار ناموفق بود. فضای مرورگر را بررسی کنید.')
      }
      return false
    }
  }

  function scheduleSave() {
    if (!preferences.autoSave) return
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      saveTimer = 0
      saveDocumentNow()
    }, 650)
  }

  watch(
    preferences,
    () => {
      saveSettings()
    },
    { deep: true },
  )

  function markTreeChanged() {
    treeRevision.value += 1
    scheduleSave()
  }

  function bumpHistory() {
    historyVersion.value += 1
  }

  function recordUndo(label) {
    if (historySuspended.value) return
    history.record(cloneTree(toRaw(tree.value)), label)
    bumpHistory()
  }

  const canUndo = computed(() => {
    historyVersion.value
    return history.canUndo
  })
  const canRedo = computed(() => {
    historyVersion.value
    return history.canRedo
  })
  const undoLabel = computed(() => {
    historyVersion.value
    return history.undoLabel
  })
  const redoLabel = computed(() => {
    historyVersion.value
    return history.redoLabel
  })

  function replaceTree(nextTree) {
    tree.value = nextTree
    editingId.value = null
    if (!findNode(tree.value, selectedId.value)) {
      selectedId.value = nextTree?.id || null
    }
    markTreeChanged()
  }

  function undo() {
    if (isStreaming.value) {
      toast.info('در حین تولید داده، تاریخچه در دسترس نیست.')
      return false
    }
    if (!canUndo.value) return false
    const currentSnapshot = cloneTree(toRaw(tree.value))
    const entry = history.undo(currentSnapshot)
    if (!entry) return false
    bumpHistory()
    replaceTree(entry.tree)
    instantSyncToken.value += 1
    return true
  }

  function redo() {
    if (isStreaming.value) {
      toast.info('در حین تولید داده، تاریخچه در دسترس نیست.')
      return false
    }
    if (!canRedo.value) return false
    const currentSnapshot = cloneTree(toRaw(tree.value))
    const entry = history.redo(currentSnapshot)
    if (!entry) return false
    bumpHistory()
    replaceTree(entry.tree)
    instantSyncToken.value += 1
    return true
  }

  /* -------------------------------- انتخاب -------------------------------- */

  function selectNode(id) {
    if (!id || !findNode(tree.value, id)) return
    selectedId.value = id
  }

  const focusRequest = ref(null)
  let focusNonce = 0

  function requestFocus(id, options = {}) {
    if (!id) return
    focusNonce += 1
    focusRequest.value = {
      id,
      nonce: focusNonce,
      scale: options.scale,
      reveal: options.reveal !== false,
    }
  }

  /** باز کردن والدهای جمع‌شده تا گره دیده شود */
  function revealNode(id) {
    const chain = collectAncestors(tree.value, id)
    let changed = false
    for (const ancestor of chain) {
      if (ancestor.collapsed) {
        ancestor.collapsed = false
        changed = true
      }
    }
    if (changed) markTreeChanged()
    return changed
  }

  function collectAncestors(root, id) {
    const chain = []
    const search = (node, ancestors) => {
      if (node.id === id) {
        chain.push(...ancestors)
        return true
      }
      for (const child of node.children || []) {
        if (search(child, [...ancestors, node])) return true
      }
      return false
    }
    search(root, [])
    return chain
  }

  function focusNode(id, options = {}) {
    if (!id) return
    if (options.reveal !== false) revealNode(id)
    nextTick(() => {
      requestFocus(id, options)
    })
  }

  /* -------------------------------- ویرایش -------------------------------- */

  function startEditing(id = selectedId.value) {
    if (!findNode(tree.value, id)) return
    selectedId.value = id
    editingId.value = id
  }

  function stopEditing() {
    editingId.value = null
  }

  function commitLabel(id, label) {
    const node = findNode(tree.value, id)
    if (!node) return { ok: false, error: 'گره پیدا نشد.' }
    const cleaned = String(label ?? '').replace(/\r\n?/g, '\n').trim()
    if (!cleaned) {
      return { ok: false, error: 'عنوان خالی است.' }
    }
    if (cleaned === node.label) {
      editingId.value = null
      return { ok: true, changed: false }
    }
    recordUndo('ویرایش عنوان')
    const result = updateNodeLabel(tree.value, id, cleaned)
    if (!result.ok) {
      toast.error(result.error)
      return result
    }
    editingId.value = null
    markTreeChanged()
    return { ok: true, changed: true }
  }

  function commitNote(id, note) {
    const node = findNode(tree.value, id)
    if (!node) return { ok: false, error: 'گره پیدا نشد.' }
    const cleaned = String(note ?? '').trim()
    if (cleaned === node.note) return { ok: true, changed: false }
    recordUndo('ویرایش یادداشت')
    const result = updateNodeNote(tree.value, id, cleaned)
    if (result.ok) {
      markTreeChanged()
    }
    return result
  }

  function addChild(parentId = selectedId.value) {
    const parent = findNode(tree.value, parentId)
    if (!parent) {
      toast.error('گره والد پیدا نشد.')
      return null
    }
    recordUndo('افزودن گره')
    // گره تازه سمت ثابت نمی‌گیرد؛ اگر از زیرشاخه‌های گره مرکزی است، سمت
    // هیچ‌کدام را قفل نمی‌کند و چیدمان دوطرفه انتخاب می‌کند.
    const node = createNode('شاخه جدید', collectIds(toRaw(tree.value)))
    const result = addChildNode(tree.value, parentId, node)
    if (!result.ok) {
      toast.error(result.error)
      return null
    }
    selectedId.value = node.id
    editingId.value = node.id
    markTreeChanged()
    return node.id
  }

  function addSibling(nodeId = selectedId.value) {
    const located = findNodeWithParent(tree.value, nodeId)
    if (!located) {
      toast.error('گره پیدا نشد.')
      return null
    }
    if (!located.parent) {
      return addChild(nodeId)
    }
    recordUndo('افزودن همسایه')
    const node = createNode('شاخه جدید', collectIds(toRaw(tree.value)))
    const result = addSiblingNode(tree.value, nodeId, node)
    if (!result.ok) {
      toast.error(result.error)
      return null
    }
    selectedId.value = node.id
    editingId.value = node.id
    markTreeChanged()
    return node.id
  }

  async function requestDeleteNode(nodeId = selectedId.value) {
    const located = findNodeWithParent(tree.value, nodeId)
    if (!located) {
      toast.error('گره پیدا نشد.')
      return false
    }
    if (!located.parent) {
      return false
    }
    const descendantCount = countDescendants(located.node)
    if (descendantCount > 0) {
      const confirmed = await askConfirm({
        title: 'حذف شاخه',
        message: `«${located.node.label}» همراه با ${toPersianDigits(descendantCount)} زیرشاخه حذف می‌شود. با Ctrl+Z می‌توانید آن را برگردانید.`,
        confirmLabel: 'حذف شاخه',
        tone: 'danger',
      })
      if (!confirmed) return false
    }
    return performDeleteNode(nodeId)
  }

  function performDeleteNode(nodeId) {
    const located = findNodeWithParent(tree.value, nodeId)
    if (!located || !located.parent) return false
    recordUndo('حذف گره')
    const parentId = located.parent.id
    const result = removeNode(tree.value, nodeId)
    if (!result.ok) {
      toast.error(result.error)
      return false
    }
    if (selectedId.value === nodeId || isDescendant(result.removed, selectedId.value)) {
      selectedId.value = parentId
    }
    editingId.value = null
    markTreeChanged()
    return true
  }

  function toggleCollapse(nodeId = selectedId.value) {
    const node = findNode(tree.value, nodeId)
    if (!node) return false
    const result = toggleNodeCollapsed(tree.value, nodeId)
    if (!result.ok) return false
    if (editingId.value && !findNode(tree.value, editingId.value)) {
      editingId.value = null
    }
    if (selectedId.value !== nodeId && isDescendant(tree.value, nodeId, selectedId.value)) {
      selectedId.value = nodeId
    }
    markTreeChanged()
    return true
  }

  function moveNodeToParent(nodeId, newParentId, index) {
    const located = findNodeWithParent(tree.value, nodeId)
    if (!located || !located.parent) {
      toast.error('گره مرکزی قابل جابه‌جایی نیست.')
      return false
    }
    if (nodeId === newParentId) {
      toast.error('گره نمی‌تواند زیر خودش برود.')
      return false
    }
    if (isDescendant(tree.value, nodeId, newParentId)) {
      toast.error('گره را نمی‌توان زیر شاخه خودش منتقل کرد.')
      return false
    }
    if (!findNode(tree.value, newParentId)) {
      toast.error('والد مقصد پیدا نشد.')
      return false
    }
    recordUndo('جابه‌جایی گره')
    const result = reparentNode(tree.value, nodeId, newParentId, index)
    if (!result.ok) {
      toast.error(result.error)
      return false
    }
    selectedId.value = nodeId
    markTreeChanged()
    return true
  }

  /**
   * ثبت نتیجه یک کشیدن: یک ورودی تاریخچه برای کل عملیات.
   * ورودی از resolveDropTarget می‌آید و پیش از تغییر درخت اعتبارسنجی می‌شود.
   */
  function applyDrop(nodeId, target) {
    if (!target || !target.valid || target.kind === 'none') return false
    const located = findNodeWithParent(tree.value, nodeId)
    if (!located || !located.parent) {
      toast.error('گره مرکزی قابل جابه‌جایی نیست.')
      return false
    }
    if (isDescendant(tree.value, nodeId, target.parentId)) {
      toast.error('گره را نمی‌توان زیر شاخه خودش منتقل کرد.')
      return false
    }

    if (!Number.isInteger(target.index) || target.index < 0) return false

    recordUndo('جابه‌جایی گره')

    // چیدمان خودکار مالک مختصات است؛ کاربر فقط ایندکس و سمت را انتخاب
    // می‌کند. بنابراین نتیجه بی‌درنگ تمیز، فاصله‌دار و بدون هم‌پوشانی است
    // و با پیش‌نمایش (که همان ایندکس/سمت را نشان می‌داد) هم‌خوان می‌ماند.
    const result = reparentNode(tree.value, nodeId, target.parentId, target.index)
    if (!result.ok) {
      toast.error(result.error)
      return false
    }

    // فقط خود گره جهت انتخابی کاربر را می‌گیرد. هم‌نیاهای دیگر دست‌نخورده
    // می‌مانند تا چیدمان دوطرفه حفظ شود و یک درگ کل شاخه را یک‌طرفه نکند.
    const node = result.node
    if (target.side === 'left' || target.side === 'right') {
      node.side = target.side
    }


    selectedId.value = nodeId
    markTreeChanged()
    return true
  }



  function moveSibling(nodeId, delta) {
    const info = getSiblingInfo(tree.value, nodeId)
    if (!info) return false
    const targetIndex = info.index + delta
    if (targetIndex < 0 || targetIndex >= info.count) return false
    recordUndo('جابه‌جایی گره')
    const result = moveNodeAmongSiblings(tree.value, nodeId, delta)
    if (!result.ok) return false
    markTreeChanged()
    return true
  }

  /* -------------------------------- جست‌وجو -------------------------------- */

  const searchQuery = ref('')
  const activeSearchIndex = ref(0)

  const searchResults = computed(() => {
    treeRevision.value
    const query = normalizePersianText(searchQuery.value)
    if (!query) return []
    return searchNodes(toRaw(tree.value), query, normalizePersianText)
  })

  const searchMatchIds = computed(
    () => new Set(searchResults.value.map((result) => result.id)),
  )

  const activeSearchResult = computed(() => {
    if (searchResults.value.length === 0) return null
    const safeIndex = Math.min(activeSearchIndex.value, searchResults.value.length - 1)
    return searchResults.value[safeIndex]
  })

  watch(searchResults, () => {
    if (activeSearchIndex.value >= searchResults.value.length) {
      activeSearchIndex.value = 0
    }
  })

  function setSearchQuery(value) {
    searchQuery.value = String(value ?? '')
    activeSearchIndex.value = 0
  }

  function clearSearch() {
    searchQuery.value = ''
    activeSearchIndex.value = 0
  }

  function navigateSearch(delta) {
    const total = searchResults.value.length
    if (total === 0) return
    activeSearchIndex.value = (activeSearchIndex.value + delta + total) % total
    const result = searchResults.value[activeSearchIndex.value]
    if (result) focusNode(result.id)
  }

  function focusActiveSearchResult() {
    const result = activeSearchResult.value
    if (result) focusNode(result.id)
  }

  /* --------------------------------- پنل --------------------------------- */

  function openPanel(tab = 'settings') {
    activePanel.value = tab
  }

  function closePanel() {
    activePanel.value = null
  }

  function togglePanel(tab = 'settings') {
    activePanel.value = activePanel.value === tab ? null : tab
  }

  /* ---------------------------- تولید و دریافت داده ---------------------------- */

  const isStreaming = ref(false)
  const streamMode = ref('incremental')
  const streamStatus = ref('idle')
  const streamReceived = ref(0)
  const streamWarnings = ref(0)
  let streamController = null
  let streamSnapshot = null
  let pendingStreamEvents = []

  function applyStreamChunk(chunk) {
    if (!chunk || typeof chunk !== 'object') return
    if (chunk.type === 'tree') {
      const normalized = normalizeTree(chunk.tree)
      if (!normalized.ok) {
        streamWarnings.value += 1
        return
      }
      growthEngine.reset()
      tree.value = normalized.tree
      selectedId.value = normalized.tree.id
      streamReceived.value = countNodes(normalized.tree)
      markTreeChanged()
      return
    }
    if (chunk.type === 'nodes') {
      const incoming = Array.isArray(chunk.events) ? chunk.events : []
      const events = pendingStreamEvents.concat(incoming)
      pendingStreamEvents = []
      const result = mergeNodeEvents(tree.value, events)
      pendingStreamEvents = result.deferred
      streamWarnings.value += result.errors.length
      if (result.added.length > 0 || result.updated.length > 0) {
        streamReceived.value = countNodes(toRaw(tree.value))
        markTreeChanged()
      }
    }
  }



  /**
   * بارگذاری داده بیرونی (مثلاً از پراپ پکیج) و نمایش تدریجی آن.
   * ورودی می‌تواند درخت خام یا پوشش { root } باشد و با normalizeTree اعتبارسنجی می‌شود.
   * با gradual=true ابتدا فقط ریشه نمایش داده می‌شود و بقیه گره‌ها
   * به‌صورت تدریجی (استریم شبیه‌سازی‌شده) اضافه می‌شوند؛ با gradual=false
   * کل درخت یک‌باره جایگزین می‌شود و انیمیشن رشد از طریق growthEngine انجام می‌شود.
   */
  async function loadExternalData(rawData, options = {}) {
    const gradual = options.gradual !== false
    const normalizedMode = options.mode === 'full' ? 'full' : 'incremental'
    const announce = options.announce !== false
    const candidate = rawData?.root ?? rawData
    const normalized = normalizeTree(candidate)
    if (!normalized.ok) {
      if (announce) toast.error('ساختار داده بیرونی معتبر نیست: ریشه درخت پیدا نشد.')
      return { ok: false, warnings: normalized.warnings, errors: normalized.errors }
    }

    const sourceTree = normalized.tree
    if (!gradual) {
      if (isStreaming.value) {
        streamController?.abort()
        for (let attempt = 0; attempt < 200 && isStreaming.value; attempt += 1) {
          await new Promise((resolve) => setTimeout(resolve, 0))
        }
        if (isStreaming.value) {
          if (announce) toast.info('یک تولید در حال اجراست؛ ابتدا آن را متوقف یا کامل کنید.')
          return { ok: false, busy: true }
        }
      }
      streamSnapshot = cloneTree(toRaw(tree.value))
      historySuspended.value = true
      try {
        recordUndoSilent('بارگذاری داده')
        growthEngine.reset()
        tree.value = sourceTree
        selectedId.value = sourceTree.id
        streamReceived.value = countNodes(sourceTree)
        streamStatus.value = 'complete'
        markTreeChanged()
      } finally {
        historySuspended.value = false
      }
      return { ok: true, warnings: normalized.warnings, nodeCount: countNodes(sourceTree) }
    }
    if (isStreaming.value) {
      if (announce) toast.info('یک تولید در حال اجراست؛ ابتدا آن را متوقف یا کامل کنید.')
      return { ok: false, busy: true }
    }
    await streamTreeSource(sourceTree, normalizedMode, 'بارگذاری داده', announce, options.baseDelay)
    return { ok: true, warnings: normalized.warnings, nodeCount: countNodes(toRaw(tree.value)) }
  }

  function recordUndoSilent(label) {
    if (streamSnapshot) {
      history.record(streamSnapshot, label)
      bumpHistory()
      streamSnapshot = null
    }
  }

  /** هسته مشترک استریم تدریجی؛ توسط loadExternalData و پخش دوباره استفاده می‌شود. */
  async function streamTreeSource(base, normalizedMode, historyLabel, announce = true, baseDelay) {
    streamSnapshot = cloneTree(toRaw(tree.value))
    historySuspended.value = true
    pendingStreamEvents = []
    streamWarnings.value = 0
    streamReceived.value = 0
    isStreaming.value = true
    streamMode.value = normalizedMode
    streamStatus.value = 'streaming'
    editingId.value = null
    activePanel.value = null
    clearSearch()

    growthEngine.reset()
    const rootOnly = {
      id: base.id,
      label: base.label,
      note: base.note,
      collapsed: false,
      children: [],
    }
    tree.value = rootOnly
    selectedId.value = rootOnly.id
    markTreeChanged()

    streamController = new AbortController()
    const controller = streamController
    try {
      for await (const chunk of streamSampleMindmap(base, {
        mode: normalizedMode,
        signal: controller.signal,
        ...(Number.isFinite(baseDelay) ? { baseDelay } : {}),
      })) {
        if (controller.signal.aborted) break
        if (chunk.type === 'complete') {
          streamStatus.value = 'complete'
          break
        }
        applyStreamChunk(chunk)
      }
      if (!controller.signal.aborted) {
        streamStatus.value = 'complete'
        if (announce) {
          toast.success(
            `مایندمپ با ${toPersianDigits(countNodes(toRaw(tree.value)))} گره آماده شد.`,
          )
        }
      }
    } catch (error) {
      if (error instanceof StreamAbortedError || error?.name === 'AbortError') {
        streamStatus.value = 'stopped'
        if (announce) toast.info('تولید متوقف شد؛ داده‌های دریافت‌شده حفظ شدند.')
      } else {
        streamStatus.value = 'error'
        if (announce) toast.error(`دریافت داده ناموفق بود: ${error?.message || 'خطای نامشخص'}`)
      }
    } finally {
      isStreaming.value = false
      if (streamController === controller) streamController = null
      historySuspended.value = false
      if (streamSnapshot) {
        history.record(streamSnapshot, historyLabel)
        bumpHistory()
        streamSnapshot = null
      }
      if (pendingStreamEvents.length > 0) {
        streamWarnings.value += pendingStreamEvents.length
        pendingStreamEvents = []
      }
      scheduleSave()
    }
  }

  function stopGeneration() {
    if (!isStreaming.value || !streamController) return false
    streamController.abort()
    return true
  }

  function clearMap() {
    if (isStreaming.value) {
      streamController?.abort()
      streamSnapshot = null
    }
    recordUndo('پاک‌کردن نقشه')
    growthEngine.reset()
    tree.value = cloneTree(blankMindmap)
    selectedId.value = tree.value.id
    editingId.value = null
    activePanel.value = null
    instantSyncToken.value += 1
    markTreeChanged()
  }

  function startBlankMap() {
    clearMap()
    editingId.value = tree.value.id
  }

  /* ------------------------------ پخش انیمیشن ------------------------------ */

  function replayAnimation() {
    return growthEngine.replay()
  }

  /** بازپخش تدریجی داده فعلی، بدون جایگزین‌کردن آن با داده نمونه */
  async function replayCurrentData() {
    if (isStreaming.value) {
      toast.info('ابتدا تولید فعلی را متوقف یا کامل کنید.')
      return false
    }
    const currentTree = cloneTree(toRaw(tree.value))
    if (countNodes(currentTree) <= 1) return replayAnimation()
    await streamTreeSource(currentTree, 'incremental', 'پخش دوباره', false)
    return true
  }

  function replayBranch(nodeId = selectedId.value) {
    const started = growthEngine.replaySubtree(nodeId)
    if (started) {
      focusNode(nodeId, { scale: 0.85, reveal: true })
    }
    return started
  }

  function skipAnimation() {
    growthEngine.finishAll()
  }

  /* ------------------------------- تنظیمات ------------------------------- */

  function setPreference(key, value) {
    if (!(key in DEFAULT_PREFERENCES)) return
    preferences[key] = value
  }

  function changeFontScale(delta) {
    preferences.fontScale = clampValue(
      Number((preferences.fontScale + delta).toFixed(2)),
      0.8,
      1.35,
      DEFAULT_PREFERENCES.fontScale,
    )
  }

  function setGrowthSpeed(value) {
    preferences.growthSpeed = clampValue(value, 0.5, 3, DEFAULT_PREFERENCES.growthSpeed)
  }

  function setThemeMode(value) {
    if (VALID_THEMES.has(value)) preferences.theme = value
  }

  function setMotionPreference(value) {
    if (VALID_MOTION.has(value)) preferences.motion = value
  }

  function setDirection(value) {
    if (VALID_DIRECTIONS.has(value)) preferences.direction = value
  }

  function toggleAutoSave() {
    preferences.autoSave = !preferences.autoSave
    if (preferences.autoSave) saveDocumentNow()
  }

  /* ------------------------------ صفحه‌کلید ------------------------------ */

  function isEditableTarget(target) {
    if (!target) return false
    const tag = target.tagName
    return (
      tag === 'INPUT' ||
      tag === 'TEXTAREA' ||
      tag === 'SELECT' ||
      target.isContentEditable === true
    )
  }

  /* ------------------------------- تمیزکاری ------------------------------- */

  function dispose() {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = 0
    streamController?.abort()
    growthEngine.destroy()
  }

  watch(
    () => preferences.growthSpeed,
    (value) => {
      growthEngine.speed.value = value
    },
    { immediate: true },
  )

  watch(isMotionReduced, (reduced) => {
    if (reduced) growthEngine.finishAll()
  })

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      if (saveTimer) {
        clearTimeout(saveTimer)
        saveTimer = 0
      }
      saveDocumentNow()
    })
  }

  return {
    // داده و تنظیمات
    tree,
    treeRevision,
    layout,
    nodeCount,
    nodeCountLabel,
    treeDepth,
    rootLabel,
    preferences,
    theme,
    resolvedTheme,
    isMotionReduced,
    instantSyncToken,
    savedAt,
    // انتخاب و ویرایش
    selectedId,
    selectedTreeNode,
    selectedLayoutNode,
    focusRequest,
    editingId,
    activePanel,
    selectNode,
    startEditing,
    stopEditing,
    commitLabel,
    commitNote,
    // عملیات گره
    addChild,
    addSibling,
    requestDeleteNode,
    performDeleteNode,
    toggleCollapse,
    moveNodeToParent,
    applyDrop,
    moveSibling,
    // تاریخچه
    canUndo,
    canRedo,
    undoLabel,
    redoLabel,
    undo,
    redo,
    // جست‌وجو
    searchQuery,
    searchResults,
    searchMatchIds,
    activeSearchIndex,
    activeSearchResult,
    setSearchQuery,
    clearSearch,
    navigateSearch,
    focusActiveSearchResult,
    focusNode,
    // پنل
    openPanel,
    closePanel,
    togglePanel,
    // تولید داده
    isStreaming,
    streamMode,
    streamStatus,
    streamReceived,
    streamWarnings,
    stopGeneration,
    loadExternalData,
    clearMap,
    startBlankMap,
    // انیمیشن
    replayAnimation,
    replayCurrentData,
    replayBranch,
    skipAnimation,
    // تنظیمات
    setPreference,
    changeFontScale,
    setGrowthSpeed,
    setThemeMode,
    setMotionPreference,
    setDirection,
    toggleAutoSave,
    // کمکی
    saveDocumentNow,
    isEditableTarget,
    dispose,
    isHistorySuspended: historySuspended,
  }
}

let storeInstance = null

export function useMindmapStore() {
  if (!storeInstance) storeInstance = createStore()
  return storeInstance
}
