<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useMindmapStore } from '../composables/useMindmapStore.js'
import { useViewport } from '../composables/useViewport.js'
import { useToast } from '../composables/useToast.js'
import { askConfirm } from '../composables/useConfirm.js'
import {
  exportMindmapJson,
  exportMindmapPng,
  exportMindmapSvg,
  printMindmap,
} from '../services/exporters.js'
import { toPersianDigits } from '../utils/text.js'
import UiIcon from './UiIcon.vue'

const store = useMindmapStore()
const viewport = useViewport()
const toast = useToast()

const headerRoot = ref(null)
const searchInput = ref(null)
const generateMenuOpen = ref(false)
const exportMenuOpen = ref(false)
const exportBusy = ref('')

const hasSearch = computed(() => store.searchQuery.value.trim().length > 0)
const resultCount = computed(() => store.searchResults.value.length)
const currentMatchNumber = computed(() => {
  if (!hasSearch.value || resultCount.value === 0) return 0
  return Math.min(store.activeSearchIndex.value + 1, resultCount.value)
})
const isDark = computed(() => store.resolvedTheme.value === 'dark')
const anyMenuOpen = computed(() => generateMenuOpen.value || exportMenuOpen.value)

function closeMenus() {
  generateMenuOpen.value = false
  exportMenuOpen.value = false
}

function focusSearch() {
  nextTick(() => {
    searchInput.value?.focus({ preventScroll: true })
    searchInput.value?.select()
  })
}

function handleSearchInput(event) {
  store.setSearchQuery(event.target.value)
}

