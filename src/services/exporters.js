/**
 * خروجی‌های JSON، SVG، PNG و چاپ.
 * SVG به‌صورت مستقل و با فونت جاسازی‌شده ساخته می‌شود تا خروجی همه‌جا
 * یکسان دیده شود. PNG مستقیماً از روی چیدمان رسم می‌شود و به کتابخانه
 * جانبی وابسته نیست.
 */
import { FONT_FAMILY } from '../core/measure.js'
import { getBranchColor } from '../theme/palettes.js'
import { toPersianDigits, toSafeFileName } from '../utils/text.js'
import arabicFontUrl from '@fontsource-variable/vazirmatn/files/vazirmatn-arabic-wght-normal.woff2?url'
import latinFontUrl from '@fontsource-variable/vazirmatn/files/vazirmatn-latin-wght-normal.woff2?url'

const EXPORT_FONT_FAMILY =
  "'Vazirmatn Export', 'Vazirmatn Variable', Vazirmatn, Tahoma, sans-serif"

const EXPORT_PADDING = 64
const HEADER_HEIGHT = 96

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function formatDate() {
  try {
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date())
  } catch {
    return ''
  }
}

function getExportGeometry(layout) {
  const width = Math.ceil(layout.bounds.width + EXPORT_PADDING * 2)
  const height = Math.ceil(layout.bounds.height + EXPORT_PADDING * 2 + HEADER_HEIGHT)
  const offsetX = EXPORT_PADDING - layout.bounds.minX
  const offsetY = EXPORT_PADDING + HEADER_HEIGHT - layout.bounds.minY
  return { width, height, offsetX, offsetY }
}

function getNodeColors(node, theme) {
  const isRoot = node.depth === 0
  return {
    fill: isRoot ? theme.rootFill : node.depth === 1 ? theme.nodeFill : theme.nodeFillSubtle,
    stroke: isRoot ? theme.rootStroke : node.depth === 1 ? theme.nodeStrokeStrong : theme.nodeStroke,
    text: isRoot ? theme.rootText : theme.nodeText,
    shadow: isRoot ? 0.22 : node.depth === 1 ? 0.1 : 0.06,
  }
}

function renderNodeSvg(node, theme, offsetX, offsetY) {
  const colors = getNodeColors(node, theme)
  const branchColor = getBranchColor(theme, node.branchIndex)
  const halfWidth = node.width / 2
  const halfHeight = node.height / 2
  const parts = []
  parts.push(`<g transform="translate(${(offsetX + node.x).toFixed(2)} ${(offsetY + node.y).toFixed(2)})">`)
  parts.push(
    `<rect x="${-halfWidth}" y="${-halfHeight}" width="${node.width}" height="${node.height}" rx="${node.radius}" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="1.2" filter="url(#mm-shadow)" />`,
  )
  if (node.depth > 0 && node.branchIndex >= 0) {
    const barX = node.side === 'left' ? halfWidth - 4.5 : -halfWidth + 1.5
    const barHeight = Math.max(6, node.height - 15)
    parts.push(
      `<rect x="${barX}" y="${-barHeight / 2}" width="3" height="${barHeight}" rx="1.5" fill="${branchColor}" opacity="${node.depth === 1 ? 0.9 : 0.42}" />`,
    )
  }
  const startY = -halfHeight + node.paddingY + node.lineHeight / 2
  node.lines.forEach((line, index) => {
    if (!line.text) return
    const y = startY + index * node.lineHeight
    parts.push(
      `<text x="0" y="${y.toFixed(2)}" text-anchor="middle" dominant-baseline="central" direction="${line.direction}" font-family="${EXPORT_FONT_FAMILY.replace(/"/g, '&quot;')}" font-size="${node.fontSize}" font-weight="${node.fontWeight}" fill="${colors.text}">${escapeXml(line.text)}</text>`,
    )
  })
  if (node.hasNote) {
    const dotX = node.side === 'left' ? -halfWidth + 9 : halfWidth - 9
    parts.push(
      `<circle cx="${dotX}" cy="${-halfHeight + 9}" r="3" fill="${theme.noteColor}" opacity="0.9" />`,
    )
  }
  if (node.collapsed && node.hiddenCount > 0) {
    const badgeX = node.side === 'right' ? halfWidth : -halfWidth
    parts.push(
      `<g><circle cx="${badgeX}" cy="0" r="10" fill="${theme.badgeFill}" stroke="${theme.badgeStroke}" stroke-width="1" /><text x="${badgeX}" y="0.5" text-anchor="middle" dominant-baseline="central" font-family="${EXPORT_FONT_FAMILY.replace(/"/g, '&quot;')}" font-size="9.5" font-weight="600" fill="${theme.badgeText}">${escapeXml(toPersianDigits(node.hiddenCount))}</text></g>`,
    )
  }
  parts.push('</g>')
  return parts.join('')
}

