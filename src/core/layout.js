/**
 * چیدمان درختی مایندمپ.
 * درخت از گره مرکزی به دو سمت (یا یک سمت) پخش می‌شود و هر زیرشاخه یک نوار عمودی
 * اختصاصی می‌گیرد؛ بنابراین گره‌ها با اندازه واقعی متنشان روی هم نمی‌افتند.
 * این ماژول خالص است و تابع اندازه‌گیری متن به آن تزریق می‌شود.
 */
import { countDescendants } from './tree.js'

const DEFAULT_OPTIONS = {
  horizontalGap: 54,
  verticalGap: 16,
  rootGap: 76,
  direction: 'balanced',
}

function roundCoordinate(value) {
  return Math.round(value * 100) / 100
}

function sumBands(children, verticalGap) {
  if (children.length === 0) return 0
  return children.reduce((total, child) => total + child.bandHeight, 0) + verticalGap * (children.length - 1)
}

export function createEmptyLayout() {
  return {
    nodes: [],
    edges: [],
    nodeMap: new Map(),
    bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 },
    nodeCount: 0,
    direction: DEFAULT_OPTIONS.direction,
  }
}

/**
 * @param {object} root ریشه درخت
 * @param {object} options
 * @param {(node: object, depth: number) => object} options.measure اندازه‌گیر اندازه گره
 */
