/**
 * مدل داده درخت مایندمپ.
 * ساختار هر گره: { id, label, note, collapsed, children }
 * همه گره‌ها شناسه یکتا دارند و توابع این ماژول از تکرار شناسه جلوگیری می‌کنند.
 */

export const MAX_LABEL_LENGTH = 800
export const MAX_NOTE_LENGTH = 6000
export const MAX_DEPTH = 24

/** پیمایش پیش‌ترتیب درخت؛ تابع بازدید می‌تواند پیمایش را متوقف کند */
export function walkTree(root, visit, parent = null, depth = 0) {
  if (!root) return false
  if (visit(root, parent, depth) === false) return true
  const children = Array.isArray(root.children) ? root.children : []
  for (const child of children) {
    if (walkTree(child, visit, root, depth + 1)) return true
  }
  return false
}

export function countNodes(root) {
  let total = 0
  walkTree(root, () => {
    total += 1
  })
  return total
}

export function countDescendants(node) {
  return Math.max(0, countNodes(node) - 1)
}

export function findNode(root, id) {
  let found = null
  walkTree(root, (node) => {
    if (node.id === id) {
      found = node
      return false
    }
    return undefined
  })
  if (!found) return null
  return found
}

export function findNodeWithParent(root, id) {
  let result = null
  walkTree(root, (node, parent, depth) => {
    if (node.id === id) {
      result = { node, parent, depth }
      return false
    }
    return undefined
  })
  return result
}

/** نقشه سریع شناسه به گره و والدش */
export function createTreeIndex(root) {
  const index = new Map()
  walkTree(root, (node, parent, depth) => {
    index.set(node.id, { node, parent, depth })
  })
  return index
}

export function collectIds(root) {
  const ids = new Set()
  walkTree(root, (node) => {
    ids.add(node.id)
  })
  return ids
}

let idCounter = 0

/** شناسه یکتای خوانا برای گره جدید */
export function generateId(prefix = 'n', existingIds = new Set()) {
  const safePrefix = /^[a-zA-Z][\w-]*$/.test(prefix) ? prefix : 'n'
  let candidate = ''
  do {
    idCounter += 1
    candidate = `${safePrefix}-${Date.now().toString(36).slice(-5)}${idCounter.toString(36)}`
  } while (existingIds.has(candidate))
  return candidate
}

export function createNode(label = 'موضوع جدید', existingIds = new Set(), options = {}) {
  return {
    id: options.id || generateId(options.idPrefix || 'n', existingIds),
    label,
    note: options.note || '',
    collapsed: options.collapsed === true,
    children: [],
  }
}

export function cloneTree(tree) {
  if (!tree) return null
  if (typeof structuredClone === 'function') return structuredClone(tree)
  return JSON.parse(JSON.stringify(tree))
}

export function isDescendant(root, ancestorId, possibleDescendantId) {
  const ancestor = findNode(root, ancestorId)
  if (!ancestor) return false
  let result = false
  walkTree(ancestor, (node) => {
    if (node.id === possibleDescendantId) {
      result = true
      return false
    }
    return undefined
  })
  return result
}

/** برچسب را برای نمایش تمیز می‌کند؛ خطوط جدید را حفظ می‌کند */
export function cleanLabel(value) {
  const raw = typeof value === 'string' ? value : ''
  const lines = raw
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
  while (lines.length > 1 && lines[lines.length - 1] === '') lines.pop()
  const cleaned = lines.join('\n').trim()
  return cleaned.slice(0, MAX_LABEL_LENGTH)
}

export function cleanNote(value) {
  if (typeof value !== 'string') return ''
  return value.replace(/\r\n?/g, '\n').trim().slice(0, MAX_NOTE_LENGTH)
}

/**
 * ساختار ورودی (از هوش مصنوعی یا فایل) را اعتبارسنجی و ترمیم می‌کند.
 * ورودی می‌تواند خود درخت یا پوشش { root: ... } باشد.
 */
