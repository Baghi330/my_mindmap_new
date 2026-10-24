import { describe, expect, it } from 'vitest'
import {
  MAX_DEPTH,
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
  mergeNodeEvents,
  moveNodeAmongSiblings,
  normalizeTree,
  removeNode,
  reparentNode,
  searchNodes,
  toggleNodeCollapsed,
  updateNodeLabel,
} from '../src/core/tree.js'
import { normalizePersianText } from '../src/utils/text.js'

function makeTree() {
  return {
    id: 'root',
    label: 'ریشه',
    note: '',
    collapsed: false,
    children: [
      { id: 'a', label: 'شاخه الف', note: '', collapsed: false, children: [] },
      { id: 'b', label: 'شاخه ب', note: 'یادداشت', collapsed: false, children: [] },
    ],
  }
}

describe('اعتبارسنجی و ترمیم درخت', () => {
  it('شناسه‌های تکراری و خالی را یکتا می‌کند', () => {
    const result = normalizeTree({
      id: 'same',
      label: 'ریشه',
      children: [
        { id: 'same', label: 'فرزند اول', children: [] },
        { id: '', label: 'فرزند دوم', children: [] },
      ],
    })

    expect(result.ok).toBe(true)
    expect(collectIds(result.tree).size).toBe(3)
    expect(result.warnings.length).toBeGreaterThan(0)
    expect(result.tree.children[0].id).not.toBe(result.tree.id)
    expect(result.tree.children[1].id.length).toBeGreaterThan(0)
  })

  it('پوشش root را باز می‌کند و فیلدهای ناشناخته را حذف می‌کند', () => {
    const result = normalizeTree({
      version: 1,
      root: {
        id: 'r',
        label: '  عنوان  ',
        extra: 'حذف شود',
        children: [{ id: 'c', label: 'فرزند', unknown: true }],
      },
    })

    expect(result.ok).toBe(true)
    expect(result.tree.id).toBe('r')
    expect(result.tree.label).toBe('عنوان')
    expect(result.tree).not.toHaveProperty('extra')
    expect(result.tree.children[0]).not.toHaveProperty('unknown')
  })

  it('فرزندان نامعتبر را با هشدار نادیده می‌گیرد', () => {
    const result = normalizeTree({
      id: 'r',
      label: 'ریشه',
      children: 'not-an-array',
    })
    expect(result.ok).toBe(true)
    expect(result.tree.children).toEqual([])
    expect(result.warnings.join(' ')).toContain('آرایه نبودند')
  })

  it('گره بدون عنوان را با متن پیش‌فرض جایگزین می‌کند', () => {
    const result = normalizeTree({ id: 'r', label: '   ', children: [] })
    expect(result.ok).toBe(true)
    expect(result.tree.label).toBe('بدون عنوان')
  })

  it('عمق بیش از حد را می‌شکند', () => {
    const root = { id: 'n0', label: 'ریشه', children: [] }
    let cursor = root
    for (let depth = 1; depth < 40; depth += 1) {
      const child = { id: `n${depth}`, label: `گره ${depth}`, children: [] }
      cursor.children.push(child)
      cursor = child
    }
    const result = normalizeTree(root)
    expect(result.ok).toBe(true)
    let maximumDepth = 0
    const visit = (node, depth) => {
      maximumDepth = Math.max(maximumDepth, depth)
      for (const child of node.children) visit(child, depth + 1)
    }
    visit(result.tree, 0)
    expect(maximumDepth).toBeLessThanOrEqual(MAX_DEPTH)
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  it('ورودی بدون ریشه را رد می‌کند', () => {
    expect(normalizeTree(null).ok).toBe(false)
    expect(normalizeTree('متن').ok).toBe(false)
    expect(normalizeTree({ children: [] }).ok).toBe(false)
  })
})

describe('عملیات درخت', () => {
  it('شناسه‌های جدید تکراری نیستند', () => {
    const tree = makeTree()
    const ids = collectIds(tree)
    const first = createNode('جدید', ids)
    ids.add(first.id)
    const second = createNode('جدید', ids)
    expect(first.id).not.toBe(second.id)
  })

  it('فرزند و همسایه را در جای درست اضافه می‌کند', () => {
    const tree = makeTree()
    const child = createNode('فرزند جدید', collectIds(tree))
    expect(addChildNode(tree, 'a', child).ok).toBe(true)
    expect(tree.children[0].children[0].id).toBe(child.id)

    const sibling = createNode('همسایه', collectIds(tree))
    expect(addSiblingNode(tree, 'a', sibling).ok).toBe(true)
    expect(tree.children.map((item) => item.id)).toEqual(['a', sibling.id, 'b'])
    expect(addSiblingNode(tree, 'root', createNode('x', collectIds(tree))).ok).toBe(false)
  })

  it('شناسه تکراری را در افزودن رد می‌کند', () => {
    const tree = makeTree()
    const duplicate = createNode('تکراری', collectIds(tree), { id: 'a' })
    expect(addChildNode(tree, 'root', duplicate).ok).toBe(false)
  })

  it('گره را حذف می‌کند ولی ریشه را نگه می‌دارد', () => {
    const tree = makeTree()
    tree.children[0].children.push({
      id: 'a-child',
      label: 'فرزند',
      note: '',
      collapsed: false,
      children: [],
    })
    const result = removeNode(tree, 'a')
    expect(result.ok).toBe(true)
    expect(result.removed.id).toBe('a')
    expect(result.removed.children[0].id).toBe('a-child')
    expect(findNode(tree, 'a')).toBeNull()
    expect(removeNode(tree, 'root').ok).toBe(false)
  })

  it('همسایه‌ها را جابه‌جا می‌کند و از مرز عبور نمی‌کند', () => {
    const tree = makeTree()
    expect(moveNodeAmongSiblings(tree, 'b', -1).ok).toBe(true)
    expect(tree.children.map((item) => item.id)).toEqual(['b', 'a'])
    expect(moveNodeAmongSiblings(tree, 'b', -1).ok).toBe(false)
    expect(moveNodeAmongSiblings(tree, 'a', 1).ok).toBe(false)
    expect(getSiblingInfo(tree, 'b')).toMatchObject({ index: 0, count: 2 })
  })

  it('جابه‌جایی بین والدها را انجام می‌دهد و چرخه می‌سازد؟ نه', () => {
    const tree = makeTree()
    const grandChild = { id: 'a-child', label: 'فرزند', note: '', collapsed: false, children: [] }
    tree.children[0].children.push(grandChild)

    expect(reparentNode(tree, 'a-child', 'b').ok).toBe(true)
    expect(findNodeWithParent(tree, 'a-child').parent.id).toBe('b')
    expect(reparentNode(tree, 'a', 'a-child').ok).toBe(false)
    expect(reparentNode(tree, 'a', 'root').ok).toBe(true)
  })

  it('جمع‌شدن گره را فقط برای گره دارای فرزند تغییر می‌دهد', () => {
    const tree = makeTree()
    expect(toggleNodeCollapsed(tree, 'b').ok).toBe(false)
    expect(toggleNodeCollapsed(tree, 'a').ok).toBe(false)
    tree.children[0].children.push({
      id: 'a-child',
      label: 'فرزند',
      note: '',
      collapsed: false,
      children: [],
    })
    expect(toggleNodeCollapsed(tree, 'a').ok).toBe(true)
    expect(tree.children[0].collapsed).toBe(true)
    expect(toggleNodeCollapsed(tree, 'a', false).ok).toBe(true)
    expect(tree.children[0].collapsed).toBe(false)
  })

  it('عنوان خالی را نمی‌پذیرد و عنوان معتبر را تمیز می‌کند', () => {
    const tree = makeTree()
    expect(updateNodeLabel(tree, 'a', '   ').ok).toBe(false)
    expect(updateNodeLabel(tree, 'a', '  عنوان تازه  ').ok).toBe(true)
    expect(tree.children[0].label).toBe('عنوان تازه')
  })

  it('تعداد گره‌ها و زیرشاخه‌ها را درست می‌شمارد', () => {
    const tree = makeTree()
    expect(countNodes(tree)).toBe(3)
    expect(countDescendants(tree)).toBe(2)
    expect(countDescendants(tree.children[0])).toBe(0)
  })

  it('کپی درخت مستقل است', () => {
    const tree = makeTree()
    const copy = cloneTree(tree)
    copy.children[0].label = 'تغییر'
    expect(tree.children[0].label).toBe('شاخه الف')
  })

  it('جست‌وجو در عنوان و یادداشت با نرمال‌سازی انجام می‌شود', () => {
    const tree = makeTree()
    const results = searchNodes(tree, normalizePersianText('يادداشت'), normalizePersianText)
    expect(results.map((item) => item.id)).toEqual(['b'])

    const labelResults = searchNodes(tree, normalizePersianText('شاخه الف'), normalizePersianText)
    expect(labelResults[0].id).toBe('a')
  })
})

describe('ادغام تدریجی گره‌ها', () => {
  it('والد دیررس را نگه می‌دارد و در بسته بعدی اضافه می‌کند', () => {
    const tree = makeTree()
    const first = mergeNodeEvents(tree, [
      { id: 'c', parentId: 'not-yet', label: 'فرزند' },
      { id: 'd', parentId: 'c', label: 'نوه' },
    ])
    expect(first.added).toEqual([])
    expect(first.deferred).toHaveLength(1)

    const second = mergeNodeEvents(tree, [
      ...first.deferred,
      { id: 'not-yet', parentId: 'root', label: 'والد' },
    ])
    expect(second.added.sort()).toEqual(['c', 'd', 'not-yet'])
    expect(findNodeWithParent(tree, 'd').parent.id).toBe('c')
  })

  it('گره موجود را به‌روزرسانی می‌کند و تکرار نمی‌سازد', () => {
    const tree = makeTree()
    const result = mergeNodeEvents(tree, [
      { id: 'a', parentId: 'root', label: 'عنوان تازه', note: 'یادداشت تازه' },
      { id: 'a', parentId: 'root', label: 'عنوان تازه' },
    ])
    expect(result.added).toEqual([])
    expect(result.updated).toEqual(['a'])
    expect(countNodes(tree)).toBe(3)
    expect(findNode(tree, 'a').label).toBe('عنوان تازه')
    expect(findNode(tree, 'a').note).toBe('یادداشت تازه')
  })

  it('رویداد نامعتبر و بدون شناسه را با خطا رد می‌کند', () => {
    const tree = makeTree()
    const result = mergeNodeEvents(tree, [null, { parentId: 'root', label: 'بی‌شناسه' }])
    expect(result.added).toEqual([])
    expect(result.errors.length).toBeGreaterThanOrEqual(2)
  })

  it('فرزندان تودرتوی یک رویداد را هم می‌سازد', () => {
    const tree = makeTree()
    const result = mergeNodeEvents(tree, {
      id: 'branch',
      parentId: 'root',
      label: 'شاخه',
      children: [
        { id: 'leaf-a', label: 'برگ الف' },
        { id: 'leaf-b', label: 'برگ ب', children: [{ id: 'leaf-c', label: 'برگ ج' }] },
      ],
    })
    expect(result.added.sort()).toEqual(['branch', 'leaf-a', 'leaf-b', 'leaf-c'])
    expect(findNodeWithParent(tree, 'leaf-c').parent.id).toBe('leaf-b')
  })
})
