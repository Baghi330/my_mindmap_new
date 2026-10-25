<template>
  <div class="mindmap-viewer" :style="themeVars" dir="rtl">
    <MindmapCanvas v-if="isMounted" :readonly="readonly" />
    <div v-else class="viewer-loading">در حال بارگذاری…</div>
    <GrowthBar v-if="showProgress" />
    <ContextMenu v-if="!readonly" disable-teleport :style-vars="themeVars" />
    <ToastStack v-if="showToasts" disable-teleport :style-vars="themeVars" />
    <ConfirmDialog v-if="!readonly" disable-teleport :style-vars="themeVars" />
  </div>
</template>

<script setup>
/**
 * MindmapViewer — ورودی پکیج برای پروژه‌های بزرگ.
 * داده را از پراپ `data` می‌گیرد (درخت خام یا پوشش { root }) و
 * به‌صورت تدریجی نمایش می‌دهد (ابتدا ریشه، سپس شاخه‌ها).
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useMindmapStore } from "../composables/useMindmapStore.js";
import { themeToCssVariables } from "../theme/palettes.js";
import MindmapCanvas from "./MindmapCanvas.vue";
import GrowthBar from "./GrowthBar.vue";
import ToastStack from "./ToastStack.vue";
import ContextMenu from "./ContextMenu.vue";
import ConfirmDialog from "./ConfirmDialog.vue";

const props = defineProps({
  /** درخت مایندمپ: { id, label, note, collapsed, children } یا { root } */
  data: { type: Object, default: null },
  /** نمایش تدریجی (ریشه اول، بعد شاخه‌ها) یا یک‌باره */
  gradual: { type: Boolean, default: true },
  /** حالت استریم تدریجی */
  mode: { type: String, default: "incremental" },
  /** تأخیر پایه هر بسته برحسب میلی‌ثانیه (null یعنی پیش‌فرض موتور) */
  delay: { type: Number, default: null },
  /** تم: light | dark | system */
  theme: { type: String, default: "system" },
  /** جهت چیدمان: balanced | rtl | ltr */
  direction: { type: String, default: "balanced" },
  /** فقط خواندنی: منوی زمینه (ویرایش/حذف) نمایش داده نمی‌شود */
  readonly: { type: Boolean, default: false },
  /** ذخیره در localStorage مرورگر (پیش‌فرض خاموش تا روی هاست اثر نگذارد) */
  persist: { type: Boolean, default: false },
  /** نمایش نوار پیشرفت رشد */
  showProgress: { type: Boolean, default: true },
  /** نمایش پیام‌ها (پیش‌فرض روشن) */
  showToasts: { type: Boolean, default: true },
});

const emit = defineEmits(["loaded", "error", "progress"]);

const store = useMindmapStore();
const loading = ref(false);
const isMounted = ref(typeof window === "undefined");
let cancelled = false;
let nonce = 0;

/** متغیرهای تم روی ریشه همین کامپوننت (نه document) تا روی هاست اثر نگذارد */
const themeVars = computed(() => themeToCssVariables(store.theme.value));

function applyPreferences() {
  if (props.theme && props.theme !== store.preferences.theme) {
    store.setThemeMode(props.theme);
  }
  if (props.direction && props.direction !== store.preferences.direction) {
    store.setDirection(props.direction);
  }
  if (!props.persist && store.preferences.autoSave) {
    store.preferences.autoSave = false;
  }
  if (props.persist && !store.preferences.autoSave) {
    store.preferences.autoSave = true;
  }
}

async function loadData(rawData, options = {}) {
  if (!rawData || typeof rawData !== "object") return { ok: false };
  nonce += 1;
  const ticket = nonce;
  loading.value = true;
  try {
    const result = await store.loadExternalData(rawData, {
      gradual: options.gradual ?? props.gradual,
      mode: options.mode ?? (props.mode === "full" ? "full" : "incremental"),
      announce: options.announce ?? props.showToasts,
      ...(Number.isFinite(options.baseDelay)
        ? { baseDelay: options.baseDelay }
        : Number.isFinite(props.delay)
          ? { baseDelay: props.delay }
          : {}),
    });
    if (cancelled || ticket !== nonce) return { ok: false, stale: true };
    if (result?.ok) emit("loaded", result);
    else if (result && !result.busy) emit("error", result);
    return result;
  } finally {
    if (ticket === nonce) loading.value = false;
  }
}

watch(
  () => props.data,
  (next) => {
    if (next) loadData(next);
  },
  { deep: true },
);

watch(
  () => [props.theme, props.direction, props.persist],
  () => applyPreferences(),
);

watch(
  () => props.readonly,
  (isReadonly) => {
    if (isReadonly && store.editingId.value) store.stopEditing();
  },
);

watch(
  [() => store.streamReceived.value, () => store.streamStatus.value],
  ([received, status]) => {
    emit("progress", { received, status });
  },
);

onMounted(() => {
  isMounted.value = true;
  applyPreferences();
  if (props.data) loadData(props.data);
});

onBeforeUnmount(() => {
  cancelled = true;
  store.stopGeneration();
});

defineExpose({ loadData, stop: () => store.stopGeneration(), loading });
</script>

<style scoped>
.mindmap-viewer {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 320px;
  overflow: hidden;
  color: var(--text);
  background: var(--app-bg);
  color-scheme: light dark;
  direction: rtl;
}

.viewer-loading {
  display: grid;
  place-items: center;
  height: 100%;
  min-height: inherit;
  color: var(--text-muted, #666);
  font-size: 13px;
}
</style>
