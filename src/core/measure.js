/**
 * اندازه‌گیری واقعی متن برای چیدمان.
 * عرض هر خط با Canvas اندازه‌گیری می‌شود تا گره‌ها اندازه واقعی متن را بگیرند
 * و شکستن خطوط از قبل محاسبه شود. منطق اندازه‌گیری از منطق رسم جدا است.
 */
import { detectTextDirection } from '../utils/text.js'

export const FONT_FAMILY =
  "'Vazirmatn Variable', Vazirmatn, 'Noto Sans Arabic UI', 'Segoe UI', Tahoma, sans-serif"

export const DEFAULT_FONT_SCALE = 1

/** مشخصات تایپوگرافی هر عمق */
export function getNodeTypography(depth, fontScale = DEFAULT_FONT_SCALE) {
  const scale = Number.isFinite(fontScale) ? fontScale : 1
  if (depth === 0) {
    return {
      fontSize: 19 * scale,
      fontWeight: 700,
      lineHeight: 29 * scale,
      paddingX: 24,
      paddingY: 17,
      maxWidth: 330,
      minWidth: 150,
      radius: 18,
      letterSpacing: 0,
    }
  }
  if (depth === 1) {
    return {
      fontSize: 15 * scale,
      fontWeight: 650,
      lineHeight: 24 * scale,
      paddingX: 17,
      paddingY: 11,
      maxWidth: 270,
      minWidth: 92,
      radius: 13,
      letterSpacing: 0,
    }
  }
  return {
    fontSize: 13.5 * scale,
    fontWeight: 500,
    lineHeight: 22 * scale,
    paddingX: 14,
    paddingY: 9,
    maxWidth: 250,
    minWidth: 72,
    radius: 11,
    letterSpacing: 0,
  }
}

function splitWordByWidth(word, maxWidth, measure) {
  const chunks = []
  let current = ''
  for (const character of Array.from(word)) {
    const candidate = current + character
    if (current && measure(candidate) > maxWidth) {
      chunks.push(current)
      current = character
    } else {
      current = candidate
    }
  }
  if (current) chunks.push(current)
  return chunks
}

function truncateLine(line, maxWidth, measure) {
  const source = String(line).endsWith('…') ? String(line).slice(0, -1) : String(line)
  const characters = Array.from(source)
  let low = 0
  let high = characters.length
  while (low < high) {
    const middle = Math.ceil((low + high) / 2)
    const candidate = characters.slice(0, middle).join('').trimEnd() + '…'
    if (measure(candidate) <= maxWidth) low = middle
    else high = middle - 1
  }
  return characters.slice(0, Math.max(0, low)).join('').trimEnd() + '…'
}

/** شکستن متن با احترام به کلمات و خطوط دستی، حداکثر تا maxLines */
export function wrapLabel(label, maxWidth, measure, maxLines = 10) {
  const normalized = String(label ?? '').replace(/\r\n?/g, '\n')
  const paragraphs = normalized.split('\n')
  const lines = []

  for (const rawParagraph of paragraphs) {
    const paragraph = rawParagraph.replace(/[ \t]+/g, ' ').trim()
    if (!paragraph) {
      lines.push('')
      continue
    }
    const words = paragraph.split(' ').filter(Boolean)
    let currentLine = ''

    const pushLine = () => {
      lines.push(currentLine)
      currentLine = ''
    }

    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word
      if (measure(candidate) <= maxWidth) {
        currentLine = candidate
        continue
      }
      if (currentLine) {
        pushLine()
      }
      if (measure(word) <= maxWidth) {
        currentLine = word
      } else {
        const chunks = splitWordByWidth(word, maxWidth, measure)
        for (let index = 0; index < chunks.length - 1; index += 1) {
          lines.push(chunks[index])
        }
        currentLine = chunks[chunks.length - 1] || ''
      }
    }
    if (currentLine || lines.length === 0) pushLine()
  }

  const safeLines = lines.length > 0 ? lines : ['']
  if (safeLines.length > maxLines) {
    const visible = safeLines.slice(0, maxLines)
    visible[maxLines - 1] = truncateLine(visible[maxLines - 1], maxWidth, measure)
    return visible
  }
  return safeLines
}

function fallbackMeasureText(text) {
  return Array.from(text ?? '').length * 8
}

function createCanvasMeasureText(fontFamily) {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
    return fallbackMeasureText
  }
  let canvas = null
  try {
    canvas = document.createElement('canvas')
  } catch {
    return fallbackMeasureText
  }
  const context = canvas.getContext?.('2d')
  if (!context) {
    return fallbackMeasureText
  }
  return (text, font) => {
    context.font = font
    return context.measureText(text).width
  }
}

/**
 * اندازه‌گیر گره می‌سازد. اندازه‌گیری متن تزریق‌پذیر است تا تست بدون DOM اجرا شود.
 */
export function createNodeMeasurer(options = {}) {
  const fontFamily = options.fontFamily || FONT_FAMILY
  const measureText = options.measureText || createCanvasMeasureText(fontFamily)
  const cache = new Map()
  const maxCacheSize = 1200

  const buildFont = (typography) => `${typography.fontWeight} ${typography.fontSize}px ${fontFamily}`

  return function measureNode(node, depth) {
    const typography = getNodeTypography(depth, options.fontScale)
    const label = node?.label ?? ''
    const hasNote = Boolean(node?.note)
    const cacheKey = `${depth}|${typography.fontSize}|${typography.maxWidth}|${hasNote ? 1 : 0}|${label}`
    const cached = cache.get(cacheKey)
    if (cached) return cached

    const font = buildFont(typography)
    const localMeasure = (text) => measureText(text, font)
    const contentWidth = typography.maxWidth - typography.paddingX * 2
    const rawLines = wrapLabel(label, contentWidth, localMeasure, depth === 0 ? 5 : 8)
    const lines = rawLines.map((text) => ({
      text,
      direction: detectTextDirection(text),
      width: text ? localMeasure(text) : 0,
    }))
    const longestLine = lines.reduce((max, line) => Math.max(max, line.width), 0)
    const width = Math.max(
      typography.minWidth,
      Math.min(typography.maxWidth, Math.ceil(longestLine + typography.paddingX * 2 + 1)),
    )
    const height = Math.ceil(lines.length * typography.lineHeight + typography.paddingY * 2)

    const result = {
      width,
      height,
      lines,
      fontSize: typography.fontSize,
      fontWeight: typography.fontWeight,
      lineHeight: typography.lineHeight,
      paddingX: typography.paddingX,
      paddingY: typography.paddingY,
      radius: typography.radius,
      hasNote,
    }
    if (cache.size >= maxCacheSize) cache.clear()
    cache.set(cacheKey, result)
    return result
  }
}

