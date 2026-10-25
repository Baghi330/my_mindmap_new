/**
 * درخت پیش‌فرض (فقط ساختار، بدون محتوای آزمایشی):
 * یک ریشهٔ خالی برای «نقشه جدید» و یک نقشهٔ ساده با ریشه و چهار شاخه.
 *
 * ساختار: { id, label, note, collapsed, children }
 */

export const blankMindmap = {
  id: "root",
  label: "موضوع پژوهش",
  note: "",
  collapsed: false,
  children: [],
};

export const defaultMindmap = {
  id: "root",
  label: "ریشه",
  note: "",
  collapsed: false,
  children: [
    {
      id: "branch-1",
      label: "شاخه ۱",
      note: "",
      collapsed: false,
      children: [],
    },
    {
      id: "branch-2",
      label: "شاخه ۲",
      note: "",
      collapsed: false,
      children: [],
    },
    {
      id: "branch-3",
      label: "شاخه ۳",
      note: "",
      collapsed: false,
      children: [],
    },
    {
      id: "branch-4",
      label: "شاخه ۴",
      note: "",
      collapsed: false,
      children: [],
    },
  ],
};
