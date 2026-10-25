import type { DefineComponent, Ref } from "vue";

/** یک گره مایندمپ */
export interface MindmapNodeData {
  id: string;
  label: string;
  note?: string;
  collapsed?: boolean;
  children?: MindmapNodeData[];
}

/** ورودی داده: درخت خام یا پوشش { root } */
export type MindmapDataInput = MindmapNodeData | { root: MindmapNodeData };

/** نتیجه بارگذاری داده بیرونی */
export interface LoadExternalDataResult {
  ok: boolean;
  busy?: boolean;
  stale?: boolean;
  warnings?: string[];
  errors?: string[];
  nodeCount?: number;
}

export interface LoadExternalDataOptions {
  /** نمایش تدریجی (پیش‌فرض true) */
  gradual?: boolean;
  /** حالت استریم */
  mode?: "full" | "incremental";
  /** نمایش پیام‌ها (پیش‌فرض true) */
  announce?: boolean;
  /** تأخیر پایه هر بسته (میلی‌ثانیه) */
  baseDelay?: number;
}

export interface MindmapViewerProps {
  data?: MindmapDataInput | null;
  gradual?: boolean;
  mode?: "full" | "incremental";
  /** تأخیر پایه هر بسته (میلی‌ثانیه) */
  delay?: number | null;
  theme?: "light" | "dark" | "system";
  direction?: "balanced" | "rtl" | "ltr";
  readonly?: boolean;
  persist?: boolean;
  showProgress?: boolean;
  showToasts?: boolean;
}

export interface MindmapViewerExposed {
  loadData: (
    rawData: MindmapDataInput,
    options?: LoadExternalDataOptions,
  ) => Promise<LoadExternalDataResult>;
  stop: () => boolean;
  loading: Ref<boolean>;
}

/** ویور قابل جاسازی: داده را از پراپ می‌گیرد و تدریجی نمایش می‌دهد */
export declare const MindmapViewer: DefineComponent<
  MindmapViewerProps,
  MindmapViewerExposed
>;

/** اپ کامل دمو (هدر، پنل تنظیمات، ویرایش) */
export declare const MindmapApp: DefineComponent<
  Record<string, never>,
  Record<string, never>
>;

declare const _default: typeof MindmapApp;
export default _default;