function handleSearchKeydown(event) {
  if (event.key === 'Enter') {
    event.preventDefault()
    if (resultCount.value > 0) store.focusActiveSearchResult()
  } else if (event.key === 'ArrowDown') {
    event.preventDefault()
    store.navigateSearch(1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    store.navigateSearch(-1)
  } else if (event.key === 'Escape') {
    event.preventDefault()
    store.clearSearch()
    searchInput.value?.blur()
  }
}

function handlePrimaryGenerate() {
  if (store.isStreaming.value) {
    store.stopGeneration()
    return
  }
  store.startGeneration('incremental')
}

async function generate(mode) {
  closeMenus()
  if (store.isStreaming.value) {
    toast.info('ابتدا تولید فعلی را متوقف یا کامل کنید.')
    return
  }
  await store.startGeneration(mode)
}

async function clearMap() {
  closeMenus()
  if (store.isStreaming.value) {
    toast.info('ابتدا تولید در حال اجرا را متوقف کنید.')
    return
  }
  const confirmed = await askConfirm({
    title: 'پاک‌کردن نقشه',
    message: 'همه گره‌ها از بوم حذف می‌شوند و فقط گره مرکزی باقی می‌ماند. این کار با Ctrl+Z قابل بازگشت است.',
    confirmLabel: 'پاک کن',
    tone: 'danger',
  })
  if (confirmed) store.clearMap()
}

function toggleTheme() {
  store.setThemeMode(isDark.value ? 'light' : 'dark')
}

function goHome() {
  store.selectNode(store.tree.value.id)
  viewport.fitView({ padding: 92, duration: 420 })
  closeMenus()
}

async function exportMindmap(kind) {
  closeMenus()
  if (exportBusy.value) return
  exportBusy.value = kind
  const options = {
    theme: store.theme.value,
    title: store.rootLabel.value,
    subtitle: 'ذهن‌نگار • مایندمپ پژوهشی',
  }
  try {
    await nextTick()
    if (kind === 'json') {
      const fileName = exportMindmapJson(store.tree.value, options)
      toast.success(`فایل ${fileName} ساخته شد.`)
    } else if (kind === 'svg') {
      const fileName = await exportMindmapSvg(store.layout.value, options)
      toast.success(`فایل ${fileName} ساخته شد.`)
    } else if (kind === 'png') {
      const fileName = await exportMindmapPng(store.layout.value, options)
      toast.success(`فایل ${fileName} ساخته شد.`)
    } else if (kind === 'print') {
      await printMindmap(store.layout.value, options)
      toast.info('پنجره چاپ آماده شد.')
    }
  } catch (error) {
    toast.error(`خروجی ناموفق بود: ${error?.message || 'خطای نامشخص'}`)
  } finally {
    exportBusy.value = ''
  }
}

function handleDocumentPointerDown(event) {
  if (!anyMenuOpen.value) return
  if (event.target.closest?.('.menu') || event.target.closest?.('[data-menu-root]')) return
  closeMenus()
}

function handleDocumentKeydown(event) {
  if (event.key === 'Escape') closeMenus()
}

onMounted(() => {
  document.addEventListener('pointerdown', handleDocumentPointerDown, true)
  document.addEventListener('keydown', handleDocumentKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleDocumentPointerDown, true)
  document.removeEventListener('keydown', handleDocumentKeydown)
})

defineExpose({ focusSearch })
</script>

<template>
  <header ref="headerRoot" class="app-header">
    <button class="brand" type="button" title="نمایش کل درخت" @click="goHome">
      <span class="brand-mark">
        <UiIcon name="logo" :size="20" :stroke-width="1.6" />
      </span>
      <span class="brand-text">
        <strong>ذهن‌نگار</strong>
        <small>مایندمپ پژوهشی هوش مصنوعی</small>
      </span>
    </button>

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
            {{ toPersianDigits(currentMatchNumber) }} از {{ toPersianDigits(resultCount) }}
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
          :title="store.canUndo.value ? `بازگشت: ${store.undoLabel.value}` : 'بازگشتی وجود ندارد'"
          aria-label="بازگشت"
          @click="store.undo()"
        >
          <UiIcon name="undo" :size="17" />
        </button>
        <button
          type="button"
          class="icon-btn"
          :disabled="!store.canRedo.value"
          :title="store.canRedo.value ? `تکرار: ${store.redoLabel.value}` : 'تکراری وجود ندارد'"
          aria-label="تکرار"
          @click="store.redo()"
        >
          <UiIcon name="redo" :size="17" />
        </button>
      </div>

      <span class="divider-vertical header-divider" aria-hidden="true"></span>

      <div class="menu-anchor" data-menu-root>
        <div class="generate-group" :class="{ 'is-streaming': store.isStreaming.value }">
          <button
            type="button"
            class="btn generate-main"
            :class="store.isStreaming.value ? 'btn-danger' : 'btn-primary'"
            :aria-label="store.isStreaming.value ? 'توقف تولید' : 'تولید مایندمپ'"
            @click="handlePrimaryGenerate"
          >
            <UiIcon
              :name="store.isStreaming.value ? 'stop' : 'sparkles'"
              :size="16"
              :class="{ spin: store.isStreaming.value }"
            />
            <span class="generate-label">
              {{ store.isStreaming.value ? 'توقف تولید' : 'تولید مایندمپ' }}
            </span>
          </button>
          <button
            type="button"
            class="generate-caret"
            :class="{ 'is-open': generateMenuOpen }"
            title="حالت‌های تولید"
            aria-label="حالت‌های تولید"
            :aria-expanded="generateMenuOpen"
            @click="generateMenuOpen = !generateMenuOpen; exportMenuOpen = false"
          >
            <UiIcon name="chevron-down" :size="13" />
          </button>
        </div>
        <Transition name="menu-fade">
          <div v-if="generateMenuOpen" class="menu header-menu generate-menu">
            <div class="menu-label">دریافت داده از هوش مصنوعی</div>
            <button
              type="button"
              class="menu-item"
              :disabled="store.isStreaming.value"
              @click="generate('incremental')"
            >
              <UiIcon name="sparkles" :size="15" />
              <span>تولید تدریجی</span>
              <span class="menu-hint">شبیه‌سازی استریم</span>
            </button>
            <button
              type="button"
              class="menu-item"
              :disabled="store.isStreaming.value"
              @click="generate('full')"
            >
              <UiIcon name="branch" :size="15" />
              <span>نمایش درخت کامل</span>
              <span class="menu-hint">دریافت یک‌باره</span>
            </button>
            <div class="menu-separator"></div>
            <button type="button" class="menu-item is-danger" @click="clearMap">
              <UiIcon name="trash" :size="15" />
              <span>پاک‌کردن نقشه</span>
            </button>
          </div>
        </Transition>
      </div>

      <div class="menu-anchor" data-menu-root>
        <button
          type="button"
          class="icon-btn"
          :class="{ 'is-active': exportMenuOpen }"
          title="خروجی و چاپ"
          aria-label="خروجی و چاپ"
          :aria-expanded="exportMenuOpen"
          @click="exportMenuOpen = !exportMenuOpen; generateMenuOpen = false"
        >
          <UiIcon :name="exportBusy ? 'refresh' : 'download'" :size="17" :class="{ spin: exportBusy }" />
        </button>
        <Transition name="menu-fade">
          <div v-if="exportMenuOpen" class="menu header-menu export-menu">
            <div class="menu-label">خروجی مایندمپ</div>
            <button type="button" class="menu-item" @click="exportMindmap('json')">
              <UiIcon name="braces" :size="15" />
              <span>ساختار JSON</span>
              <span class="menu-hint">.json</span>
            </button>
            <button type="button" class="menu-item" @click="exportMindmap('svg')">
              <UiIcon name="branch" :size="15" />
              <span>گراف SVG</span>
              <span class="menu-hint">.svg</span>
            </button>
            <button type="button" class="menu-item" @click="exportMindmap('png')">
              <UiIcon name="image" :size="15" />
              <span>تصویر PNG</span>
              <span class="menu-hint">.png</span>
            </button>
            <div class="menu-separator"></div>
            <button type="button" class="menu-item" @click="exportMindmap('print')">
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

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  text-align: right;
  border-radius: 10px;
  padding: 3px 4px;
  flex: none;
  transition: background-color 160ms ease;
}

