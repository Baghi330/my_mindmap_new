import { describe, expect, it } from 'vitest'
import {
  countCharacters,
  detectTextDirection,
  fileTimestamp,
  normalizePersianText,
  toPersianDigits,
  toSafeFileName,
} from '../src/utils/text.js'
import { createNodeMeasurer, getNodeTypography, wrapLabel } from '../src/core/measure.js'
import { measureTextForTests } from './helpers.js'

function testMeasure(text) {
  return measureTextForTests(text, '500 16px test')
}

describe('ابزارهای متنی', () => {
  it('جهت متن فارسی، انگلیسی و ترکیبی را تشخیص می‌دهد', () => {
    expect(detectTextDirection('هوش مصنوعی')).toBe('rtl')
    expect(detectTextDirection('AI Research')).toBe('ltr')
    expect(detectTextDirection('AI برای پژوهش')).toBe('ltr')
    expect(detectTextDirection('۱۲۳')).toBe('rtl')
    expect(detectTextDirection('')).toBe('rtl')
  })

  it('حروف عربی، اعراب و نیم‌فاصله را برای جست‌وجو نرمال می‌کند', () => {
    expect(normalizePersianText('كتاب‌هاي علمي')).toBe('کتاب های علمی')
    expect(normalizePersianText('  مُحَمَّد  ')).toBe('محمد')
    expect(normalizePersianText('')).toBe('')
  })

  it('ارقام را برای رابط فارسی می‌کند', () => {
    expect(toPersianDigits(0)).toBe('۰')
    expect(toPersianDigits('2026/10/24')).toBe('۲۰۲۶/۱۰/۲۴')
  })

  it('طول واقعی کاراکترهای ترکیبی را می‌شمارد', () => {
    expect(countCharacters('👍a')).toBe(2)
    expect(countCharacters('')).toBe(0)
  })

  it('نام فایل امن و فشرده می‌سازد', () => {
    expect(toSafeFileName('a/b:c * "d"', 'fallback')).toBe('a-b-c-d')
    expect(toSafeFileName('   ', 'fallback')).toBe('fallback')
    expect(toSafeFileName('نام فارسی')).toBe('نام-فارسی')
  })

  it('زمان فایل را با قالب ثابت می‌سازد', () => {
    expect(fileTimestamp(new Date(2026, 9, 24, 8, 5))).toBe('2026-10-24-0805')
  })
})

describe('شکستن متن', () => {
  it('خطوط دستی را حفظ می‌کند', () => {
    const lines = wrapLabel('خط اول\nخط دوم', 400, testMeasure)
    expect(lines).toEqual(['خط اول', 'خط دوم'])
  })

  it('عرض هیچ خطی از حد مجاز بیشتر نمی‌شود', () => {
    const text = 'یک دو سه چهار پنج شش هفت هشت نه ده یازده دوازده'
    const lines = wrapLabel(text, 90, testMeasure)
    expect(lines.length).toBeGreaterThan(1)
    for (const line of lines) {
      expect(testMeasure(line)).toBeLessThanOrEqual(90.0001)
    }
  })

  it('کلمه بسیار طولانی را می‌شکند', () => {
    const lines = wrapLabel('Loremipsumdolorsitamet', 60, testMeasure)
    expect(lines.length).toBeGreaterThan(1)
    for (const line of lines) {
      expect(testMeasure(line)).toBeLessThanOrEqual(60.0001)
    }
  })

  it('حداکثر تعداد خطوط را رعایت می‌کند', () => {
    const text = 'یک دو سه چهار پنج شش هفت هشت نه ده یازده دوازده'
    const lines = wrapLabel(text, 50, testMeasure, 2)
    expect(lines).toHaveLength(2)
    expect(lines[1].endsWith('…')).toBe(true)
  })

  it('برای متن خالی یک خط خالی برمی‌گرداند', () => {
    expect(wrapLabel('', 200, testMeasure)).toEqual([''])
  })
})

describe('اندازه‌گیری گره', () => {
  it('ابعاد متناسب و جهت درست برای هر عمق می‌سازد', () => {
    const measureNode = createNodeMeasurer({
      measureText: (text, font) => measureTextForTests(text, font),
      fontScale: 1,
    })
    const shortNode = measureNode({ label: 'کوتاه', note: '' }, 2)
    const longNode = measureNode({ label: 'یک عنوان بسیار طولانی‌تر برای شاخه اصلی', note: '' }, 0)

    expect(shortNode.width).toBeGreaterThanOrEqual(getNodeTypography(2).minWidth)
    expect(longNode.width).toBeLessThanOrEqual(getNodeTypography(0).maxWidth)
    expect(shortNode.lines[0].direction).toBe('rtl')
    expect(longNode.fontSize).toBeGreaterThan(shortNode.fontSize)
  })

  it('اندازه فونت را با مقیاس متن تغییر می‌دهد', () => {
    const measureNode = createNodeMeasurer({
      measureText: (text, font) => measureTextForTests(text, font),
      fontScale: 1.2,
    })
    const size = measureNode({ label: 'متن', note: '' }, 1)
    expect(size.fontSize).toBeCloseTo(15 * 1.2)
    expect(size.lineHeight).toBeCloseTo(24 * 1.2)
  })

  it('وجود یادداشت را در خروجی اندازه‌گیری نگه می‌دارد', () => {
    const measureNode = createNodeMeasurer({
      measureText: (text, font) => measureTextForTests(text, font),
    })
    expect(measureNode({ label: 'گره', note: 'یادداشت' }, 1).hasNote).toBe(true)
    expect(measureNode({ label: 'گره', note: '' }, 1).hasNote).toBe(false)
  })
})
