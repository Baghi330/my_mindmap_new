/**
 * ابزارهای متنی: تشخیص جهت، نرمال‌سازی فارسی برای جست‌وجو و برش متن.
 * این توابع خالص‌اند و در تست هم قابل استفاده‌اند.
 */

const RTL_CHARACTER_PATTERN = /[\u0590-\u08FF\uFB1D-\uFDFD\uFE70-\uFEFC]/
const LTR_CHARACTER_PATTERN = /[A-Za-z\u00C0-\u024F\u0370-\u058F]/

/** جهت اولین کاراکتر قوی متن را برمی‌گرداند. پیش‌فرض فارسی (rtl) است. */
export function detectTextDirection(text) {
  if (!text) return 'rtl'
  for (const character of text) {
    if (RTL_CHARACTER_PATTERN.test(character)) return 'rtl'
    if (LTR_CHARACTER_PATTERN.test(character)) return 'ltr'
  }
  return 'rtl'
}

/** نرمال‌سازی حروف عربی/فارسی و حذف اعراب برای جست‌وجوی منصفانه */
export function normalizePersianText(text) {
  if (!text) return ''
  return String(text)
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ی')
    .replace(/ة/g, 'ه')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/\u200C/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('fa')
}

/** تعداد کاراکترهای واقعی (بدون شکستن کاراکترهای ترکیبی) */
export function countCharacters(text) {
  return Array.from(String(text ?? '')).length
}

/** یک برچسب ایمن برای نام فایل می‌سازد */
export function toSafeFileName(text, fallback = 'mindmap') {
  const cleaned = String(text ?? '')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 80)
  return cleaned || fallback
}

/** تاریخ محلی به قالب فشرده برای نام فایل */
export function fileTimestamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`
}

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']

/** تبدیل ارقام لاتین به فارسی برای نمایش در رابط */
export function toPersianDigits(value) {
  return String(value ?? '').replace(/\d/g, (digit) => PERSIAN_DIGITS[Number(digit)])
}
