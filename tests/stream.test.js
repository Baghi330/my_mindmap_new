import { describe, expect, it } from 'vitest'
import {
  StreamAbortedError,
  buildIncrementalBatches,
  delayWithSignal,
  flattenTreeToEvents,
  streamSampleMindmap,
} from '../src/services/mindmapStream.js'
import { countNodes } from '../src/core/tree.js'
import { sampleMindmap } from './sampleTree.js'

async function collectChunks(tree, options) {
  const chunks = []
  for await (const chunk of streamSampleMindmap(tree, options)) {
    chunks.push(chunk)
  }
  return chunks
}

describe('لایه دریافت داده', () => {
  it('درخت را به رویدادهای والد/فرزند با ترتیب پیش‌ترتیب تبدیل می‌کند', () => {
    const events = flattenTreeToEvents(sampleMindmap)
    expect(events).toHaveLength(countNodes(sampleMindmap))
    expect(events[0]).toMatchObject({ id: sampleMindmap.id, parentId: null, depth: 0 })
    const branch = events.find((event) => event.id === 'branch-1')
    expect(branch.parentId).toBe(sampleMindmap.id)
    expect(branch.depth).toBe(1)
    const lastBranch = events.find((event) => event.id === 'branch-4')
    expect(lastBranch.parentId).toBe(sampleMindmap.id)
    expect(lastBranch.depth).toBe(1)
  })

  it('بسته‌ها همه رویدادها را دقیقاً یک‌بار پوشش می‌دهند و ریشه اول است', () => {
    const batches = buildIncrementalBatches(sampleMindmap)
    expect(batches.length).toBeGreaterThan(1)
    expect(batches[0]).toHaveLength(1)
    expect(batches[0][0].id).toBe(sampleMindmap.id)

    const ids = batches.flat().map((event) => event.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toHaveLength(countNodes(sampleMindmap))
    expect(ids[0]).toBe(sampleMindmap.id)
  })

  it('برای درخت خالی بسته‌ای نمی‌سازد', () => {
    expect(buildIncrementalBatches(null)).toEqual([])
    expect(flattenTreeToEvents(null)).toEqual([])
  })

  it('حالت کامل، کل درخت را یک‌باره می‌فرستد', async () => {
    const chunks = await collectChunks(sampleMindmap, { mode: 'full', baseDelay: 0 })
    expect(chunks).toHaveLength(2)
    expect(chunks[0].type).toBe('tree')
    expect(chunks[0].tree).toBe(sampleMindmap)
    expect(chunks[1].type).toBe('complete')
  })

  it('حالت تدریجی، رویدادها را در چند بسته می‌فرستد', async () => {
    const chunks = await collectChunks(sampleMindmap, { mode: 'incremental', baseDelay: 0 })
    expect(chunks.at(-1).type).toBe('complete')
    const nodeChunks = chunks.filter((chunk) => chunk.type === 'nodes')
    expect(nodeChunks.length).toBeGreaterThan(1)

    const ids = nodeChunks.flatMap((chunk) => chunk.events).map((event) => event.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toHaveLength(countNodes(sampleMindmap))
    expect(ids[0]).toBe(sampleMindmap.id)
  })

  it('تأخیر را با لغو سیگنال متوقف می‌کند', async () => {
    const controller = new AbortController()
    const pending = delayWithSignal(5000, controller.signal)
    controller.abort()
    await expect(pending).rejects.toBeInstanceOf(StreamAbortedError)

    const alreadyAborted = new AbortController()
    alreadyAborted.abort()
    await expect(delayWithSignal(5000, alreadyAborted.signal)).rejects.toBeInstanceOf(
      StreamAbortedError,
    )
  })

  it('جریان لغوشده خطای مشخص می‌دهد', async () => {
    const controller = new AbortController()
    controller.abort()
    const iterator = streamSampleMindmap(sampleMindmap, {
      mode: 'incremental',
      signal: controller.signal,
      baseDelay: 0,
    })
    await expect(iterator.next()).rejects.toBeInstanceOf(StreamAbortedError)
  })
})
