import { describe, expect, it } from "vitest";
import { createNodeMeasurer } from "../src/core/measure.js";
import { layoutMindmap } from "../src/core/layout.js";
import {
  canReparent,
  resolveDropTarget,
  shouldCommitTarget,
  DROP_BETWEEN,
  DROP_CHILD,
  DROP_NONE,
  SIDE_LEFT,
  SIDE_RIGHT,
} from "../src/core/dragTarget.js";
import { measureTextForTests } from "./helpers.js";

function makeTree() {
  return {
    id: "root",
    label: "ریشه",
    note: "",
    collapsed: false,
    children: [
      {
        id: "a",
        label: "شاخه الف",
        note: "",
        collapsed: false,
        children: [
          {
            id: "a1",
            label: "فرزند الف",
            note: "",
            collapsed: false,
            children: [],
          },
        ],
      },
      { id: "b", label: "شاخه ب", note: "", collapsed: false, children: [] },
      { id: "c", label: "شاخه ج", note: "", collapsed: false, children: [] },
    ],
  };
}

function layoutOf(tree) {
  const measure = createNodeMeasurer({
    measureText: (text, font) => measureTextForTests(text, font),
  });
  return layoutMindmap(tree, { measure, direction: "ltr" });
}

function at(layout, id, ratio = 0) {
  const node = layout.nodeMap.get(id);
  return { x: node.x, y: node.y + (node.height / 2) * ratio };
}

describe("تشخیص مقصد کشیدن", () => {
  it("مرکز گره را به‌عنوان والد تشخیص می‌دهد", () => {
    const tree = makeTree();
    const layout = layoutOf(tree);
    const target = resolveDropTarget(tree, "b", at(layout, "a"), layout);

    expect(target.kind).toBe(DROP_CHILD);
    expect(target.parentId).toBe("a");
    expect(target.valid).toBe(true);
  });

  it("بالای گره یعنی درج قبل و پایین گره یعنی درج بعد", () => {
    const tree = makeTree();
    const layout = layoutOf(tree);

    const before = resolveDropTarget(tree, "c", at(layout, "a", -0.45), layout);
    expect(before.kind).toBe(DROP_BETWEEN);
    expect(before.parentId).toBe("root");
    expect(before.index).toBe(0);

    const after = resolveDropTarget(tree, "c", at(layout, "a", 0.45), layout);
    expect(after.kind).toBe(DROP_BETWEEN);
    expect(after.parentId).toBe("root");
    // «ج» سومین فرزند است؛ بردنش بعد از «الف» ایندکس ۲ می‌شود که پس از
    // حذف گره از جای قبلی به ۱ اصلاح می‌شود (یعنی دقیقاً بعد از «الف»)
    expect(after.index).toBe(1);
  });

  it("گره مرکزی همیشه والد است", () => {
    const tree = makeTree();
    const layout = layoutOf(tree);
    const target = resolveDropTarget(tree, "b", at(layout, "root"), layout);

    expect(target.kind).toBe(DROP_CHILD);
    expect(target.parentId).toBe("root");
    expect(target.valid).toBe(true);
  });

  it("سمت از موقعیت نشانگر نسبت به گره مرکزی گرفته می‌شود", () => {
    const tree = makeTree();
    const layout = layoutOf(tree);
    const root = layout.nodeMap.get("root");
    const right = resolveDropTarget(
      tree,
      "a1",
      { x: root.x + 120, y: root.y },
      layout,
    );
    const left = resolveDropTarget(
      tree,
      "a1",
      { x: root.x - 120, y: root.y },
      layout,
    );

    expect(right.side).toBe(SIDE_RIGHT);
    expect(left.side).toBe(SIDE_LEFT);
  });

  it("رهاکردن روی خود گره یا زیرشاخه‌هایش نامعتبر است", () => {
    const tree = makeTree();
    const layout = layoutOf(tree);

    expect(resolveDropTarget(tree, "a", at(layout, "a"), layout).kind).toBe(
      DROP_NONE,
    );
    expect(resolveDropTarget(tree, "a", at(layout, "a1"), layout).kind).toBe(
      DROP_NONE,
    );
  });

  it("نقطه دور از هر گره مقصد ندارد", () => {
    const tree = makeTree();
    const layout = layoutOf(tree);
    const target = resolveDropTarget(tree, "b", { x: 5000, y: 5000 }, layout);
    expect(target.kind).toBe(DROP_NONE);
    expect(target.valid).toBe(false);
  });

  it("گره ریشه قابل جابه‌جایی نیست", () => {
    const tree = makeTree();
    const layout = layoutOf(tree);
    const target = resolveDropTarget(tree, "root", at(layout, "b"), layout);
    expect(target.valid).toBe(false);
  });

  it("canReparent چرخه و والد ناموجود را رد می‌کند", () => {
    const tree = makeTree();
    expect(canReparent(tree, "a", "a1")).toBe(false);
    expect(canReparent(tree, "a", "a")).toBe(false);
    expect(canReparent(tree, "a1", "b")).toBe(true);
    expect(canReparent(tree, "a", "missing")).toBe(false);
  });

  it("مقصد یکسان دوباره ثبت نمی‌شود (پایداری پیش‌نمایش)", () => {
    const tree = makeTree();
    const layout = layoutOf(tree);
    const first = resolveDropTarget(tree, "c", at(layout, "a", -0.4), layout);
    const second = resolveDropTarget(tree, "c", at(layout, "a", -0.42), layout);

    expect(shouldCommitTarget(first, second)).toBe(false);
    expect(
      shouldCommitTarget(
        first,
        resolveDropTarget(tree, "c", at(layout, "b"), layout),
      ),
    ).toBe(true);
    expect(shouldCommitTarget(first, { kind: DROP_NONE })).toBe(true);
  });

  it("ایندکس درج هنگام جابه‌جایی در همان والد اصلاح می‌شود", () => {
    const tree = makeTree();
    const layout = layoutOf(tree);
    // «ج» سومین فرزند است؛ بردنش قبل از «الف» باید ایندکس ۰ بدهد
    const target = resolveDropTarget(tree, "c", at(layout, "a", -0.45), layout);
    expect(target.index).toBe(0);
    expect(target.parentId).toBe("root");
  });
});