export function layoutMindmap(root, options = {}) {
  if (!root) return createEmptyLayout()
  const settings = { ...DEFAULT_OPTIONS, ...options }
  const measure = settings.measure
  if (typeof measure !== 'function') {
    throw new Error('layoutMindmap نیاز به تابع measure دارد.')
  }

  const metaById = new Map()
  const nodeOrder = []

  const buildMeta = (node, depth, parent) => {
    const size = measure(node, depth)
    const rawChildren = Array.isArray(node.children) ? node.children : []
    const isCollapsed = node.collapsed === true && rawChildren.length > 0
    const childMetas = isCollapsed ? [] : rawChildren.map((child) => buildMeta(child, depth + 1, null))
    const meta = {
      id: node.id,
      node,
      depth,
      size,
      parent: null,
      children: childMetas,
      collapsed: isCollapsed,
      hasChildren: rawChildren.length > 0,
      hiddenCount: isCollapsed ? countDescendants(node) : 0,
      bandHeight: 0,
      weight: 1,
      x: 0,
      y: 0,
      side: 'root',
    }
    for (const child of childMetas) child.parent = meta
    meta.bandHeight = Math.max(size.height, sumBands(childMetas, settings.verticalGap))
    meta.weight = 1 + childMetas.reduce((total, child) => total + child.weight, 0)
    metaById.set(meta.id, meta)
    return meta
  }

  const rootMeta = buildMeta(root, 0, null)
  const rootChildren = rootMeta.children
  const leftChildren = []
  const rightChildren = []

  const assignBranchIndex = (meta, index) => {
    meta.branchIndex = index
    for (const child of meta.children) assignBranchIndex(child, index)
  }
  rootMeta.branchIndex = -1
  rootChildren.forEach((child, index) => assignBranchIndex(child, index))

  if (settings.direction === 'rtl') {
    leftChildren.push(...rootChildren)
  } else if (settings.direction === 'ltr') {
    rightChildren.push(...rootChildren)
  } else {
    let leftWeight = 0
    let rightWeight = 0
    for (const child of rootChildren) {
      if (leftWeight <= rightWeight) {
        leftChildren.push(child)
        leftWeight += child.weight
      } else {
        rightChildren.push(child)
        rightWeight += child.weight
      }
    }
  }

  const placeMeta = (meta, top, side) => {
    meta.side = side
    meta.y = roundCoordinate(top + meta.bandHeight / 2)
    if (meta.parent) {
      const sign = side === 'left' ? -1 : 1
      const gap = meta.parent.depth === 0 ? settings.rootGap : settings.horizontalGap
      meta.x = roundCoordinate(
        meta.parent.x + sign * (meta.parent.size.width / 2 + gap + meta.size.width / 2),
      )
    } else {
      meta.x = 0
    }

    const attributes = {
      id: meta.id,
      parentId: meta.parent ? meta.parent.id : null,
      depth: meta.depth,
      label: meta.node?.label || '',
      x: meta.x,
      y: meta.y,
      width: meta.size.width,
      height: meta.size.height,
      lines: meta.size.lines,
      fontSize: meta.size.fontSize,
      fontWeight: meta.size.fontWeight,
      lineHeight: meta.size.lineHeight,
      paddingX: meta.size.paddingX,
      paddingY: meta.size.paddingY,
      radius: meta.size.radius,
      hasNote: Boolean(meta.size.hasNote),
      collapsed: meta.collapsed,
      hasChildren: meta.hasChildren,
      hiddenCount: meta.hiddenCount,
      side,
      branchIndex: meta.branchIndex,
    }
    nodeOrder.push(attributes)
    meta.attributes = attributes

    const totalChildrenHeight = sumBands(meta.children, settings.verticalGap)
    let childTop = meta.y - totalChildrenHeight / 2
    for (const child of meta.children) {
      placeMeta(child, childTop, side)
      childTop += child.bandHeight + settings.verticalGap
    }
  }

  rootMeta.side = 'root'
  rootMeta.x = 0
  rootMeta.y = 0
  rootMeta.attributes = {
    id: rootMeta.id,
    parentId: null,
    depth: 0,
    label: rootMeta.node?.label || '',
    x: 0,
    y: 0,
    width: rootMeta.size.width,
    height: rootMeta.size.height,
    lines: rootMeta.size.lines,
    fontSize: rootMeta.size.fontSize,
    fontWeight: rootMeta.size.fontWeight,
    lineHeight: rootMeta.size.lineHeight,
    paddingX: rootMeta.size.paddingX,
    paddingY: rootMeta.size.paddingY,
    radius: rootMeta.size.radius,
    hasNote: Boolean(rootMeta.size.hasNote),
    collapsed: false,
    hasChildren: rootMeta.hasChildren,
    hiddenCount: 0,
    side: 'root',
    branchIndex: -1,
  }
  nodeOrder.push(rootMeta.attributes)

  const placeSide = (children, side) => {
    const totalHeight = sumBands(children, settings.verticalGap)
    let top = -totalHeight / 2
    for (const child of children) {
      placeMeta(child, top, side)
      top += child.bandHeight + settings.verticalGap
    }
  }

  placeSide(leftChildren, 'left')
  placeSide(rightChildren, 'right')

  const edges = []
  for (const meta of metaById.values()) {
    if (!meta.parent) continue
    const parent = meta.parent
    const side = meta.side === 'left' ? 'left' : 'right'
    const sign = side === 'left' ? -1 : 1
    const parentHalfWidth = parent.size.width / 2
    const parentHalfHeight = parent.size.height / 2
    const startX = parent.x + sign * parentHalfWidth
    const endX = meta.x - sign * meta.size.width / 2
    const verticalInset = Math.min(9, Math.max(0, parentHalfHeight - 6))
    const minY = parent.y - parentHalfHeight + verticalInset
    const maxY = parent.y + parentHalfHeight - verticalInset
    const startY = Math.min(maxY, Math.max(minY, meta.y))
    const endY = meta.y
    const directionSign = Math.sign(endX - startX) || sign
    const curve = Math.max(24, Math.abs(endX - startX) * 0.45)
    const control1X = startX + directionSign * curve
    const control2X = endX - directionSign * curve
    edges.push({
      id: meta.id,
      parentId: parent.id,
      depth: meta.depth,
      side,
      startX: roundCoordinate(startX),
      startY: roundCoordinate(startY),
      endX: roundCoordinate(endX),
      endY: roundCoordinate(endY),
      control1X: roundCoordinate(control1X),
      control1Y: roundCoordinate(startY),
      control2X: roundCoordinate(control2X),
      control2Y: roundCoordinate(endY),
      path: `M ${roundCoordinate(startX)} ${roundCoordinate(startY)} C ${roundCoordinate(control1X)} ${roundCoordinate(startY)}, ${roundCoordinate(control2X)} ${roundCoordinate(endY)}, ${roundCoordinate(endX)} ${roundCoordinate(endY)}`,
      distance: Math.hypot(endX - startX, endY - startY),
    })
  }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const node of nodeOrder) {
    minX = Math.min(minX, node.x - node.width / 2)
    maxX = Math.max(maxX, node.x + node.width / 2)
    minY = Math.min(minY, node.y - node.height / 2)
    maxY = Math.max(maxY, node.y + node.height / 2)
  }
  if (!Number.isFinite(minX)) {
    minX = 0
    minY = 0
    maxX = 0
    maxY = 0
  }
  const bounds = {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY),
  }

  const nodeMap = new Map(nodeOrder.map((node) => [node.id, node]))

  return {
    nodes: nodeOrder,
    edges,
    nodeMap,
    bounds,
    nodeCount: nodeOrder.length,
    direction: settings.direction,
  }
}

/** برای تست: جفت گره‌هایی که مستطیلشان هم‌پوشانی دارد */
export function findOverlappingNodePairs(layout, padding = 0) {
  const overlaps = []
  const nodes = layout.nodes
  for (let first = 0; first < nodes.length; first += 1) {
    for (let second = first + 1; second < nodes.length; second += 1) {
      const a = nodes[first]
      const b = nodes[second]
      const horizontalOverlap =
        Math.abs(a.x - b.x) < (a.width + b.width) / 2 + padding
      const verticalOverlap =
        Math.abs(a.y - b.y) < (a.height + b.height) / 2 + padding
      if (horizontalOverlap && verticalOverlap) {
        overlaps.push([a.id, b.id])
      }
    }
  }
  return overlaps
}