export function renderMindmapSvg(layout, options = {}) {
  const theme = options.theme
  const title = options.title || 'مایندمپ'
  const subtitle = options.subtitle || `ذهن‌نگار • ${formatDate()}`
  const geometry = getExportGeometry(layout)
  const { width, height, offsetX, offsetY } = geometry
  const background = options.background || theme.stageBg
  const shadowColor = theme.mode === 'dark' ? '#000000' : '#1e2a44'
  const parts = []

  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(title)}">`,
  )
  parts.push(
    `<title>${escapeXml(title)}</title><desc>${escapeXml(subtitle)}</desc>`,
  )
  parts.push(
    `<defs><filter id="mm-shadow" x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="3" stdDeviation="5" flood-color="${shadowColor}" flood-opacity="0.13" /></filter></defs>`,
  )
  if (options.fontCss) parts.push(options.fontCss)
  parts.push(`<rect width="${width}" height="${height}" fill="${background}" />`)

  const titleX = width - EXPORT_PADDING
  parts.push(
    `<text x="${titleX}" y="${EXPORT_PADDING + 4}" text-anchor="end" direction="rtl" font-family="${EXPORT_FONT_FAMILY.replace(/"/g, '&quot;')}" font-size="22" font-weight="700" fill="${theme.exportTitle}">${escapeXml(title)}</text>`,
  )
  parts.push(
    `<text x="${titleX}" y="${EXPORT_PADDING + 30}" text-anchor="end" direction="rtl" font-family="${EXPORT_FONT_FAMILY.replace(/"/g, '&quot;')}" font-size="11.5" font-weight="500" fill="${theme.exportSubtitle}">${escapeXml(subtitle)}</text>`,
  )
  parts.push(
    `<line x1="${EXPORT_PADDING}" y1="${HEADER_HEIGHT + 22}" x2="${width - EXPORT_PADDING}" y2="${HEADER_HEIGHT + 22}" stroke="${theme.borderStrong}" stroke-width="1" opacity="0.5" />`,
  )

  for (const edge of layout.edges) {
    const branchColor = getBranchColor(theme, getBranchIndexForEdge(layout, edge))
    parts.push(
      `<path d="${edge.path}" transform="translate(${offsetX.toFixed(2)} ${offsetY.toFixed(2)})" fill="none" stroke="${branchColor}" stroke-width="${edge.depth === 1 ? 2.2 : 1.5}" stroke-linecap="round" opacity="${edge.depth === 1 ? 0.62 : 0.34}" />`,
    )
  }
  for (const node of layout.nodes) {
    parts.push(renderNodeSvg(node, theme, offsetX, offsetY))
  }
  parts.push('</svg>')
  return parts.join('')
}

function getBranchIndexForEdge(layout, edge) {
  const node = layout.nodeMap.get(edge.id)
  return node ? node.branchIndex : 0
}

let fontCssPromise = null

function getLoadedFontCss() {
  if (!fontCssPromise) {
    fontCssPromise = (async () => {
      try {
        const toDataUrl = async (url) => {
          const response = await fetch(url)
          if (!response.ok) throw new Error('دریافت فونت ناموفق بود.')
          const blob = await response.blob()
          return await new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(String(reader.result))
            reader.onerror = () => reject(new Error('تبدیل فونت ناموفق بود.'))
            reader.readAsDataURL(blob)
          })
        }
        const [arabic, latin] = await Promise.all([toDataUrl(arabicFontUrl), toDataUrl(latinFontUrl)])
        return `<style>@font-face{font-family:'Vazirmatn Export';font-style:normal;font-weight:100 900;font-display:block;src:url(${arabic}) format('woff2-variations');unicode-range:U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0897-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC}@font-face{font-family:'Vazirmatn Export';font-style:normal;font-weight:100 900;font-display:block;src:url(${latin}) format('woff2-variations');unicode-range:U+0000-00FF,U+2000-206F,U+2100-214F}</style>`
      } catch {
        return ''
      }
    })()
  }
  return fontCssPromise
}

