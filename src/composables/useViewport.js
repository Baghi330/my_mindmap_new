/**
 * کنترل بزرگ‌نمایی، جابه‌جایی و قاب‌بندی بوم.
 * مختصات دنیای گراف با مرکز گره ریشه در (0,0) تعریف می‌شود؛
 * تبدیل به مختصات صفحه فقط در همین لایه انجام می‌شود تا منطق چیدمان
 * هیچ وابستگی‌ای به بزرگ‌نمایی و اندازه صفحه نداشته باشد.
 */
import { computed, reactive, ref } from 'vue'

export const MIN_SCALE = 0.16
export const MAX_SCALE = 2.4

function clampScale(value) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value))
}

function easeOutCubic(value) {
  return 1 - Math.pow(1 - value, 3)
}

export function createViewport() {
  const scale = ref(1)
  const translateX = ref(0)
  const translateY = ref(0)
  const width = ref(0)
  const height = ref(0)
  const bounds = reactive({ minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 })
  let animationFrame = 0

  const transformStyle = computed(
    () => `translate(${translateX.value}px, ${translateY.value}px) scale(${scale.value})`,
  )

  const cancelAnimation = () => {
    if (animationFrame) cancelAnimationFrame(animationFrame)
    animationFrame = 0
  }

  const setViewportSize = (nextWidth, nextHeight) => {
    width.value = Math.max(0, nextWidth)
    height.value = Math.max(0, nextHeight)
  }

  const setBounds = (nextBounds) => {
    if (!nextBounds) return
    bounds.minX = nextBounds.minX
    bounds.minY = nextBounds.minY
    bounds.maxX = nextBounds.maxX
    bounds.maxY = nextBounds.maxY
    bounds.width = nextBounds.width
    bounds.height = nextBounds.height
  }

  const clampTranslation = () => {
    if (width.value === 0 || height.value === 0) return
    const marginX = Math.min(width.value * 0.5, 360)
    const marginY = Math.min(height.value * 0.5, 300)
    const minScreenX = -marginX - (bounds.maxX * scale.value)
    const maxScreenX = width.value + marginX - (bounds.minX * scale.value)
    const minScreenY = -marginY - (bounds.maxY * scale.value)
    const maxScreenY = height.value + marginY - (bounds.minY * scale.value)
    translateX.value = Math.min(maxScreenX, Math.max(minScreenX, translateX.value))
    translateY.value = Math.min(maxScreenY, Math.max(minScreenY, translateY.value))
  }

  const applyCenter = (worldX, worldY, nextScale) => {
    scale.value = clampScale(nextScale)
    translateX.value = width.value / 2 - worldX * scale.value
    translateY.value = height.value / 2 - worldY * scale.value
    clampTranslation()
  }

  const animateTo = (targetX, targetY, targetScale, options = {}) => {
    cancelAnimation()
    const startX = translateX.value
    const startY = translateY.value
    const startScale = scale.value
    const endScale = clampScale(targetScale)
    const duration = options.duration ?? 420
    const useAnimation =
      !options.instant &&
      typeof window !== 'undefined' &&
      !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (!useAnimation || duration <= 0) {
      translateX.value = targetX
      translateY.value = targetY
      scale.value = endScale
      clampTranslation()
      return
    }
    const startTime = performance.now()
    const step = (now) => {
      const progress = Math.min(1, (now - startTime) / duration)
      const eased = easeOutCubic(progress)
      translateX.value = startX + (targetX - startX) * eased
      translateY.value = startY + (targetY - startY) * eased
      scale.value = startScale + (endScale - startScale) * eased
      if (progress < 1) {
        animationFrame = requestAnimationFrame(step)
      } else {
        animationFrame = 0
        clampTranslation()
      }
    }
    animationFrame = requestAnimationFrame(step)
  }

  const fitView = (options = {}) => {
    if (width.value === 0 || height.value === 0) return
    const padding = options.padding ?? 96
    const availableWidth = Math.max(80, width.value - padding * 2)
    const availableHeight = Math.max(80, height.value - padding * 2)
    const boundsWidth = Math.max(bounds.width, 1)
    const boundsHeight = Math.max(bounds.height, 1)
    const targetScale = clampScale(
      Math.min(availableWidth / boundsWidth, availableHeight / boundsHeight, 1.35),
    )
    const centerX = bounds.minX + bounds.width / 2
    const centerY = bounds.minY + bounds.height / 2
    const targetX = width.value / 2 - centerX * targetScale
    const targetY = height.value / 2 - centerY * targetScale
    animateTo(targetX, targetY, targetScale, options)
  }

  const zoomBy = (factor, options = {}) => {
    const anchorX = options.screenX ?? width.value / 2
    const anchorY = options.screenY ?? height.value / 2
    const worldX = (anchorX - translateX.value) / scale.value
    const worldY = (anchorY - translateY.value) / scale.value
    const nextScale = clampScale(scale.value * factor)
    const nextX = anchorX - worldX * nextScale
    const nextY = anchorY - worldY * nextScale
    animateTo(nextX, nextY, nextScale, {
      duration: options.duration ?? 160,
      instant: options.instant === true,
    })
  }

  const zoomIn = () => zoomBy(1.22)
  const zoomOut = () => zoomBy(1 / 1.22)

  const resetView = () => {
    fitView({ padding: 110 })
  }

  const centerOnNode = (node, options = {}) => {
    if (!node) return
    const targetScale = options.scale ?? Math.max(scale.value, 0.85)
    const targetX = width.value / 2 - node.x * targetScale
    const targetY = height.value / 2 - node.y * targetScale
    animateTo(targetX, targetY, targetScale, options)
  }

  const panBy = (deltaX, deltaY) => {
    cancelAnimation()
    translateX.value += deltaX
    translateY.value += deltaY
    clampTranslation()
  }

  const screenToWorld = (screenX, screenY) => ({
    x: (screenX - translateX.value) / scale.value,
    y: (screenY - translateY.value) / scale.value,
  })

  return {
    scale,
    translateX,
    translateY,
    width,
    height,
    bounds,
    transformStyle,
    setViewportSize,
    setBounds,
    fitView,
    zoomBy,
    zoomIn,
    zoomOut,
    resetView,
    centerOnNode,
    panBy,
    screenToWorld,
    cancelAnimation,
  }
}

let sharedViewport = null
export function useViewport() {
  if (!sharedViewport) sharedViewport = createViewport()
  return sharedViewport
}
