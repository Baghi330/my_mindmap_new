/**
 * وضعیت‌های تعاملی مشترک: منوی زمینه و کشیدن گره.
 * جدا نگه‌داشتن این وضعیت از فروشگاه داده باعث می‌شود تاریخچه و ذخیره‌سازی
 * تحت تأثیر تعامل‌های صرفاً بصری قرار نگیرند.
 */
import { reactive, ref } from "vue";
import { DROP_NONE } from "../core/dragTarget.js";

const contextMenu = ref(null);

/** پیش‌نمایش مقصد، فقط در حافظه و بدون ورود به داده یا تاریخچه */
function emptyPreview() {
  return {
    kind: DROP_NONE,
    targetId: null,
    parentId: null,
    index: -1,
    side: null,
    valid: false,
    anchorY: 0,
    anchorId: null,
  };
}

const dragState = reactive({
  draggingId: null,
  targetId: null,
  isOverNode: false,
  mouseX: 0,
  mouseY: 0,
  /** مختصات دنیایی نشانگر، برای رسم شبح و پیش‌نمایش */
  worldX: 0,
  worldY: 0,
  /** فاصله افقی/عمودی نشانگر از نقطه گرفتن گره */
  grabOffsetX: 0,
  grabOffsetY: 0,
  preview: emptyPreview(),
});

export function useContextMenu() {
  function openContextMenu(nodeId, x, y) {
    contextMenu.value = { nodeId, x, y };
  }

  function closeContextMenu() {
    contextMenu.value = null;
  }

  return { contextMenu, openContextMenu, closeContextMenu };
}

export function useNodeDragState() {
  function beginDrag(nodeId, options = {}) {
    dragState.draggingId = nodeId;
    dragState.targetId = null;
    dragState.isOverNode = false;
    dragState.preview = emptyPreview();
    dragState.grabOffsetX = options.grabOffsetX || 0;
    dragState.grabOffsetY = options.grabOffsetY || 0;
  }

  /** اطلاعات پیش‌نمایش را به‌روز می‌کند؛ فقط وقتی مقصد واقعاً عوض شده باشد */
  function setDragPreview(preview) {
    dragState.preview = preview || emptyPreview();
    dragState.targetId = dragState.preview.targetId;
    dragState.isOverNode = Boolean(dragState.preview.targetId);
  }

  function setDragTarget(targetId) {
    dragState.targetId = targetId;
    dragState.isOverNode = Boolean(targetId);
  }

  function setMousePosition(x, y, world) {
    dragState.mouseX = x;
    dragState.mouseY = y;
    if (world) {
      dragState.worldX = world.x;
      dragState.worldY = world.y;
    }
  }

  function resetDrag() {
    dragState.draggingId = null;
    dragState.targetId = null;
    dragState.isOverNode = false;
    dragState.preview = emptyPreview();
    dragState.grabOffsetX = 0;
    dragState.grabOffsetY = 0;
  }

  return {
    dragState,
    beginDrag,
    setDragTarget,
    setDragPreview,
    setMousePosition,
    resetDrag,
  };
}