export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export function buildExportFileName(title, extension) {
  return `${toSafeFileName(title, 'mindmap')}-${new Date().toISOString().slice(0, 10)}.${extension}`
}

export function exportMindmapJson(tree, options = {}) {
  const payload = {
    version: 1,
    app: 'mindmap-ai',
    exportedAt: new Date().toISOString(),
    root: tree,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  })
  const fileName = buildExportFileName(options.title || tree?.label || 'mindmap', 'json')
  downloadBlob(blob, fileName)
  return fileName
}

export async function exportMindmapSvg(layout, options = {}) {
  const fontCss = options.embedFonts === false ? '' : await getLoadedFontCss()
  const svg = renderMindmapSvg(layout, { ...options, fontCss })
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const fileName = buildExportFileName(options.title || 'mindmap', 'svg')
  downloadBlob(blob, fileName)
  return fileName
}

function drawRoundedRect(context, x, y, width, height, radius) {
  if (typeof context.roundRect === 'function') {
    context.beginPath()
    context.roundRect(x, y, width, height, radius)
    return
  }
  const safeRadius = Math.min(radius, width / 2, height / 2)
  context.beginPath()
  context.moveTo(x + safeRadius, y)
  context.arcTo(x + width, y, x + width, y + height, safeRadius)
  context.arcTo(x + width, y + height, x, y + height, safeRadius)
  context.arcTo(x, y + height, x, y, safeRadius)
  context.arcTo(x, y, x + width, y, safeRadius)
  context.closePath()
}

