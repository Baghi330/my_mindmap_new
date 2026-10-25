/**
 * دموی مستقل MindmapViewer: داده تستی فقط از طریق پراپ داده می‌شود.
 * اجرا: npm run dev سپس مرورگر روی /viewer-demo.html
 */
import { createApp, h, ref } from "vue";
import "@fontsource-variable/vazirmatn";
import "./styles/base.css";
import MindmapViewer from "./components/MindmapViewer.vue";

const testData = {
  id: "root",
  label: "نقشه راه محصول ۱۴۰۵",
  note: "این داده از پراپ data می‌آید، نه از حافظه مرورگر.",
  collapsed: false,
  children: [
    {
      id: "discovery",
      label: "کشف و پژوهش",
      note: "شناخت کاربر و بازار",
      children: [
        { id: "interviews", label: "مصاحبه با کاربران", children: [] },
        { id: "market", label: "تحلیل بازار", children: [] },
        {
          id: "competitors",
          label: "بررسی رقبا",
          children: [
            { id: "feature-matrix", label: "ماتریس ویژگی‌ها", children: [] },
          ],
        },
      ],
    },
    {
      id: "design",
      label: "طراحی تجربه",
      children: [
        { id: "wireframe", label: "وایرفریم", children: [] },
        { id: "design-system", label: "سیستم طراحی", children: [] },
      ],
    },
    {
      id: "engineering",
      label: "مهندسی",
      note: "اجرای فنی و کیفیت",
      children: [
        { id: "architecture", label: "معماری سرویس‌ها", children: [] },
        { id: "testing", label: "تست خودکار", children: [] },
        { id: "ci-cd", label: "خط لوله انتشار", children: [] },
      ],
    },
    {
      id: "launch",
      label: "انتشار و رشد",
      children: [
        { id: "beta", label: "نسخه بتا", children: [] },
        { id: "marketing", label: "کمپین معرفی", children: [] },
      ],
    },
  ],
};

const events = ref([]);

const Demo = {
  setup() {
    return () =>
      h("div", { style: "height:100vh; display:flex; flex-direction:column" }, [
        h(
          "div",
          {
            style:
              "padding:10px 14px; border-bottom:1px solid rgba(0,0,0,.12); font: 12px system-ui; display:flex; gap:12px; align-items:center",
          },
          [
            h("strong", "داده تستی از پراپ"),
            h("span", { id: "status" }, events.value.at(-1) || "در انتظار…"),
          ],
        ),
        h(
          "div",
          { style: "flex:1; min-height:0" },
          h(MindmapViewer, {
            data: testData,
            onLoaded: (result) =>
              events.value.push(`loaded: ${result.nodeCount} گره`),
            onProgress: ({ received, status }) =>
              events.value.push(`progress: ${received} — ${status}`),
            onError: (error) =>
              events.value.push(`error: ${JSON.stringify(error)}`),
          }),
        ),
      ]);
  },
};

createApp(Demo).mount("#app");
