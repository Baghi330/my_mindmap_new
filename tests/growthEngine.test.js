import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createGrowthEngine } from '../src/composables/useGrowthEngine.js'

const NODES = [
  { id: 'root', parentId: null, x: 0, y: 0 },
  { id: 'a', parentId: 'root', x: 220, y: -80 },
  { id: 'b', parentId: 'root', x: 220, y: 80 },
  { id: 'a1', parentId: 'a', x: 440, y: -100 },
]

let callbacks = new Map()
let nextFrameId = 1
let now = 0
let originalRequestAnimationFrame
let originalCancelAnimationFrame

function installFakeAnimationFrame() {
  callbacks = new Map()
  nextFrameId = 1
  now = 0
  originalRequestAnimationFrame = globalThis.requestAnimationFrame
  originalCancelAnimationFrame = globalThis.cancelAnimationFrame
  globalThis.requestAnimationFrame = (callback) => {
    const id = nextFrameId
    nextFrameId += 1
    callbacks.set(id, callback)
    return id
  }
  globalThis.cancelAnimationFrame = (id) => {
    callbacks.delete(id)
  }
}

function runFrame(step = 16) {
  now += step
  const pending = [...callbacks.values()]
  callbacks.clear()
  for (const callback of pending) callback(now)
}

function runUntilComplete(engine, guard = 5000) {
  let frames = 0
  while (!engine.isComplete.value && frames < guard) {
    runFrame()
    frames += 1
  }
  return frames
}

beforeEach(() => {
  installFakeAnimationFrame()
})

afterEach(() => {
  globalThis.requestAnimationFrame = originalRequestAnimationFrame
  globalThis.cancelAnimationFrame = originalCancelAnimationFrame
})

describe('موتور رشد تدریجی', () => {
  it('از ریشه شروع می‌کند و همه گره‌ها را کامل می‌کند', () => {
    const engine = createGrowthEngine()
    engine.sync(NODES)

    expect(engine.totalCount.value).toBe(4)
    expect(engine.drawnCount.value).toBe(0)
    expect(engine.isPlaying.value).toBe(true)
    expect(engine.isComplete.value).toBe(false)

    const frames = runUntilComplete(engine)
    expect(frames).toBeGreaterThan(1)
    expect(engine.isComplete.value).toBe(true)
    expect(engine.isPlaying.value).toBe(false)
    expect(engine.drawnCount.value).toBe(4)
    expect(engine.progress.value).toBe(1)
    expect(callbacks.size).toBe(0)
  })

  it('توقف، شمارش را نگه می‌دارد و ادامه آن را از سر می‌گیرد', () => {
    const engine = createGrowthEngine()
    engine.sync(NODES)
    for (let index = 0; index < 6; index += 1) runFrame()

    engine.pause()
    expect(engine.isPlaying.value).toBe(false)
    const drawnAtPause = engine.drawnCount.value
    expect(callbacks.size).toBe(0)

    runFrame(5000)
    expect(engine.drawnCount.value).toBe(drawnAtPause)

    engine.play()
    expect(engine.isPlaying.value).toBe(true)
    runUntilComplete(engine)
    expect(engine.isComplete.value).toBe(true)
    expect(engine.drawnCount.value).toBe(4)
  })

  it('گره تازه‌رسیده را پس از پایان هم زمان‌بندی می‌کند', () => {
    const engine = createGrowthEngine()
    engine.sync(NODES)
    runUntilComplete(engine)
    expect(engine.isComplete.value).toBe(true)

    const appended = {
      id: 'b1',
      parentId: 'b',
      x: 440,
      y: 100,
    }
    engine.sync([...NODES, appended])
    expect(engine.totalCount.value).toBe(5)
    expect(engine.isComplete.value).toBe(false)
    expect(engine.isPlaying.value).toBe(true)

    runUntilComplete(engine)
    expect(engine.isComplete.value).toBe(true)
    expect(engine.drawnCount.value).toBe(5)
  })

  it('گره حذف‌شده را از شمارش کنار می‌گذارد', () => {
    const engine = createGrowthEngine()
    engine.sync(NODES)
    runUntilComplete(engine)
    engine.sync(NODES.filter((node) => node.id !== 'a1'))

    expect(engine.totalCount.value).toBe(3)
    expect(engine.drawnCount.value).toBe(3)
    expect(engine.isComplete.value).toBe(true)
  })

  it('حالت فوری همه گره‌ها را بدون پخش کامل نشان می‌دهد', () => {
    const engine = createGrowthEngine()
    engine.sync(NODES, { instant: true })

    expect(engine.isComplete.value).toBe(true)
    expect(engine.isPlaying.value).toBe(false)
    expect(engine.drawnCount.value).toBe(4)
    expect(callbacks.size).toBe(0)
  })

  it('پخش مجدد، انیمیشن را از ابتدا شروع می‌کند', () => {
    const engine = createGrowthEngine()
    engine.sync(NODES)
    runUntilComplete(engine)

    expect(engine.replay()).toBe(true)
    expect(engine.totalCount.value).toBe(4)
    expect(engine.drawnCount.value).toBe(0)
    expect(engine.isComplete.value).toBe(false)
    expect(engine.isPlaying.value).toBe(true)

    runUntilComplete(engine)
    expect(engine.drawnCount.value).toBe(4)
  })

  it('پخش یک شاخه فقط همان شاخه را دوباره می‌سازد', () => {
    const engine = createGrowthEngine()
    engine.sync(NODES)
    runUntilComplete(engine)
    expect(engine.drawnCount.value).toBe(4)

    expect(engine.replaySubtree('a')).toBe(true)
    expect(engine.totalCount.value).toBe(4)
    expect(engine.drawnCount.value).toBeLessThan(4)
    expect(engine.isPlaying.value).toBe(true)

    runUntilComplete(engine)
    expect(engine.drawnCount.value).toBe(4)
    expect(engine.replaySubtree('missing')).toBe(false)
  })

  it('سرعت بیشتر، پخش را سریع‌تر تمام می‌کند', () => {
    const slowEngine = createGrowthEngine()
    slowEngine.sync(NODES)
    const slowFrames = runUntilComplete(slowEngine)

    const fastEngine = createGrowthEngine()
    fastEngine.speed.value = 3
    fastEngine.sync(NODES)
    const fastFrames = runUntilComplete(fastEngine)

    expect(fastFrames).toBeLessThan(slowFrames)
    expect(fastEngine.isComplete.value).toBe(true)
  })

  it('بازنشانی وضعیت را پاک می‌کند', () => {
    const engine = createGrowthEngine()
    engine.sync(NODES)
    runUntilComplete(engine)
    engine.reset()

    expect(engine.totalCount.value).toBe(0)
    expect(engine.drawnCount.value).toBe(0)
    expect(engine.isComplete.value).toBe(false)
    expect(engine.isPlaying.value).toBe(false)
    expect(engine.replay()).toBe(false)
  })
})
