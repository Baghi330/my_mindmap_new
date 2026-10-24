import { describe, expect, it } from 'vitest'
import { createNodeMeasurer } from '../src/core/measure.js'
import {
  createEmptyLayout,
  findOverlappingNodePairs,
  layoutMindmap,
} from '../src/core/layout.js'
import { countNodes, walkTree } from '../src/core/tree.js'
import { sampleMindmap } from '../src/data/sampleMindmap.js'
import {
  buildRandomTree,
  countVisibleNodes,
  createSeededRandom,
  measureTextForTests,
} from './helpers.js'

function createLayout(root, direction = 'balanced') {
  const measure = createNodeMeasurer({
    measureText: (text, font) => measureTextForTests(text, font),
    fontScale: 1,
  })
  return layoutMindmap(root, { measure, direction })
}

const DIRECTIONS = ['balanced', 'rtl', 'ltr']

describe('چیدمان درخت', () => {
  it('درخت خالی را بدون خطا برمی‌گرداند', () => {
    const layout = createEmptyLayout()
    expect(layout.nodes).toEqual([])
    expect(layout.edges).toEqual([])
    expect(layout.nodeCount).toBe(0)
  })

  it('بدون تابع اندازه‌گیری خطا می‌دهد', () => {
    expect(() => layoutMindmap(sampleMindmap)).toThrow()
  })

  it.each(DIRECTIONS)('درخت نمونه در جهت %s بدون هم‌پوشانی است', (direction) => {
    const layout = createLayout(sampleMindmap, direction)
    expect(layout.nodeCount).toBe(countNodes(sampleMindmap))
    expect(findOverlappingNodePairs(layout)).toEqual([])

    const rootNode = layout.nodeMap.get(sampleMindmap.id)
    expect(rootNode).toBeTruthy()
    expect(rootNode.x).toBe(0)
    expect(rootNode.y).toBe(0)
    expect(rootNode.depth).toBe(0)
    expect(rootNode.side).toBe('root')

    for (const node of layout.nodes) {
      if (node.depth === 0) continue
      expect(node.x).not.toBe(0)
      expect(Math.abs(node.x)).toBeGreaterThan(0)
      expect(node.parentId).not.toBeNull()
      expect(layout.nodeMap.has(node.parentId)).toBe(true)
    }
  })

  it.each(DIRECTIONS)('درخت‌های تصادفی در جهت %s بدون هم‌پوشانی‌اند', (direction) => {
    for (let seed = 1; seed <= 18; seed += 1) {
      const random = createSeededRandom(seed)
      const tree = buildRandomTree(random, 5, 4)
      const layout = createLayout(tree, direction)

      expect(layout.nodeCount).toBe(countVisibleNodes(tree))
      expect(findOverlappingNodePairs(layout)).toEqual([])
      expect(layout.bounds.maxX).toBeGreaterThanOrEqual(layout.bounds.minX)
      expect(layout.bounds.maxY).toBeGreaterThanOrEqual(layout.bounds.minY)

      for (const node of layout.nodes) {
        expect(node.x - node.width / 2).toBeGreaterThanOrEqual(layout.bounds.minX - 0.01)
        expect(node.x + node.width / 2).toBeLessThanOrEqual(layout.bounds.maxX + 0.01)
        expect(node.y - node.height / 2).toBeGreaterThanOrEqual(layout.bounds.minY - 0.01)
        expect(node.y + node.height / 2).toBeLessThanOrEqual(layout.bounds.maxY + 0.01)
      }

      if (direction === 'rtl') {
        for (const node of layout.nodes) {
          if (node.depth > 0) expect(node.side).toBe('left')
        }
      } else if (direction === 'ltr') {
        for (const node of layout.nodes) {
          if (node.depth > 0) expect(node.side).toBe('right')
        }
      }
    }
  })

  it('در جهت دوطرفه شاخه‌ها بین دو سمت تقسیم می‌شوند', () => {
    const layout = createLayout(sampleMindmap, 'balanced')
    const left = layout.nodes.filter((node) => node.side === 'left')
    const right = layout.nodes.filter((node) => node.side === 'right')
    expect(left.length).toBeGreaterThan(0)
    expect(right.length).toBeGreaterThan(0)
  })

  it('در جهت راست‌به‌چپ همه شاخه‌ها سمت چپ ریشه‌اند', () => {
    const layout = createLayout(sampleMindmap, 'rtl')
    const rootBranchNodes = layout.nodes.filter((node) => node.depth === 1)
    expect(rootBranchNodes.every((node) => node.side === 'left')).toBe(true)
    expect(rootBranchNodes.every((node) => node.x < 0)).toBe(true)
  })

  it('گره جمع‌شده زیرشاخه‌ها را از چیدمان حذف می‌کند', () => {
    const tree = JSON.parse(JSON.stringify(sampleMindmap))
    tree.children[0].collapsed = true
    const layout = createLayout(tree, 'balanced')
    const collapsedNode = layout.nodeMap.get(tree.children[0].id)

    expect(collapsedNode).toBeTruthy()
    expect(collapsedNode.collapsed).toBe(true)
    expect(collapsedNode.hiddenCount).toBe(countNodes(tree.children[0]) - 1)
    expect(layout.nodes.some((node) => node.id === 'methods-data')).toBe(false)
    expect(findOverlappingNodePairs(layout)).toEqual([])
  })

  it('یال‌ها به والد درست و لبه گره‌ها متصل می‌شوند', () => {
    const layout = createLayout(sampleMindmap, 'balanced')
    expect(layout.edges).toHaveLength(layout.nodeCount - 1)

    const edge = layout.edges.find((item) => item.id === 'methods')
    const parent = layout.nodeMap.get(edge.parentId)
    const child = layout.nodeMap.get(edge.id)
    expect(edge.startX).toBeCloseTo(parent.x - parent.width / 2)
    expect(edge.endX).toBeCloseTo(child.x + child.width / 2)
    expect(edge.path.startsWith('M ')).toBe(true)
    expect(edge.path).toContain(' C ')
    expect(edge.distance).toBeGreaterThan(0)
  })

  it('شناسه، عنوان و اطلاعات شاخه را در خروجی نگه می‌دارد', () => {
    const layout = createLayout(sampleMindmap, 'balanced')
    const nodes = new Map(layout.nodes.map((node) => [node.id, node]))
    expect(nodes.get('methods').label).toBe('روش‌های نوین پژوهش')
    expect(nodes.get('methods').branchIndex).toBe(0)
    expect(nodes.get('tools').branchIndex).toBe(1)
    expect(nodes.get('methods-vector').branchIndex).toBe(0)
    expect(nodes.get('methods-vector').parentId).toBe('methods-search')
  })

  it('همه گره‌های چیدمان در پیمایش درخت حاضرند', () => {
    const layout = createLayout(sampleMindmap, 'balanced')
    const visited = []
    walkTree(sampleMindmap, (node) => {
      visited.push(node.id)
    })
    expect(visited.sort()).toEqual(layout.nodes.map((node) => node.id).sort())
  })
})
