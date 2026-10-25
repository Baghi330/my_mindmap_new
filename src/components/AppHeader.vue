<template>
  <header class="app-header">
    <div class="header-search">
      <div class="search-field" :class="{ 'has-query': hasSearch }">
        <UiIcon class="search-icon" name="search" :size="16" />
        <input
          ref="searchInput"
          class="search-input"
          type="text"
          :value="store.searchQuery.value"
          placeholder="جست‌وجو در گره‌ها…"
          aria-label="جست‌وجو در عنوان و یادداشت گره‌ها"
          @input="handleSearchInput"
          @keydown="handleSearchKeydown"
        />
        <span v-if="hasSearch" class="search-count" aria-live="polite">
          <template v-if="resultCount > 0">
            {{ toPersianDigits(currentMatchNumber) }} از
            {{ toPersianDigits(resultCount) }}
          </template>
          <template v-else>بدون نتیجه</template>
        </span>
        <div v-if="hasSearch && resultCount > 0" class="search-nav">
          <button
            type="button"
            class="search-nav-button"
            title="نتیجه قبلی"
            aria-label="نتیجه قبلی"
            @click="store.navigateSearch(-1)"
          >
            <UiIcon name="chevron-up" :size="13" />
          </button>
          <button
            type="button"
            class="search-nav-button"
            title="نتیجه بعدی"
            aria-label="نتیجه بعدی"
            @click="store.navigateSearch(1)"
          >
            <UiIcon name="chevron-down" :size="13" />
          </button>
        </div>
        <button
          v-if="hasSearch"
          type="button"
          class="search-clear"
          title="پاک‌کردن جست‌وجو"
          aria-label="پاک‌کردن جست‌وجو"
          @click="store.clearSearch()"
        >
          <UiIcon name="close" :size="13" />
        </button>
        <kbd v-if="!hasSearch" class="search-kbd">Ctrl F</kbd>
      </div>
    </div>

    <div class="header-actions">
      <div class="btn-group undo-group">
        <button
          type="button"
          class="icon-btn"
          :disabled="!store.canUndo.value"
          :title="
            store.canUndo.value
              ? `بازگشت: ${store.undoLabel.value}`
              : 'بازگشتی وجود ندارد'
          "
          aria-label="بازگشت"
          @click="store.undo()"
        >
          <UiIcon name="undo" :size="17" />
        </button>
        <button
          type="button"
          class="icon-btn"
          :disabled="!store.canRedo.value"
          :title="
            store.canRedo.value
              ? `تکرار: ${store.redoLabel.value}`
              : 'تکراری وجود ندارد'
          "
          aria-label="تکرار"
          @click="store.redo()"
        >
          <UiIcon name="redo" :size="17" />
        </button>
      </div>

      <span class="divider-vertical header-divider" aria-hidden="true"></span>

      <div class="menu-anchor" data-menu-root>
        <button
          type="button"
          class="icon-btn"
          :class="{ 'is-active': exportMenuOpen }"
          title="خروجی و چاپ"
          aria-label="خروجی و چاپ"
          :aria-expanded="exportMenuOpen"
          @click="exportMenuOpen = !exportMenuOpen"
        >
          <UiIcon
            :name="exportBusy ? 'refresh' : 'download'"
            :size="17"
            :class="{ spin: exportBusy }"
          />
        </button>
        <Transition name="menu-fade">
          <div v-if="exportMenuOpen" class="menu header-menu export-menu">
            <div class="menu-label">خروجی مایندمپ</div>
            <button
              type="button"
              class="menu-item"
              @click="exportMindmap('json')"
            >
              <UiIcon name="braces" :size="15" />
              <span>ساختار JSON</span>
              <span class="menu-hint">.json</span>
            </button>
            <button
              type="button"
              class="menu-item"
              @click="exportMindmap('svg')"
            >
              <UiIcon name="branch" :size="15" />
              <span>گراف SVG</span>
              <span class="menu-hint">.svg</span>
            </button>
            <button
              type="button"
              class="menu-item"
              @click="exportMindmap('png')"
            >
              <UiIcon name="image" :size="15" />
              <span>تصویر PNG</span>
              <span class="menu-hint">.png</span>
            </button>
            <div class="menu-separator"></div>
            <button
              type="button"
              class="menu-item"
              @click="exportMindmap('print')"
            >
              <UiIcon name="printer" :size="15" />
              <span>چاپ مایندمپ</span>
              <span class="menu-hint">Ctrl P</span>
            </button>
          </div>
        </Transition>
      </div>

      <button
        type="button"
        class="icon-btn"
        :title="isDark ? 'تم روشن' : 'تم تاریک'"
        :aria-label="isDark ? 'تم روشن' : 'تم تاریک'"
        @click="toggleTheme"
      >
        <UiIcon :name="isDark ? 'sun' : 'moon'" :size="17" />
      </button>

      <button
        type="button"
        class="icon-btn settings-button"
        :class="{ 'is-active': store.activePanel.value === 'settings' }"
        title="تنظیمات و ابزارها"
        aria-label="تنظیمات"
        @click="store.togglePanel('settings')"
      >
        <UiIcon name="sliders" :size="17" />
      </button>
    </div>
  </header>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { useMindmapStore } from "../composables/useMindmapStore.js";
