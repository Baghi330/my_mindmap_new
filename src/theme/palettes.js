/**
 * پالت رنگ متمرکز برای رابط و خروجی SVG/PNG.
 * فقط یک رنگ تأکیدی اصلی به‌همراه رنگ‌های محدود شاخه‌ها استفاده می‌شود.
 */

const LIGHT = {
  mode: 'light',
  appBg: '#f3f5fa',
  stageBg: '#f8faff',
  gridDot: 'rgba(42, 58, 90, 0.14)',
  panelBg: 'rgba(255, 255, 255, 0.92)',
  surface: '#ffffff',
  surfaceMuted: '#f1f4fa',
  surfaceHover: '#f6f8fd',
  border: 'rgba(35, 51, 79, 0.11)',
  borderStrong: '#d5ddeb',
  text: '#1e2739',
  textMuted: '#5e6b81',
  textFaint: '#94a0b3',
  accent: '#4a5ecb',
  accentHover: '#3c4fb6',
  accentSoft: '#edf0ff',
  accentText: '#ffffff',
  danger: '#b93b3b',
  dangerSoft: '#fdeeee',
  warning: '#a86a12',
  warningSoft: '#fff5df',
  success: '#1b7a5d',
  successSoft: '#e8f7f1',
  shadow: 'rgba(30, 42, 68, 0.13)',
  selectionRing: '#4a5ecb',
  searchRing: '#c98a16',
  searchFill: '#fff7e2',
  rootFill: '#2b3552',
  rootStroke: '#2b3552',
  rootText: '#f8faff',
  nodeFill: '#ffffff',
  nodeFillSubtle: '#fcfdff',
  nodeStroke: '#dfe5f0',
  nodeStrokeStrong: '#d3dcee',
  nodeText: '#263149',
  nodeTextMuted: '#445168',
  noteColor: '#b7791f',
  badgeFill: '#ffffff',
  badgeStroke: '#ccd6e6',
  badgeText: '#4a566d',
  edge: '#c7cfdd',
  edgeMuted: '#d8dfeb',
  exportTitle: '#1e2739',
  exportSubtitle: '#7a8699',
  branchColors: ['#4c5fd5', '#0e8a7d', '#b7791f', '#b1476d', '#7350c9', '#2f74b5', '#5b6b7f'],
}

const DARK = {
  mode: 'dark',
  appBg: '#0b0f16',
  stageBg: '#0e131c',
  gridDot: 'rgba(176, 194, 224, 0.15)',
  panelBg: 'rgba(18, 24, 35, 0.92)',
  surface: '#141b27',
  surfaceMuted: '#182130',
  surfaceHover: '#1b2434',
  border: 'rgba(188, 204, 230, 0.12)',
  borderStrong: '#2b3749',
  text: '#e8edf7',
  textMuted: '#9aa7bc',
  textFaint: '#65738a',
  accent: '#8592ff',
  accentHover: '#9ba6ff',
  accentSoft: 'rgba(133, 146, 255, 0.14)',
  accentText: '#0d1220',
  danger: '#f08a8a',
  dangerSoft: 'rgba(240, 138, 138, 0.12)',
  warning: '#e3b25c',
  warningSoft: 'rgba(227, 178, 92, 0.12)',
  success: '#5fd3b0',
  successSoft: 'rgba(95, 211, 176, 0.12)',
  shadow: 'rgba(0, 0, 0, 0.42)',
  selectionRing: '#8592ff',
  searchRing: '#e3b25c',
  searchFill: 'rgba(227, 178, 92, 0.12)',
  rootFill: '#5c6ee6',
  rootStroke: '#7180f2',
  rootText: '#ffffff',
  nodeFill: '#151d2a',
  nodeFillSubtle: '#121925',
  nodeStroke: '#2b3546',
  nodeStrokeStrong: '#354156',
  nodeText: '#e6ecf7',
  nodeTextMuted: '#b3bfd3',
  noteColor: '#e3b25c',
  badgeFill: '#182130',
  badgeStroke: '#39465b',
  badgeText: '#bdc9db',
  edge: '#3b485d',
  edgeMuted: '#303c4f',
  exportTitle: '#e8edf7',
  exportSubtitle: '#8b98ac',
  branchColors: ['#8d9bff', '#4cc9b9', '#e0b155', '#ea8fb2', '#b59aff', '#7ab6e8', '#9aa9c0'],
}

const themeCache = new Map()

export function getTheme(mode) {
  const resolved = mode === 'dark' ? 'dark' : 'light'
  if (!themeCache.has(resolved)) {
    const source = resolved === 'dark' ? DARK : LIGHT
    themeCache.set(resolved, {
      ...source,
      branchColors: [...source.branchColors],
    })
  }
  return themeCache.get(resolved)
}

export function getBranchColor(theme, branchIndex) {
  const colors = theme.branchColors
  if (!colors.length) return theme.accent
  const safeIndex = Number.isInteger(branchIndex) && branchIndex >= 0 ? branchIndex : 0
  return colors[safeIndex % colors.length]
}

function toKebabCase(value) {
  return value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
}

/** متغیرهای CSS رابط از همان پالت ساخته می‌شوند */
export function themeToCssVariables(theme) {
  const variables = {}
  for (const [key, value] of Object.entries(theme)) {
    if (Array.isArray(value) || key === 'mode') continue
    variables[`--${toKebabCase(key)}`] = value
  }
  theme.branchColors.forEach((color, index) => {
    variables[`--branch-${index + 1}`] = color
  })
  return variables
}
