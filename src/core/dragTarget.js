/**
 * تشخیص مقصد رهاکردن گره — «جایگاه ساختاری»، نه مختصات آزاد.
 *
 * مدل تصمیم‌گیری (الهام‌گرفته از XMind):
 *   ۱) کاربر با موقعیت نشانگر، «والد» و «جایگاه بین فرزندان» را انتخاب می‌کند.
 *   ۲) ما یک ایندکس درج + سمت (چپ/راست) تولید می‌کنیم.
 *   ۳) چیدمان خودکار همان ایندکس را با فاصله‌گذاری تمیز می‌چیند.
 *
 * پس کاربر آزادی انتخاب مقصد دارد، اما مختصات نهایی را موتور چیدمان
 * تعیین می‌کند؛ این تضمین می‌کند هیچ گرهی روی دیگری نیفتد و نتیجه
 * با پیش‌نمایش (که همان ایندکس/سمت را نشان می‌دهد) یکی باشد.
 */
import { findNode, findNodeWithParent, isDescendant } from "./tree.js";

export const DROP_BETWEEN = "between"; // هم‌نیا با ایندکس مشخص
export const DROP_CHILD = "child"; // فرزند آخر والد
export const DROP_NONE = "none";

export const SIDE_LEFT = "left";
export const SIDE_RIGHT = "right";

/** شعاعی که نشانگر «روی» یک گره حساب می‌شود (نسبت به نوار عمودی فرزندان) */
const SIBLING_SNAP = 0.5;

function distanceToNode(node, x, y) {
  const dx = Math.max(0, Math.abs(x - node.x) - node.width / 2);
  const dy = Math.max(0, Math.abs(y - node.y) - node.height / 2);
  return Math.hypot(dx, dy);
}

/** آیا انتقال این گره به این والد از نظر ساختار درخت مجاز است؟ */
export function canReparent(tree, draggedId, parentId) {
  if (!draggedId || !parentId) return false;
  if (draggedId === parentId) return false;
  const located = findNodeWithParent(tree, draggedId);
  if (!located || !located.parent) return false;
  if (!findNode(tree, parentId)) return false;
  if (isDescendant(tree, draggedId, parentId)) return false;
  return true;
}

/**
 * گره میزبان و سمت را از موقعیت نشانگر پیدا می‌کند.
 * - نشانگر داخل یک گره ⇒ همان گره میزبان است
 * - وگرنه نزدیک‌ترین گره در همان ستون عمودی (هم‌تراز با فرزندان یک والد)
 */
function findAnchor(tree, draggedId, point, layout) {
  const nodes = layout?.nodes || [];
  let containing = null;
  let nearest = null;
  let nearestDistance = Infinity;

  for (const node of nodes) {
    if (node.id === draggedId) continue;
    if (isDescendant(tree, draggedId, node.id)) continue;

    const insideX = Math.abs(point.x - node.x) <= node.width / 2;
    const insideY = Math.abs(point.y - node.y) <= node.height / 2;
    if (insideX && insideY) {
      containing = node;
      break;
    }

    // نزدیک‌ترین گره با فاصله محدود، برای اینکه فضای خالی بین گره‌ها هم
    // هدف معتبر داشته باشد (همان حس «بین دو نود رها می‌کنم»)
    const distance = distanceToNode(node, point.x, point.y);
    const radius = Math.max(node.width, node.height) * SIBLING_SNAP;
    if (distance <= radius && distance < nearestDistance) {
      nearestDistance = distance;
      nearest = node;
    }
  }
  return containing || nearest;
}

/** سمت نسبی نقطه رهاکردن نسبت به والد مقصد */
export function resolveSide(parentLayoutNode, point) {
  if (!parentLayoutNode) return null;
  if (point.x < parentLayoutNode.x) return SIDE_LEFT;
  if (point.x > parentLayoutNode.x) return SIDE_RIGHT;
  // دقیقاً روی محور والد: سمت خود والد را نگه می‌داریم
  if (parentLayoutNode.side === SIDE_LEFT) return SIDE_LEFT;
  if (parentLayoutNode.side === SIDE_RIGHT) return SIDE_RIGHT;
  return SIDE_RIGHT;
}

function emptyTarget() {
  return {
    kind: DROP_NONE,
    targetId: null,
    parentId: null,
    index: -1,
    side: null,
    valid: false,
    anchorY: 0,
    anchorId: null,
  };
}

/**
 * @param {object} tree
 * @param {string} draggedId
 * @param {{x:number,y:number}} point مختصات نشانگر در دنیای مایندمپ
 * @param {object} layout
 */