import { useToast } from "../composables/useToast.js";
import {
  exportMindmapJson,
  exportMindmapPng,
  exportMindmapSvg,
  printMindmap,
} from "../services/exporters.js";
import { toPersianDigits } from "../utils/text.js";
import UiIcon from "./UiIcon.vue";

const store = useMindmapStore();
const toast = useToast();

const searchInput = ref(null);
const exportMenuOpen = ref(false);
const exportBusy = ref("");

const hasSearch = computed(() => store.searchQuery.value.trim().length > 0);
const resultCount = computed(() => store.searchResults.value.length);
const currentMatchNumber = computed(() => {
  if (!hasSearch.value || resultCount.value === 0) return 0;
  return Math.min(store.activeSearchIndex.value + 1, resultCount.value);
});
const isDark = computed(() => store.resolvedTheme.value === "dark");
const anyMenuOpen = computed(() => exportMenuOpen.value);

function closeMenus() {
  exportMenuOpen.value = false;
}

function focusSearch() {
  nextTick(() => {
    searchInput.value?.focus({ preventScroll: true });
    searchInput.value?.select();
  });
}

function handleSearchInput(event) {
  store.setSearchQuery(event.target.value);
}

function handleSearchKeydown(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    if (resultCount.value > 0) store.focusActiveSearchResult();
  } else if (event.key === "ArrowDown") {
    event.preventDefault();
    store.navigateSearch(1);
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    store.navigateSearch(-1);
  } else if (event.key === "Escape") {
    event.preventDefault();
    store.clearSearch();
    searchInput.value?.blur();
  }
}

function toggleTheme() {
  store.setThemeMode(isDark.value ? "light" : "dark");
}

async function exportMindmap(kind) {
  closeMenus();
  if (exportBusy.value) return;
  exportBusy.value = kind;
  const options = {
    theme: store.theme.value,
    title: store.rootLabel.value,
    subtitle: "ذهن‌نگار • مایندمپ پژوهشی",
  };
  try {
    await nextTick();
    if (kind === "json") {
      exportMindmapJson(store.tree.value, options);
    } else if (kind === "svg") {
      await exportMindmapSvg(store.layout.value, options);
    } else if (kind === "png") {
      await exportMindmapPng(store.layout.value, options);
    } else if (kind === "print") {
      await printMindmap(store.layout.value, options);
    }
  } catch (error) {
    toast.error(`خروجی ناموفق بود: ${error?.message || "خطای نامشخص"}`);
  } finally {
    exportBusy.value = "";
  }
}

