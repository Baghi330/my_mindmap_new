/**
 * ابزارهای مشترک تست: اندازه‌گیری قطعی متن و ساخت درخت تصادفی قابل تکرار.
 * اندازه‌گیری واقعی در مرورگر با Canvas انجام می‌شود؛ اینجا فقط برای تست
 * چیدمان از یک تخمین ثابت استفاده می‌کنیم تا نتیجه در همه محیط‌ها یکسان باشد.
 */

export function measureTextForTests(text, font = '') {
  const fontSizeMatch = font.match(/(\d+(?:\.\d+)?)px/)
  const fontSize = fontSizeMatch ? Number(fontSizeMatch[1]) : 14
  return Array.from(String(text ?? '')).length * fontSize * 0.56
}

export function createSeededRandom(seed = 1) {
  let state = seed >>> 0
  return function random() {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}

const LABELS = [
  'روش‌های نوین پژوهش',
  'تحلیل داده‌های حجیم',
  'مدل‌سازی پیش‌بینانه',
  'بازیابی معنایی منابع',
  'اعتبارسنجی متقابل (Cross-Validation)',
  'ابزارهای هوش مصنوعی',
  'دستیار نگارش علمی',
  'اخلاق و مسئولیت‌پذیری',
  'شفافیت الگوریتمی',
  'سوگیری در داده‌ها',
  'آموزش و مهارت‌آموزی',
  'طراحی برنامهٔ درسی',
  'همکاری بین‌رشته‌ای',
  'علوم اجتماعی محاسباتی',
  'چالش‌ها و محدودیت‌ها',
  'توهم‌زایی مدل‌های زبانی (LLM)',
  'پژوهش',
  'AI & Research',
]

/** درخت تصادفی با شناسه‌های یکتا برای آزمون چیدمان */
export function buildRandomTree(random, maxDepth = 5, maxChildren = 4) {
  let nextId = 0

  function buildNode(depth) {
    const node = {
      id: `node-${nextId}`,
      label: LABELS[Math.floor(random() * LABELS.length)],
      note: random() < 0.16 ? 'یادداشت کوتاه برای این گره.' : '',
      collapsed: false,
      children: [],
    }
    nextId += 1
    if (depth >= maxDepth) return node
    const childCount = Math.floor(random() * (maxChildren + 1))
    for (let index = 0; index < childCount; index += 1) {
      node.children.push(buildNode(depth + 1))
    }
    return node
  }

  return buildNode(0)
}

export function countVisibleNodes(root) {
  if (!root) return 0
  const children = root.collapsed === true ? [] : root.children || []
  let total = 1
  for (const child of children) total += countVisibleNodes(child)
  return total
}