export function normalizeTree(rawInput) {
  const warnings = []
  const usedIds = new Set()
  let generatedCount = 0

  const makeUniqueId = (preferred) => {
    const base = typeof preferred === 'string' ? preferred.trim() : ''
    if (base && !usedIds.has(base)) {
      usedIds.add(base)
      return base
    }
    if (base) warnings.push(`شناسه تکراری «${base}» اصلاح شد.`)
    let counter = usedIds.size + 1
    let candidate = `auto-${counter}`
    while (usedIds.has(candidate)) {
      counter += 1
      candidate = `auto-${counter}`
    }
    usedIds.add(candidate)
    generatedCount += 1
    return candidate
  }

  const normalizeNode = (raw, depth) => {
    if (depth > MAX_DEPTH) {
      warnings.push('عمق درخت بیش از حد مجاز بود و بخشی از شاخه‌ها نادیده گرفته شد.')
      return null
    }
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      warnings.push('یک گره نامعتبر نادیده گرفته شد.')
      return null
    }
    const id = makeUniqueId(raw.id)
    let label = cleanLabel(raw.label)
    if (!label) {
      label = 'بدون عنوان'
      warnings.push('گره بدون عنوان با متن پیش‌فرض جایگزین شد.')
    }
    const children = []
    if (raw.children != null) {
      if (!Array.isArray(raw.children)) {
        warnings.push(`فرزندان گره «${label}» آرایه نبودند و نادیده گرفته شدند.`)
      } else {
        for (const rawChild of raw.children) {
          const child = normalizeNode(rawChild, depth + 1)
          if (child) children.push(child)
        }
      }
    }
    return {
      id,
      label,
      note: cleanNote(raw.note),
      collapsed: raw.collapsed === true,
      children,
    }
  }

  let rootRaw = rawInput
  if (
    rawInput &&
    typeof rawInput === 'object' &&
    !Array.isArray(rawInput) &&
    rawInput.root &&
    typeof rawInput.root === 'object' &&
    !rawInput.id &&
    !rawInput.label &&
    !Array.isArray(rawInput.children)
  ) {
    rootRaw = rawInput.root
  }

  const tree = normalizeNode(rootRaw, 0)
  if (!tree) {
    return {
      ok: false,
      tree: null,
      warnings,
      errors: ['ساختار مایندمپ معتبر نیست: ریشه درخت پیدا نشد.'],
      generatedCount,
    }
  }
  return { ok: true, tree, warnings, errors: [], generatedCount }
}

function insertAt(array, value, index) {
  const safeIndex = Number.isInteger(index) ? Math.max(0, Math.min(index, array.length)) : array.length
  array.splice(safeIndex, 0, value)
  return safeIndex
}

/** افزودن فرزند؛ گره والد باید وجود داشته باشد */
export function addChildNode(root, parentId, node, index) {
  const parent = findNode(root, parentId)
  if (!parent) return { ok: false, error: 'گره والد پیدا نشد.' }
  if (!Array.isArray(parent.children)) parent.children = []
  if (findNode(root, node.id)) return { ok: false, error: 'شناسه گره تکراری است.' }
  const position = insertAt(parent.children, node, index)
  parent.collapsed = false
  return { ok: true, parent, position }
}

/** افزودن همسایه بعد از یک گره (گره ریشه همسایه ندارد) */
export function addSiblingNode(root, siblingId, node) {
  const located = findNodeWithParent(root, siblingId)
  if (!located || !located.parent) {
    return { ok: false, error: 'برای گره ریشه نمی‌توان همسایه ساخت.' }
  }
  const siblings = located.parent.children
  const index = siblings.findIndex((item) => item.id === siblingId)
  return addChildNode(root, located.parent.id, node, index + 1)
}

export function updateNodeLabel(root, id, label) {
  const node = findNode(root, id)
  if (!node) return { ok: false, error: 'گره پیدا نشد.' }
  const cleaned = cleanLabel(label)
  if (!cleaned) return { ok: false, error: 'عنوان گره نمی‌تواند خالی باشد.' }
  node.label = cleaned
  return { ok: true, node }
}

