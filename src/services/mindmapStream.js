/**
 * لایه دریافت داده مایندمپ.
 * در نسخه فعلی داده آزمایشی تولید می‌شود، اما خروجی این لایه همان قراردادی است
 * که یک مدل هوش مصنوعی واقعی می‌تواند تولید کند:
 *
 *   { type: 'tree', tree: {...} }                  ← دریافت کل مایندمپ
 *   { type: 'nodes', events: [{ id, parentId, label, note }] }  ← دریافت تدریجی
 *
 * برای اتصال واقعی کافی است همین async generator با منبع داده جایگزین شود.
 */

export class StreamAbortedError extends Error {
  constructor() {
    super('تولید داده متوقف شد.')
    this.name = 'StreamAbortedError'
  }
}

export function delayWithSignal(milliseconds, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new StreamAbortedError())
      return
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', handleAbort)
      resolve()
    }, Math.max(0, milliseconds))
    function handleAbort() {
      clearTimeout(timer)
      signal?.removeEventListener('abort', handleAbort)
      reject(new StreamAbortedError())
    }
    signal?.addEventListener('abort', handleAbort, { once: true })
  })
}

/** تبدیل درخت به فهرست رویدادهای والد/فرزند با ترتیب پیش‌ترتیب */
export function flattenTreeToEvents(tree) {
  const events = []
  const visit = (node, parentId, depth) => {
    events.push({
      id: node.id,
      parentId,
      depth,
      label: node.label,
      note: node.note || '',
      collapsed: node.collapsed === true,
    })
    const children = Array.isArray(node.children) ? node.children : []
    for (const child of children) visit(child, node.id, depth + 1)
  }
  if (tree) visit(tree, null, 0)
  return events
}

/**
 * بسته‌بندی رویدادها شبیه یک مدل که اول ریشه، بعد شاخه‌های اصلی و
 * سپس زیرشاخه‌ها را یکی‌یکی تولید می‌کند.
 */
export function buildIncrementalBatches(tree) {
  const events = flattenTreeToEvents(tree)
  if (events.length === 0) return []
  const batches = [[events[0]]]

  const rest = events.slice(1)
  let index = 0
  while (index < rest.length) {
    const event = rest[index]
    const size = event.depth <= 1 ? 1 : 2
    batches.push(rest.slice(index, index + size))
    index += size
  }
  return batches
}

/** تأخیر طبیعی بین بسته‌ها؛ ثابت است تا رفتار قابل پیش‌بینی بماند */
const CHUNK_DELAYS = [580, 760, 500, 860, 640]

/**
 * @param {object} tree درخت کامل نمونه
 * @param {{ mode?: 'full'|'incremental', signal?: AbortSignal, baseDelay?: number }} options
 */
export async function* streamSampleMindmap(tree, options = {}) {
  const mode = options.mode === 'full' ? 'full' : 'incremental'
  const signal = options.signal
  const baseDelay = Number.isFinite(options.baseDelay) ? options.baseDelay : 1

  if (mode === 'full') {
    await delayWithSignal(320 * baseDelay, signal)
    yield { type: 'tree', tree }
    await delayWithSignal(240 * baseDelay, signal)
    yield { type: 'complete' }
    return
  }

  const batches = buildIncrementalBatches(tree)
  for (let index = 0; index < batches.length; index += 1) {
    await delayWithSignal(CHUNK_DELAYS[index % CHUNK_DELAYS.length] * baseDelay, signal)
    yield { type: 'nodes', events: batches[index] }
  }
  yield { type: 'complete' }
}