export function resolveDropTarget(tree, draggedId, point, layout) {
  if (!tree || !draggedId || !layout || !point) return emptyTarget();

  const located = findNodeWithParent(tree, draggedId);
  if (!located || !located.parent) return emptyTarget();

  const anchor = findAnchor(tree, draggedId, point, layout);
  if (!anchor) return emptyTarget();
  if (anchor.id === draggedId) return emptyTarget();

  /* ---------- حالت ۱: رهاکردن داخل گره مرکزی ⇒ فرزند گره مرکزی ---------- */
  if (anchor.depth === 0) {
    if (!canReparent(tree, draggedId, anchor.id)) {
      return {
        ...emptyTarget(),
        targetId: anchor.id,
        parentId: anchor.id,
        valid: false,
      };
    }
    const side = resolveSide(anchor, point);
    const siblings = tree.children || [];
    return {
      kind: DROP_CHILD,
      targetId: anchor.id,
      parentId: anchor.id,
      index: siblings.length,
      side,
      valid: true,
      anchorY: anchor.y,
      anchorId: anchor.id,
    };
  }

  const anchorParentEntry = findNodeWithParent(tree, anchor.id);
  const anchorParent = anchorParentEntry?.parent;
  if (!anchorParent) return emptyTarget();

  const parentLayout = layout.nodeMap.get(anchorParent.id);
  if (!parentLayout) return emptyTarget();

  const sameParent = located.parent.id === anchorParent.id;

  /* ---------- حالت ۲: داخل گره غیرمرکزی ----------
     فقط نواحی میانی «فرزند» هستند؛ نوارهای باریک بالا و پایین گره
     «درج قبل/بعد» می‌دهند تا کاربر بتواند بین دو گره هم‌نیا درج کند. */
  const insideX = Math.abs(point.x - anchor.x) <= anchor.width / 2;
  const insideY = Math.abs(point.y - anchor.y) <= anchor.height / 2;
  const edgeBand = anchor.height * 0.32;
  const inEdgeBand =
    insideX &&
    insideY &&
    Math.abs(point.y - anchor.y) > anchor.height / 2 - edgeBand;

  if (
    insideX &&
    insideY &&
    !inEdgeBand &&
    canReparent(tree, draggedId, anchor.id)
  ) {
    const side = resolveSide(anchor, point);
    return {
      kind: DROP_CHILD,
      targetId: anchor.id,
      parentId: anchor.id,
      index: (anchor.node?.children || []).length,
      side,
      valid: true,
      anchorY: anchor.y,
      anchorId: anchor.id,
    };
  }

  /* ---------- حالت ۳: کنار گره ⇒ هم‌نیا در همان والد، قبل/بعد ---------- */
  if (!canReparent(tree, draggedId, anchorParent.id) && !sameParent) {
    return {
      ...emptyTarget(),
      targetId: anchor.id,
      parentId: anchorParent.id,
      valid: false,
    };
  }

  const siblings = anchorParent.children;
  const anchorIndex = siblings.findIndex((child) => child.id === anchor.id);
  if (anchorIndex < 0) return emptyTarget();

  // بالای گره ⇒ قبل از آن، پایین گره ⇒ بعد از آن
  const after = point.y > anchor.y;
  let index = after ? anchorIndex + 1 : anchorIndex;

  // اصلاح ایندکس برای جابه‌جایی داخل همان فهرست: چون گره از جای فعلی‌اش
  // حذف می‌شود، اگر مبدأ قبل از نقطه درج باشد یک واحد عقب می‌رود.
  if (sameParent) {
    const currentIndex = siblings.findIndex((child) => child.id === draggedId);
    if (currentIndex !== -1) {
      if (currentIndex < index) index -= 1;
      if (index === currentIndex)
        return { ...emptyTarget(), targetId: anchor.id, valid: false };
    }
  }

  // سمت از موقعیت نشانگر نسبت به خود گرهٔ میزبان گرفته می‌شود، نه نسبت
  // به والد؛ بنابراین می‌توان گره را به سمت مخالف هم برد که مایندمپ
  // دوطرفه بماند.
  const parentIsRoot = parentLayout.depth === 0;
  const side = parentIsRoot
    ? resolveSide(parentLayout, point)
    : anchor.side === SIDE_LEFT
      ? SIDE_LEFT
      : SIDE_RIGHT;

  return {
    kind: DROP_BETWEEN,
    targetId: anchor.id,
    parentId: anchorParent.id,
    index: Math.max(0, index),
    side,
    valid: true,
    anchorY: anchor.y,
    anchorId: anchor.id,
  };
}

/**
 * پایدارسازی: مقصد فقط وقتی عوض شود که والد یا ایندکس یا سمت واقعاً عوض شده
 * باشد؛ این جلوی لرزش پیش‌نمایش بین دو گره نزدیک را می‌گیرد.
 */
export function shouldCommitTarget(previous, next) {
  if (!previous || previous.kind === DROP_NONE)
    return Boolean(next && next.kind !== DROP_NONE);
  if (!next || next.kind === DROP_NONE) return previous.kind !== DROP_NONE;
  return (
    previous.kind !== next.kind ||
    previous.parentId !== next.parentId ||
    previous.index !== next.index ||
    previous.side !== next.side ||
    previous.targetId !== next.targetId
  );
}