export function updateNodeNote(root, id, note) {
  const node = findNode(root, id)
  if (!node) return { ok: false, error: 'گره پیدا نشد.' }
  node.note = cleanNote(note)
  return { ok: true, node }
}

export function removeNode(root, id) {
  const located = findNodeWithParent(root, id)
  if (!located) return { ok: false, error: 'گره پیدا نشد.' }
  if (!located.parent) return { ok: false, error: 'گره مرکزی قابل حذف نیست.' }
  const index = located.parent.children.findIndex((item) => item.id === id)
  const [removed] = located.parent.children.splice(index, 1)
  return { ok: true, removed, parent: located.parent, index }
}

export function toggleNodeCollapsed(root, id, force) {
  const node = findNode(root, id)
  if (!node) return { ok: false, error: 'گره پیدا نشد.' }
  const hasChildren = Array.isArray(node.children) && node.children.length > 0
  if (!hasChildren) return { ok: false, error: 'این گره فرزندی ندارد.' }
  node.collapsed = typeof force === 'boolean' ? force : !node.collapsed
  return { ok: true, collapsed: node.collapsed }
}

/** جابه‌جایی گره بین والدها با بررسی جلوگیری از چرخه */
export function reparentNode(root, nodeId, newParentId, index) {
  if (nodeId === newParentId) return { ok: false, error: 'گره نمی‌تواند فرزند خودش شود.' }
  const located = findNodeWithParent(root, nodeId)
  if (!located) return { ok: false, error: 'گره پیدا نشد.' }
  if (!located.parent) return { ok: false, error: 'گره مرکزی قابل جابه‌جایی نیست.' }
  const newParent = findNode(root, newParentId)
  if (!newParent) return { ok: false, error: 'والد مقصد پیدا نشد.' }
  if (isDescendant(root, nodeId, newParentId)) {
    return { ok: false, error: 'گره را نمی‌توان زیر شاخه خودش منتقل کرد.' }
  }
  const oldSiblings = located.parent.children
  const oldIndex = oldSiblings.findIndex((item) => item.id === nodeId)
  if (oldIndex === -1) return { ok: false, error: 'گره در والد فعلی پیدا نشد.' }
  oldSiblings.splice(oldIndex, 1)
  const targetSiblings = newParent.children
  let position = index
  if (located.parent === newParent) {
    position = typeof index === 'number' ? Math.max(0, Math.min(index, targetSiblings.length)) : targetSiblings.length
  }
  insertAt(targetSiblings, located.node, position)
  newParent.collapsed = false
  return { ok: true, node: located.node, parent: newParent }
}

/** جابه‌جایی گره در بین هم‌نیاها (منفی یعنی بالاتر) */
export function moveNodeAmongSiblings(root, nodeId, delta) {
  const located = findNodeWithParent(root, nodeId)
  if (!located || !located.parent) return { ok: false, error: 'گره قابل جابه‌جایی نیست.' }
  const siblings = located.parent.children
  const index = siblings.findIndex((item) => item.id === nodeId)
  const targetIndex = index + delta
  if (targetIndex < 0 || targetIndex >= siblings.length) {
    return { ok: false, error: 'گره در انتهای فهرست است.' }
  }
  const [node] = siblings.splice(index, 1)
  siblings.splice(targetIndex, 0, node)
  return { ok: true, index: targetIndex }
}

export function getSiblingInfo(root, nodeId) {
  const located = findNodeWithParent(root, nodeId)
  if (!located || !located.parent) return null
  const siblings = located.parent.children
  return {
    parentId: located.parent.id,
    index: siblings.findIndex((item) => item.id === nodeId),
    count: siblings.length,
  }
}

