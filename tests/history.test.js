import { describe, expect, it } from 'vitest'
import { createHistoryStore } from '../src/core/history.js'

function snapshot(label) {
  return { id: 'root', label, note: '', collapsed: false, children: [] }
}

describe('تاریخچه بازگشت و تکرار', () => {
  it('وضعیت قبلی را ثبت و بازمی‌گرداند', () => {
    const history = createHistoryStore()
    const first = snapshot('اول')
    const second = snapshot('دوم')

    expect(history.canUndo).toBe(false)
    expect(history.record(first, 'ویرایش')).toBe(true)
    expect(history.canUndo).toBe(true)
    expect(history.undoLabel).toBe('ویرایش')

    const entry = history.undo(second)
    expect(entry.tree).toBe(first)
    expect(history.canUndo).toBe(false)
    expect(history.canRedo).toBe(true)
    expect(history.redoLabel).toBe('ویرایش')
  })

  it('تکرار، وضعیت فعلی را دوباره به پشته بازگشت می‌دهد', () => {
    const history = createHistoryStore()
    const first = snapshot('اول')
    const second = snapshot('دوم')

    history.record(first, 'تغییر')
    history.undo(second)
    const entry = history.redo(first)

    expect(entry.tree).toBe(second)
    expect(history.canUndo).toBe(true)
    expect(history.canRedo).toBe(false)
  })

  it('ثبت جدید، پشته تکرار را خالی می‌کند', () => {
    const history = createHistoryStore()
    const first = snapshot('اول')
    const second = snapshot('دوم')
    const third = snapshot('سوم')

    history.record(first, 'اول')
    history.undo(second)
    expect(history.canRedo).toBe(true)
    history.record(second, 'دوم')
    expect(history.canRedo).toBe(false)
    expect(history.undoLabel).toBe('دوم')
    expect(history.redo(third)).toBeNull()
  })

  it('حداکثر تعداد ورودی را رعایت می‌کند', () => {
    const history = createHistoryStore({ limit: 3 })
    for (let index = 0; index < 5; index += 1) {
      history.record(snapshot(`نسخه ${index}`), `تغییر ${index}`)
    }

    const labels = []
    let current = snapshot('فعلی')
    let entry = history.undo(current)
    while (entry) {
      labels.push(entry.label)
      current = entry.tree
      entry = history.undo(current)
    }
    expect(labels).toEqual(['تغییر 4', 'تغییر 3', 'تغییر 2'])
  })

  it('پشته خالی را امن مدیریت می‌کند', () => {
    const history = createHistoryStore()
    expect(history.undo(snapshot('x'))).toBeNull()
    expect(history.redo(snapshot('x'))).toBeNull()
    expect(history.undoLabel).toBe('')
    expect(history.redoLabel).toBe('')
  })

  it('با clear همه چیز را پاک می‌کند', () => {
    const history = createHistoryStore()
    history.record(snapshot('اول'), 'تغییر')
    history.undo(snapshot('دوم'))
    history.clear()
    expect(history.canUndo).toBe(false)
    expect(history.canRedo).toBe(false)
  })
})
