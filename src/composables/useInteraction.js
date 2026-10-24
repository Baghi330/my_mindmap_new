/**
 * وضعیت‌های تعاملی مشترک: منوی زمینه و کشیدن گره.
 * جدا نگه‌داشتن این وضعیت از فروشگاه داده باعث می‌شود تاریخچه و ذخیره‌سازی
 * تحت تأثیر تعامل‌های صرفاً بصری قرار نگیرند.
 */
import { reactive, ref } from "vue";

const contextMenu = ref(null);
const dragState = reactive({
  draggingId: null,
  targetId: null,
  isOverNode: false,
  mouseX: 0,
  mouseY: 0,
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
  function beginDrag(nodeId) {
    dragState.draggingId = nodeId;
    dragState.targetId = null;
    dragState.isOverNode = false;
  }

  function setDragTarget(targetId) {
    dragState.targetId = targetId;
    dragState.isOverNode = Boolean(targetId);
  }

  function setMousePosition(x, y) {
    dragState.mouseX = x;
    dragState.mouseY = y;
  }

  function resetDrag() {
    dragState.draggingId = null;
    dragState.targetId = null;
    dragState.isOverNode = false;
  }

  return { dragState, beginDrag, setDragTarget, setMousePosition, resetDrag };
}
