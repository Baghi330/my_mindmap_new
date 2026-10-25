/**
 * نمونه داده آزمایشی برای حالت «دریافت کامل» و «دریافت تدریجی».
 * ساختار دقیقاً همان قرارداد درخت مایندمپ است:
 * { id, label, note, collapsed, children }
 */
export const sampleMindmap = {
  id: "root",
  label: "ریشه",
  note: "",
  collapsed: false,
  children: [
    { id: "branch-1", label: "شاخه ۱", children: [] },
    { id: "branch-2", label: "شاخه ۲", children: [] },
    { id: "branch-3", label: "شاخه ۳", children: [] },
    { id: "branch-4", label: "شاخه ۴", children: [] },
  ],
};

export const blankMindmap = {
  id: "root",
  label: "موضوع پژوهش",
  note: "",
  collapsed: false,
  children: [],
};