.brand:hover {
  background: var(--surface-hover);
}

.brand-mark {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 11px;
  color: var(--accent-text);
  background:
    linear-gradient(145deg, color-mix(in srgb, var(--accent) 88%, #ffffff 12%), var(--accent));
  box-shadow: 0 8px 18px -10px var(--accent);
}

.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}

.brand-text strong {
  font-size: 14.5px;
  font-weight: 750;
  letter-spacing: -0.01em;
}

.brand-text small {
  font-size: 10px;
  color: var(--text-faint);
  font-weight: 500;
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

.generate-group {
  display: inline-flex;
  align-items: stretch;
  height: 36px;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 6px 16px -10px color-mix(in srgb, var(--accent) 70%, transparent);
}

.generate-main {
  height: 36px;
  border-radius: 0;
  padding: 0 12px;
  font-size: 12.5px;
  box-shadow: none;
  gap: 6px;
}

.generate-caret {
  display: grid;
  place-items: center;
  width: 25px;
  color: var(--accent-text);
  background: var(--accent);
  border-inline-start: 1px solid color-mix(in srgb, #ffffff 24%, transparent);
  transition: background-color 150ms ease;
}

.generate-caret:hover {
  background: var(--accent-hover);
}

.generate-caret.is-open {
  background: var(--accent-hover);
}

.generate-group.is-streaming {
  box-shadow: none;
}

.generate-group.is-streaming .generate-caret {
  background: var(--danger-soft);
  color: var(--danger);
  border-inline-start-color: color-mix(in srgb, var(--danger) 20%, transparent);
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

.generate-menu {
  left: auto;
  right: 0;
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
  .brand-text small {
    display: none;
  }

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
    padding: 0;
  }

  .brand-text strong {
    font-size: 13.5px;
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

  .generate-label {
    max-width: 92px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .header-menu {
    position: fixed;
    top: calc(var(--header-height, 96px) + 6px);
    left: 10px;
    right: 10px;
    min-width: 0;
  }

  .generate-menu,
  .export-menu {
    right: 10px;
    left: 10px;
  }
}

@media (max-width: 480px) {
  .generate-label {
    display: none;
  }

  .generate-main {
    padding: 0 10px;
  }

  .header-actions {
    gap: 0;
  }
}
</style>