function flattenEvents(rawEvents) {
  const output = []
  const visit = (raw, inheritedParentId) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      output.push({ invalid: raw })
      return
    }
    const id = typeof raw.id === 'string' ? raw.id.trim() : ''
    const parentId =
      typeof raw.parentId === 'string' && raw.parentId.trim()
        ? raw.parentId.trim()
        : inheritedParentId || null
    output.push({
      id,
      parentId,
      label: raw.label,
      note: raw.note,
      collapsed: raw.collapsed,
    })
    if (Array.isArray(raw.children)) {
      for (const child of raw.children) visit(child, id || inheritedParentId)
    }
  }
  const list = Array.isArray(rawEvents) ? rawEvents : rawEvents ? [rawEvents] : []
  for (const event of list) visit(event, null)
  return output
}

/**
 * ادغام تدریجی گره‌های جدید در درخت موجود.
 * گره‌های تکراری دوباره ساخته نمی‌شوند و رویدادهایی که والدشان هنوز نرسیده
 * در deferred برگردانده می‌شوند تا در بسته بعدی دوباره تلاش شوند.
 */
export function mergeNodeEvents(root, rawEvents) {
  const result = { added: [], updated: [], deferred: [], errors: [] }
  if (!root) {
    result.errors.push('ریشه مایندمپ وجود ندارد.')
    return result
  }
  const events = flattenEvents(rawEvents)
  let pending = events
  let madeProgress = true
  const index = createTreeIndex(root)

  const refreshIndexFrom = (node) => {
    walkTree(node, (item, parent, depth) => {
      index.set(item.id, { node: item, parent, depth })
    })
  }

  while (pending.length > 0 && madeProgress) {
    madeProgress = false
    const nextPending = []
    for (const event of pending) {
      if (event.invalid) {
        result.errors.push('یک رویداد نامعتبر نادیده گرفته شد.')
        madeProgress = true
        continue
      }
      if (!event.id) {
        result.errors.push('رویداد بدون شناسه نادیده گرفته شد.')
        madeProgress = true
        continue
      }
      const existing = index.get(event.id)
      if (existing) {
        const node = existing.node
        if (event.label != null) {
          const clean = cleanLabel(event.label)
          if (clean && clean !== node.label) {
            node.label = clean
            if (!result.updated.includes(event.id)) result.updated.push(event.id)
          }
        }
        if (event.note != null) {
          const clean = cleanNote(event.note)
          if (clean && clean !== node.note) {
            node.note = clean
            if (!result.updated.includes(event.id)) result.updated.push(event.id)
          }
        }
        if (event.collapsed === true || event.collapsed === false) {
          if (node.children.length > 0) node.collapsed = event.collapsed
        }
        madeProgress = true
        continue
      }
      if (!event.parentId) {
        result.errors.push(`گره «${event.id}» والد ندارد.`)
        madeProgress = true
        continue
      }
      const parentEntry = index.get(event.parentId)
      if (!parentEntry) {
        nextPending.push(event)
        continue
      }
      let label = cleanLabel(event.label)
      if (!label) label = 'بدون عنوان'
      const node = {
        id: event.id,
        label,
        note: cleanNote(event.note),
        collapsed: event.collapsed === true,
        children: [],
      }
      const parent = parentEntry.node
      if (!Array.isArray(parent.children)) parent.children = []
      parent.children.push(node)
      parent.collapsed = false
      refreshIndexFrom(node)
      result.added.push(event.id)
      madeProgress = true
    }
    pending = nextPending
  }

  if (pending.length > 0) {
    result.deferred = pending
  }
  return result
}

/** جست‌وجوی متن در عنوان و یادداشت گره‌ها */
export function searchNodes(root, normalizedQuery, normalize) {
  if (!normalizedQuery) return []
  const results = []
  walkTree(root, (node, parent, depth) => {
    const label = normalize ? normalize(node.label) : node.label
    const note = normalize ? normalize(node.note) : node.note
    if (label.includes(normalizedQuery) || (note && note.includes(normalizedQuery))) {
      results.push({ id: node.id, label: node.label, depth })
    }
  })
  return results
}
