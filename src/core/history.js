/**
 * تاریخچه ساده و قابل تست برای Undo/Redo.
 * هر ورودی یک اسنپ‌شات کامل از درخت و برچسب عملیات است.
 */
export function createHistoryStore(options = {}) {
  const limit = Number.isInteger(options.limit) ? options.limit : 60
  const undoStack = []
  const redoStack = []

  return {
    /** ثبت وضعیت قبلی؛ پیش از تغییر درخت صدا زده می‌شود */
    record(previousTree, label = 'تغییر') {
      if (!previousTree) return false
      undoStack.push({ tree: previousTree, label })
      if (undoStack.length > limit) undoStack.shift()
      redoStack.length = 0
      return true
    },

    undo(currentTree) {
      const entry = undoStack.pop()
      if (!entry) return null
      if (currentTree) redoStack.push({ tree: currentTree, label: entry.label })
      return entry
    },

    redo(currentTree) {
      const entry = redoStack.pop()
      if (!entry) return null
      if (currentTree) undoStack.push({ tree: currentTree, label: entry.label })
      return entry
    },

    get canUndo() {
      return undoStack.length > 0
    },

    get canRedo() {
      return redoStack.length > 0
    },

    get undoLabel() {
      return undoStack.length ? undoStack[undoStack.length - 1].label : ''
    },

    get redoLabel() {
      return redoStack.length ? redoStack[redoStack.length - 1].label : ''
    },

    clear() {
      undoStack.length = 0
      redoStack.length = 0
    },
  }
}
