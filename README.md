# mindmap-ai

مایندمپ تعاملی با نمایش تدریجی رشد درخت — قابل نصب در هر پروژه Vue 3.

## نصب

```bash
npm install mindmap-ai
```

## استفاده پایه: فقط JSON بده، تدریجی ببین

```vue
<script setup>
import { MindmapViewer } from "mindmap-ai";
import "mindmap-ai/style.css";

const data = {
  id: "root",
  label: "نقشه راه محصول",
  children: [
    {
      id: "phase-1",
      label: "فاز یک",
      children: [{ id: "research", label: "تحقیق کاربر", children: [] }],
    },
    { id: "phase-2", label: "فاز دو", children: [] },
  ],
};
</script>

<template>
  <div style="height: 600px">
    <MindmapViewer :data="data" />
  </div>
</template>
```

ویور ابتدا **ریشه** را نشان می‌دهد، سپس شاخه‌ها را دسته‌به‌دسته اضافه می‌کند
(انیمیشن رشد: خط اتصال اول، بعد خود گره).

## استفاده به‌عنوان اپ کامل (`MindmapApp`)

```vue
<script setup>
import { MindmapApp } from "mindmap-ai";
import "mindmap-ai/style.css";

const data = await fetch("/api/mindmap").then((r) => r.json());
</script>

<template>
  <!-- هر وقت data رسید، خودکار و تدریجی از ریشه نمایش داده می‌شود -->
  <MindmapApp :data="data" readonly />
</template>
```

- بدون `data` نقشه خالی است (فقط گره مرکزی)؛ هیچ دادهٔ نمونه‌ای نمایش داده نمی‌شود.
- دکمهٔ «پخش دوباره» در هدر، همان دادهٔ پراپ را از ریشه دوباره استریمی می‌کند.
- `readonly` ویرایش، درگ، منوی راست‌کلیک و پنل تنظیمات را غیرفعال می‌کند.

## پراپ‌ها

| پراپ           | نوع                             | پیش‌فرض         | توضیح                                                                                                      |
| -------------- | ------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------- |
| `data`         | `Object`                        | `null`          | درخت `{ id, label, note?, collapsed?, children }` یا پوشش `{ root }`. با هر تغییر (deep) دوباره لود می‌شود |
| `gradual`      | `Boolean`                       | `true`          | نمایش تدریجی. با `false` کل درخت یک‌باره می‌آید                                                            |
| `mode`         | `'incremental' \| 'full'`       | `'incremental'` | حالت استریم تدریجی                                                                                         |
| `delay`        | `Number \| null`                | `null`          | تأخیر پایه هر بسته (میلی‌ثانیه). مثلاً `:delay="0"` برای نمایش فوری                                        |
| `theme`        | `'light' \| 'dark' \| 'system'` | `'system'`      | تم                                                                                                         |
| `direction`    | `'balanced' \| 'rtl' \| 'ltr'`  | `'balanced'`    | جهت چیدمان                                                                                                 |
| `readonly`     | `Boolean`                       | `false`         | فقط نمایش؛ ویرایش، درگ و منوی راست‌کلیک غیرفعال                                                            |
| `persist`      | `Boolean`                       | `false`         | ذخیره در localStorage. پیش‌فرض خاموش تا روی هاست اثر نگذارد                                                |
| `showProgress` | `Boolean`                       | `true`          | نوار پیشرفت رشد                                                                                            |
| `showToasts`   | `Boolean`                       | `true`          | پیام‌های بازخورد                                                                                           |

## ایونت‌ها و متدها

```vue
<MindmapViewer
  ref="viewer"
  :data="data"
  @loaded="(r) => console.log('nodeCount:', r.nodeCount)"
  @error="(e) => console.error(e.errors)"
  @progress="({ received, status }) => console.log(received, status)"
/>
```

```js
// لود دستی (مثلاً بعد از fetch از API):
await viewer.value.loadData(jsonFromApi, { gradual: true });
// توقف نمایش تدریجی:
viewer.value.stop();
```

## درگ و دراپ

- گره را بگیرید و بکشید؛ یک **شبح** در جایگاه نهایی نشان داده می‌شود.
- رهاکردن روی مرکز یک گره یعنی «فرزند آن گره».
- رهاکردن نزدیک لبهٔ بالا/پایین گره یعنی «درج قبل/بعد» آن گره.
- سمت (چپ/راست) از جای نشانگر تعیین می‌شود، نه از ترتیب نودها.
- پس از رهاکردن، چیدمان خودکار فاصله‌ها را مرتب می‌کند و هیچ گرهی روی دیگری نمی‌افتد.
- `Esc` در حین کشیدن، عملیات را لغو می‌کند.
- هر جابه‌جایی یک ورودی واحد در Undo ثبت می‌کند.

## نکته‌ها

- کامپوننت به `height` والد نیاز دارد (مثلاً `style="height: 600px"`)؛ `min-height` پیش‌فرض ۳۲۰px است.
- تم فقط داخل خود کامپوننت scope شده و روی `document` یا `body` هاست چیزی نمی‌نویسد.
- `MindmapApp` هم export می‌شود (اپ کامل دمو با هدر و پنل تنظیمات)، ولی برای جاسازی در پروژه بزرگ از `MindmapViewer` استفاده کنید.
