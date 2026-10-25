import { describe, expect, it } from "vitest";
import {
  flattenTreeToEvents,
  streamSampleMindmap,
} from "../src/services/mindmapStream.js";
import { countNodes, normalizeTree } from "../src/core/tree.js";

/**
 * سناریوی هدف پکیج: هاست یک JSON بیرونی می‌دهد و ویور آن را
 * اعتبارسنجی و سپس به‌صورت تدریجی (ریشه اول، بعد دسته‌های گره) نمایش می‌دهد.
 * این تست همان مسیری را می‌رود که store.loadExternalData طی می‌کند:
 * normalize → incremental batches → merge به‌ترتیب.
 */
const EXTERNAL_JSON = {
  id: "project-root",
  label: "نقشه راه محصول",
  note: "داده بیرونی هاست",
  collapsed: false,
  children: [
    {
      id: "phase-1",
      label: "فاز یک",
      children: [
        { id: "phase-1-a", label: "تحقیق کاربر", children: [] },
        { id: "phase-1-b", label: "نمونه اولیه", children: [] },
      ],
    },
    {
      id: "phase-2",
      label: "فاز دو",
      children: [{ id: "phase-2-a", label: "انتشار آزمایشی", children: [] }],
    },
  ],
};

async function collectChunks(tree, baseDelay = 0) {
  const chunks = [];
  for await (const chunk of streamSampleMindmap(tree, {
    mode: "incremental",
    baseDelay,
  })) {
    chunks.push(chunk);
  }
  return chunks;
}

describe("بارگذاری تدریجی JSON بیرونی", () => {
  it("داده بیرونی معتبر normalize می‌شود", () => {
    const result = normalizeTree(EXTERNAL_JSON);
    expect(result.ok).toBe(true);
    expect(result.tree.id).toBe("project-root");
    expect(countNodes(result.tree)).toBe(6);
  });

  it("ریشه اول و بقیه گره‌ها بعد می‌آیند (نمایش تدریجی)", async () => {
    const normalized = normalizeTree(EXTERNAL_JSON);
    const chunks = await collectChunks(normalized.tree);
    const nodeChunks = chunks.filter((chunk) => chunk.type === "nodes");

    // اولین بسته فقط ریشه است
    expect(nodeChunks[0].events).toHaveLength(1);
    expect(nodeChunks[0].events[0].id).toBe("project-root");

    // همه گره‌ها دقیقاً یک‌بار پوشش داده می‌شوند
    const ids = nodeChunks.flatMap((chunk) =>
      chunk.events.map((event) => event.id),
    );
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(6);
    expect(ids[0]).toBe("project-root");

    // هر فرزند بعد از والدش می‌آید (قابل merge تدریجی)
    const position = new Map(ids.map((id, index) => [id, index]));
    const events = flattenTreeToEvents(normalized.tree);
    for (const event of events) {
      if (event.parentId) {
        expect(position.get(event.parentId)).toBeLessThan(
          position.get(event.id),
        );
      }
    }
  });

  it("پوشش { root } هم پذیرفته می‌شود", () => {
    const result = normalizeTree({ root: EXTERNAL_JSON });
    expect(result.ok).toBe(true);
    expect(result.tree.id).toBe("project-root");
  });

  it("داده نامعتبر رد می‌شود", () => {
    expect(normalizeTree(null).ok).toBe(false);
    expect(normalizeTree({ children: [] }).ok).toBe(false);
    expect(normalizeTree("متن").ok).toBe(false);
  });
});