async function drawMindmapToCanvas(layout, theme, title, subtitle, pixelRatio) {
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    await document.fonts.ready
  }
  const geometry = getExportGeometry(layout)
  const { width, height, offsetX, offsetY } = geometry
  const canvas = document.createElement('canvas')
  const ratio = Math.max(
    0.5,
    Math.min(pixelRatio, 8192 / Math.max(width, 1), 8192 / Math.max(height, 1)),
  )
  canvas.width = Math.ceil(width * ratio)
  canvas.height = Math.ceil(height * ratio)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('رسم تصویر در این مرورگر پشتیبانی نمی‌شود.')
  context.scale(ratio, ratio)
  context.fillStyle = theme.stageBg
  context.fillRect(0, 0, width, height)

  context.textBaseline = 'middle'
  context.direction = 'rtl'
  context.textAlign = 'right'
  context.fillStyle = theme.exportTitle
  context.font = `700 22px ${FONT_FAMILY}`
  context.fillText(title, width - EXPORT_PADDING, EXPORT_PADDING + 8, width - EXPORT_PADDING * 2)
  context.fillStyle = theme.exportSubtitle
  context.font = `500 11.5px ${FONT_FAMILY}`
  context.fillText(subtitle, width - EXPORT_PADDING, EXPORT_PADDING + 34, width - EXPORT_PADDING * 2)
  context.strokeStyle = theme.borderStrong
  context.globalAlpha = 0.5
  context.beginPath()
  context.moveTo(EXPORT_PADDING, HEADER_HEIGHT + 22)
  context.lineTo(width - EXPORT_PADDING, HEADER_HEIGHT + 22)
  context.stroke()
  context.globalAlpha = 1

  context.save()
  context.translate(offsetX, offsetY)
  for (const edge of layout.edges) {
    const node = layout.nodeMap.get(edge.id)
    const branchColor = getBranchColor(theme, node ? node.branchIndex : 0)
    context.strokeStyle = branchColor
    context.globalAlpha = edge.depth === 1 ? 0.62 : 0.34
    context.lineWidth = edge.depth === 1 ? 2.2 : 1.5
    context.lineCap = 'round'
    context.beginPath()
    context.moveTo(edge.startX, edge.startY)
    context.bezierCurveTo(
      edge.control1X,
      edge.control1Y,
      edge.control2X,
      edge.control2Y,
      edge.endX,
      edge.endY,
    )
    context.stroke()
  }
  context.globalAlpha = 1

  for (const node of layout.nodes) {
    const colors = getNodeColors(node, theme)
    const branchColor = getBranchColor(theme, node.branchIndex)
    const halfWidth = node.width / 2
    const halfHeight = node.height / 2
    context.save()
    context.translate(node.x, node.y)
    context.shadowColor =
      theme.mode === 'dark' ? 'rgba(0,0,0,0.55)' : 'rgba(30,42,68,0.16)'
    context.shadowBlur = node.depth === 0 ? 16 : node.depth === 1 ? 9 : 6
    context.shadowOffsetY = node.depth === 0 ? 5 : 3
    drawRoundedRect(context, -halfWidth, -halfHeight, node.width, node.height, node.radius)
    context.fillStyle = colors.fill
    context.fill()
    context.shadowColor = 'transparent'
    context.shadowBlur = 0
    context.shadowOffsetY = 0
    context.strokeStyle = colors.stroke
    context.lineWidth = 1.2
    context.stroke()

    if (node.depth > 0 && node.branchIndex >= 0) {
      const barHeight = Math.max(6, node.height - 15)
      context.fillStyle = branchColor
      context.globalAlpha = node.depth === 1 ? 0.9 : 0.42
      drawRoundedRect(
        context,
        node.side === 'left' ? halfWidth - 4.5 : -halfWidth + 1.5,
        -barHeight / 2,
        3,
        barHeight,
        1.5,
      )
      context.fill()
      context.globalAlpha = 1
    }

    const startY = -halfHeight + node.paddingY + node.lineHeight / 2
    context.fillStyle = colors.text
    context.textAlign = 'center'
    node.lines.forEach((line, index) => {
      if (!line.text) return
      context.direction = line.direction
      context.font = `${node.fontWeight} ${node.fontSize}px ${FONT_FAMILY}`
      context.fillText(line.text, 0, startY + index * node.lineHeight)
    })

    if (node.hasNote) {
      context.fillStyle = theme.noteColor
      context.beginPath()
      context.arc(
        node.side === 'left' ? -halfWidth + 9 : halfWidth - 9,
        -halfHeight + 9,
        3,
        0,
        Math.PI * 2,
      )
      context.fill()
    }

    if (node.collapsed && node.hiddenCount > 0) {
      const badgeX = node.side === 'right' ? halfWidth : -halfWidth
      context.beginPath()
      context.arc(badgeX, 0, 10, 0, Math.PI * 2)
      context.fillStyle = theme.badgeFill
      context.fill()
      context.strokeStyle = theme.badgeStroke
      context.lineWidth = 1
      context.stroke()
      context.fillStyle = theme.badgeText
      context.direction = 'rtl'
      context.textAlign = 'center'
      context.font = `600 9.5px ${FONT_FAMILY}`
      context.fillText(toPersianDigits(node.hiddenCount), badgeX, 0.5)
    }
    context.restore()
  }
  context.restore()
  return { canvas, width, height }
}

export async function exportMindmapPng(layout, options = {}) {
  const { canvas } = await drawMindmapToCanvas(
    layout,
    options.theme,
    options.title || 'مایندمپ',
    options.subtitle || `ذهن‌نگار • ${formatDate()}`,
    options.pixelRatio || 2,
  )
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result)
      else reject(new Error('ساخت تصویر PNG ناموفق بود.'))
    }, 'image/png')
  })
  const fileName = buildExportFileName(options.title || 'mindmap', 'png')
  downloadBlob(blob, fileName)
  return fileName
}

export async function printMindmap(layout, options = {}) {
  const fontCss = await getLoadedFontCss()
  const svg = renderMindmapSvg(layout, { ...options, fontCss })
  const printWindow = window.open('', '_blank', 'width=1100,height=800')
  if (!printWindow) {
    throw new Error('پنجره چاپ توسط مرورگر مسدود شد. اجازهٔ بازشدن پنجره را فعال کنید.')
  }
  printWindow.document.open()
  printWindow.document.write(`<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8" />
<title>${escapeXml(options.title || 'چاپ مایندمپ')}</title>
<style>
  @page { margin: 10mm; }
  html, body { margin: 0; padding: 0; background: #ffffff; }
  body { display: flex; align-items: center; justify-content: center; min-height: 100vh; }
  svg { max-width: 100%; height: auto; }
  @media print { body { display: block; } svg { width: 100%; height: auto; } }
</style>
</head>
<body>${svg}</body>
</html>`)
  printWindow.document.close()
  printWindow.focus()
  await new Promise((resolve) => setTimeout(resolve, 450))
  printWindow.print()
}