function handleDocumentPointerDown(event) {
  if (!anyMenuOpen.value) return;
  if (
    event.target.closest?.(".menu") ||
    event.target.closest?.("[data-menu-root]")
  )
    return;
  closeMenus();
}

function handleDocumentKeydown(event) {
  if (event.key === "Escape") closeMenus();
}

onMounted(() => {
  document.addEventListener("pointerdown", handleDocumentPointerDown, true);
  document.addEventListener("keydown", handleDocumentKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", handleDocumentPointerDown, true);
  document.removeEventListener("keydown", handleDocumentKeydown);
});

defineExpose({ focusSearch });
</script>

<style scoped>
.app-header {
  position: relative;
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 14px;
  height: var(--header-height, 64px);
  padding: 0 18px;
  border-bottom: 1px solid var(--border);
  background: color-mix(in srgb, var(--app-bg) 78%, transparent);
  backdrop-filter: blur(20px);
  flex: none;
}

.header-search {
  flex: 1;
  display: flex;
  justify-content: center;
  min-width: 160px;
}

.search-field {
  display: flex;
  align-items: center;
  gap: 7px;
  width: min(420px, 100%);
  height: 38px;
  padding: 0 10px;
  border-radius: 11px;
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--surface) 86%, transparent);
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    background-color 160ms ease;
}

.search-field:focus-within {
  border-color: color-mix(in srgb, var(--accent) 56%, var(--border));
  background: var(--surface);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 12%, transparent);
}

.search-icon {
  color: var(--text-faint);
  flex: none;
}

.search-input {
  min-width: 40px;
  flex: 1;
  height: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  font-size: 12.5px;
  outline: none;
}

.search-input::placeholder {
  color: var(--text-faint);
}

.search-kbd {
  flex: none;
  font-family: inherit;
  font-size: 9px;
  padding: 2px 5px;
  border-radius: 5px;
  border: 1px solid var(--border);
  color: var(--text-faint);
  direction: ltr;
}

.search-count {
  flex: none;
  font-size: 10px;
  color: var(--text-muted);
  white-space: nowrap;
}

.search-nav {
  display: flex;
  gap: 1px;
  flex: none;
}

.search-nav-button,
.search-clear {
  display: grid;
  place-items: center;
  width: 21px;
  height: 21px;
  border-radius: 6px;
  color: var(--text-faint);
  transition:
    background-color 140ms ease,
    color 140ms ease;
}

.search-nav-button:hover,
.search-clear:hover {
  background: var(--surface-muted);
  color: var(--text);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 3px;
  flex: none;
  margin-inline-start: auto;
}

.undo-group {
  gap: 0;
}

.menu-anchor {
  position: relative;
}

.header-menu {
  position: absolute;
  top: calc(100% + 9px);
  left: 0;
  min-width: 244px;
}

.export-menu {
  left: 0;
}

.menu-fade-enter-active,
.menu-fade-leave-active {
  transition:
    opacity 140ms ease,
    transform 140ms ease;
}

.menu-fade-enter-from,
.menu-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.985);
}

@media (max-width: 920px) {
  .header-divider {
    display: none;
  }
}

@media (max-width: 760px) {
  .app-header {
    height: auto;
    min-height: 58px;
    flex-wrap: wrap;
    gap: 8px;
    padding: 8px 12px;
  }

  .brand {
    display: none;
  }

  .header-search {
    order: 4;
    flex-basis: 100%;
    min-width: 0;
  }

  .search-field {
    width: 100%;
    height: 36px;
  }

  .search-kbd {
    display: none;
  }

  .undo-group {
    display: none;
  }

  .header-menu {
    position: fixed;
    top: calc(var(--header-height, 96px) + 6px);
    left: 10px;
    right: 10px;
    min-width: 0;
  }

  .export-menu {
    right: 10px;
    left: 10px;
  }
}

@media (max-width: 480px) {
  .header-actions {
    gap: 0;
  }
}
</style>
