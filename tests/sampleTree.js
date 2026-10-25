/**
 * نمونه داده آزمایشی برای حالت «دریافت کامل» و «دریافت تدریجی».
 * ساختار دقیقاً همان قرارداد درخت مایندمپ است:
 * { id, label, note, collapsed, children }
 */
export const sampleMindmap = {
  id: 'root',
  label: 'آیندهٔ پژوهش با هوش مصنوعی',
  note: 'نقشهٔ موضوعی برای بررسی تأثیر هوش مصنوعی بر روش، ابزار و اخلاق پژوهش علمی.',
  collapsed: false,
  children: [
    {
      id: 'methods',
      label: 'روش‌های نوین پژوهش',
      note: 'از تحلیل داده‌های بزرگ تا بازبینی سیستماتیک خودکار.',
      collapsed: false,
      children: [
        {
          id: 'methods-data',
          label: 'تحلیل داده‌های حجیم',
          children: [],
        },
        {
          id: 'methods-model',
          label: 'مدل‌سازی پیش‌بینانه',
          children: [],
        },
        {
          id: 'methods-search',
          label: 'بازیابی معنایی منابع',
          children: [
            { id: 'methods-vector', label: 'جست‌وجوی برداری', children: [] },
            { id: 'methods-summary', label: 'خلاصه‌سازی چندسندی', children: [] },
          ],
        },
        {
          id: 'methods-review',
          label: 'اعتبارسنجی متقابل (Cross-Validation)',
          children: [],
        },
      ],
    },
    {
      id: 'tools',
      label: 'ابزارهای هوش مصنوعی',
      note: 'ابزارهایی که چرخهٔ پژوهش را سریع‌تر و شفاف‌تر می‌کنند.',
      collapsed: false,
      children: [
        { id: 'tools-writing', label: 'دستیار نگارش علمی', children: [] },
        { id: 'tools-lit', label: 'کاوشگر ادبیات پژوهشی', children: [] },
        { id: 'tools-sim', label: 'آزمایشگاه شبیه‌سازی', children: [] },
        { id: 'tools-cite', label: 'سامانهٔ ارجاع‌دهی هوشمند', children: [] },
      ],
    },
    {
      id: 'ethics',
      label: 'اخلاق و مسئولیت‌پذیری',
      children: [
        { id: 'ethics-transparency', label: 'شفافیت الگوریتمی', children: [] },
        {
          id: 'ethics-bias',
          label: 'سوگیری در داده‌ها',
          note: 'بازبینی مستمر مجموعه‌داده‌ها و مستندسازی محدودیت‌ها ضروری است.',
          children: [],
        },
        { id: 'ethics-ip', label: 'مالکیت معنوی', children: [] },
        { id: 'ethics-human', label: 'بازبینی انسانی', children: [] },
      ],
    },
    {
      id: 'education',
      label: 'آموزش و مهارت‌آموزی',
      children: [
        { id: 'education-data', label: 'سواد داده', children: [] },
        { id: 'education-critical', label: 'تفکر انتقادی', children: [] },
        { id: 'education-curriculum', label: 'طراحی برنامهٔ درسی', children: [] },
        { id: 'education-workshop', label: 'کارگاه‌های عملی', children: [] },
      ],
    },
    {
      id: 'publishing',
      label: 'نشر و ارزیابی علمی',
      children: [
        {
          id: 'publishing-peer',
          label: 'داوری همتا با کمک هوش مصنوعی',
          children: [],
        },
        { id: 'publishing-valid', label: 'اعتبارسنجی نتایج', children: [] },
        { id: 'publishing-open', label: 'دسترسی آزاد', children: [] },
      ],
    },
    {
      id: 'collaboration',
      label: 'همکاری بین‌رشته‌ای',
      children: [
        {
          id: 'collaboration-social',
          label: 'علوم اجتماعی محاسباتی',
          children: [],
        },
        { id: 'collaboration-bio', label: 'زیست‌شناسی داده‌بنیاد', children: [] },
        { id: 'collaboration-econ', label: 'اقتصاد الگوریتمی', children: [] },
      ],
    },
    {
      id: 'challenges',
      label: 'چالش‌ها و محدودیت‌ها',
      children: [
        {
          id: 'challenges-hallucination',
          label: 'توهم‌زایی مدل‌های زبانی (LLM)',
          note: 'پاسخ‌ها باید با منابع اولیه و داده‌های تجربی راستی‌آزمایی شوند.',
          children: [],
        },
        { id: 'challenges-repro', label: 'تکرارپذیری پژوهش', children: [] },
        { id: 'challenges-cost', label: 'هزینهٔ محاسباتی', children: [] },
      ],
    },
  ],
}

export const blankMindmap = {
  id: 'root',
  label: 'موضوع پژوهش',
  note: '',
  collapsed: false,
  children: [],
}
