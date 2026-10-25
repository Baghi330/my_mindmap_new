<script setup>
import { computed, ref, watch } from 'vue'
import { useMindmapStore } from '../composables/useMindmapStore.js'
import { useToast } from '../composables/useToast.js'
import { askConfirm } from '../composables/useConfirm.js'
import {
  countDescendants,
  findNodeWithParent,
  getSiblingInfo,
} from '../core/tree.js'
import { toPersianDigits } from '../utils/text.js'
import SegmentedControl from './SegmentedControl.vue'
import UiIcon from './UiIcon.vue'

const store = useMindmapStore()
const toast = useToast()

const activeTab = ref('settings')
const noteDraft = ref('')
const noteFocused = ref(false)

const isOpen = computed(() => store.activePanel.value !== null)
const selectedNode = computed(() => store.selectedTreeNode.value)
const isRoot = computed(() => selectedNode.value?.id === store.tree.value.id)
const siblingInfo = computed(() =>
  selectedNode.value ? getSiblingInfo(store.tree.value, selectedNode.value.id) : null,
)
const childCount = computed(() => selectedNode.value?.children?.length || 0)
const descendantCount = computed(() =>
  selectedNode.value ? countDescendants(selectedNode.value) : 0,
)
const parentLabel = computed(() => {
  if (!selectedNode.value) return ''
  const located = findNodeWithParent(store.tree.value, selectedNode.value.id)
  return located?.parent?.label || '—'
})
const canMoveUp = computed(() => Boolean(siblingInfo.value && siblingInfo.value.index > 0))
const canMoveDown = computed(() =>
  Boolean(siblingInfo.value && siblingInfo.value.index < siblingInfo.value.count - 1),
)
const noteHasChanges = computed(
  () => noteDraft.value !== (selectedNode.value?.note || ''),
)

const themeOptions = [
  { value: 'light', label: 'روشن', icon: 'sun' },
  { value: 'dark', label: 'تاریک', icon: 'moon' },
  { value: 'system', label: 'سیستم', icon: 'monitor' },
]
const directionOptions = [
  { value: 'balanced', label: 'دوطرفه' },
  { value: 'rtl', label: 'راست‌به‌چپ' },
  { value: 'ltr', label: 'چپ‌به‌راست' },
]
const motionOptions = [
  { value: 'auto', label: 'خودکار' },
  { value: 'full', label: 'کامل' },
  { value: 'reduced', label: 'کاهش' },
]

const fontPercent = computed(() => Math.round(store.preferences.fontScale * 100))
const speedText = computed(() => {
  const value = store.preferences.growthSpeed
  const formatted = Number.isInteger(value)
    ? String(value)
    : value.toFixed(2).replace(/0$/, '').replace('.', '٫')
  return `${toPersianDigits(formatted)}×`
})

const savedAtText = computed(() => {
  if (store.savedAt.value) {
    try {
      const time = new Intl.DateTimeFormat('fa-IR', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(store.savedAt.value))
      return `آخرین ذخیره: ${toPersianDigits(time)}`
    } catch {
      return 'ذخیره شده است'
    }
  }
  if (!store.preferences.autoSave) return 'ذخیره خودکار خاموش است'
  return 'هنوز تغییری ذخیره نشده است'
})

watch(
  () => store.activePanel.value,
  (panel) => {
    if (panel) activeTab.value = panel
  },
  { immediate: true },
)

function syncNoteDraft() {
  if (noteFocused.value) return
  noteDraft.value = selectedNode.value?.note || ''
}

watch(
  () => [store.selectedId.value, store.activePanel.value].join('|'),
  () => {
    noteDraft.value = selectedNode.value?.note || ''
  },
  { immediate: true },
)

watch(
  () => selectedNode.value?.note,
  () => syncNoteDraft(),
)

function switchTab(tab) {
  activeTab.value = tab
  store.openPanel(tab)
}

function addChild() {
  if (!selectedNode.value) return
  store.addChild(selectedNode.value.id)
}

function addSibling() {
  if (!selectedNode.value) return
  store.addSibling(selectedNode.value.id)
}

function editLabel() {
  if (!selectedNode.value) return
  store.startEditing(selectedNode.value.id)
}

function toggleCollapse() {
  if (!selectedNode.value) return
  store.toggleCollapse(selectedNode.value.id)
}

function replayBranch() {
  if (!selectedNode.value) return
  store.replayBranch(selectedNode.value.id)
}

function focusNode() {
  if (!selectedNode.value) return
  store.focusNode(selectedNode.value.id)
}

function moveUp() {
  if (!selectedNode.value) return
  store.moveSibling(selectedNode.value.id, -1)
}

function moveDown() {
  if (!selectedNode.value) return
  store.moveSibling(selectedNode.value.id, 1)
}



async function removeNode() {
  if (!selectedNode.value) return
  await store.requestDeleteNode(selectedNode.value.id)
}

function saveNote() {
  if (!selectedNode.value) return
  const result = store.commitNote(selectedNode.value.id, noteDraft.value)
  if (result.ok) {
    noteDraft.value = selectedNode.value.note || ''
  }
}

function cancelNote() {
  noteDraft.value = selectedNode.value?.note || ''
  noteFocused.value = false
}

function setNoteFocused(value) {
  noteFocused.value = value
}

async function clearMap() {
  const confirmed = await askConfirm({
    title: 'پاک‌کردن نقشه',
    message: 'همه گره‌ها حذف می‌شوند و فقط گره مرکزی باقی می‌ماند. امکان بازگشت با Ctrl+Z وجود دارد.',
    confirmLabel: 'پاک کن',
    tone: 'danger',
  })
  if (confirmed) store.clearMap()
}



function saveNow() {
  const saved = store.saveDocumentNow(true)
  if (!saved) toast.error('ذخیره‌سازی ناموفق بود.')
}
</script>

<template>
  <div>
    <Transition name="panel-scrim">
      <div
        v-if="isOpen"
        class="panel-scrim"
        aria-hidden="true"
        @click="store.closePanel()"
      ></div>
    </Transition>

    <Transition name="panel-slide">
      <aside v-if="isOpen" class="side-panel" aria-label="پنل تنظیمات و گره">
        <div class="panel-head">
          <div class="panel-tabs" role="tablist" aria-label="بخش‌های پنل">
            <button
              type="button"
              class="panel-tab"
              role="tab"
              :aria-selected="activeTab === 'settings'"
              :class="{ 'is-active': activeTab === 'settings' }"
              @click="switchTab('settings')"
            >
              <UiIcon name="sliders" :size="14" />
              تنظیمات
            </button>
            <button
              type="button"
              class="panel-tab"
              role="tab"
              :aria-selected="activeTab === 'node'"
              :class="{ 'is-active': activeTab === 'node' }"
              @click="switchTab('node')"
            >
              <UiIcon name="branch" :size="14" />
              گره
            </button>
          </div>
          <button
            type="button"
            class="icon-btn panel-close"
            title="بستن پنل"
            aria-label="بستن پنل"
            @click="store.closePanel()"
          >
            <UiIcon name="close" :size="16" />
          </button>
        </div>

        <div class="panel-body">
          <!-- ------------------------------------------------- تنظیمات -->
          <template v-if="activeTab === 'settings'">
            <section class="panel-section">
              <h3 class="section-title">ظاهر</h3>
              <div class="panel-field">
                <span class="field-label">تم</span>
                <SegmentedControl
                  :model-value="store.preferences.theme"
                  :options="themeOptions"
                  aria-label="انتخاب تم"
                  @update:model-value="store.setThemeMode"
                />
              </div>
              <div class="panel-field">
                <span class="field-label">
                  جهت چیدمان
                  <span class="field-value">
                    {{ directionOptions.find((item) => item.value === store.preferences.direction)?.label }}
                  </span>
                </span>
                <SegmentedControl
                  :model-value="store.preferences.direction"
                  :options="directionOptions"
                  aria-label="جهت چیدمان درخت"
                  @update:model-value="store.setDirection"
                />
              </div>
              <div class="panel-field">
                <span class="field-label">
                  اندازهٔ متن
                  <span class="field-value">{{ toPersianDigits(fontPercent) }}٪</span>
                </span>
                <div class="font-stepper">
                  <button
                    type="button"
                    class="icon-btn"
                    aria-label="کوچک‌تر کردن متن"
                    @click="store.changeFontScale(-0.05)"
                  >
                    <UiIcon name="minus" :size="15" />
                  </button>
                  <div
                    class="font-preview"
                    :style="{ fontSize: `${Math.round(14 * store.preferences.fontScale)}px` }"
                  >
                    متن فارسی و English ۱۲۳
                  </div>
                  <button
                    type="button"
                    class="icon-btn"
                    aria-label="بزرگ‌تر کردن متن"
                    @click="store.changeFontScale(0.05)"
                  >
                    <UiIcon name="plus" :size="15" />
                  </button>
                </div>
              </div>
            </section>

            <section class="panel-section">
              <h3 class="section-title">پخش رشد درخت</h3>
              <div class="panel-field">
                <span class="field-label">
                  سرعت نمایش
                  <span class="field-value">{{ speedText }}</span>
                </span>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.25"
                  :value="store.preferences.growthSpeed"
                  aria-label="سرعت نمایش رشد"
                  @input="store.setGrowthSpeed(Number($event.target.value))"
                />
                <div class="range-labels">
                  <span>آرام</span>
                  <span>سریع</span>
                </div>
              </div>
              <div class="panel-field">
                <span class="field-label">
                  انیمیشن
                  <span class="field-value">
                    {{ store.isMotionReduced.value ? 'کاهش‌یافته' : 'فعال' }}
                  </span>
                </span>
                <SegmentedControl
                  :model-value="store.preferences.motion"
                  :options="motionOptions"
                  aria-label="تنظیم انیمیشن"
                  @update:model-value="store.setMotionPreference"
                />
                <p class="field-hint">
                  در حالت «خودکار»، تنظیم کاهش حرکت سیستم‌عامل رعایت می‌شود.
                </p>
              </div>
              <div class="button-row">
                <button type="button" class="btn btn-outline btn-sm" @click="store.replayAnimation()">
                  <UiIcon name="replay" :size="14" />
                  پخش مجدد
                </button>
                <button type="button" class="btn btn-outline btn-sm" @click="store.skipAnimation()">
                  <UiIcon name="skip" :size="14" />
                  نمایش کامل
                </button>
              </div>
            </section>

            <section class="panel-section">
              <h3 class="section-title">داده و ذخیره‌سازی</h3>
              <div class="panel-field">
                <div class="switch-row">
                  <div>
                    <span class="field-label field-label-inline">ذخیره خودکار در مرورگر</span>
                    <span class="field-hint">{{ savedAtText }}</span>
                  </div>
                  <button
                    type="button"
                    class="switch"
                    role="switch"
                    :aria-checked="store.preferences.autoSave"
                    :title="store.preferences.autoSave ? 'خاموش کردن ذخیره خودکار' : 'روشن کردن ذخیره خودکار'"
                    @click="store.toggleAutoSave()"
                  ></button>
                </div>
              </div>
              <div class="button-row">
                <button type="button" class="btn btn-outline btn-sm" @click="saveNow">
                  <UiIcon name="cloud" :size="14" />
                  ذخیره همین حالا
                </button>
                <div class="btn-group">
                  <button
                    type="button"
                    class="btn btn-outline btn-sm"
                    :disabled="!store.canUndo.value"
                    title="بازگشت"
                    @click="store.undo()"
                  >
                    <UiIcon name="undo" :size="14" />
                  </button>
                  <button
                    type="button"
                    class="btn btn-outline btn-sm"
                    :disabled="!store.canRedo.value"
                    title="تکرار"
                    @click="store.redo()"
                  >
                    <UiIcon name="redo" :size="14" />
                  </button>
                </div>
              </div>
              <div class="panel-field">
                <span class="field-label">مدیریت نقشه</span>
                <div class="button-column">
                  <button type="button" class="btn btn-danger" @click="clearMap">
                    <UiIcon name="trash" :size="15" />
                    پاک‌کردن نقشه
                  </button>
                </div>
              </div>
              <p class="field-hint">
                داده‌ها فقط در همین مرورگر ذخیره می‌شوند؛ هیچ ارسالی به سرور انجام نمی‌شود.
              </p>
            </section>

            <section class="panel-section">
              <h3 class="section-title">
                <span>میان‌برهای صفحه‌کلید</span>
                <UiIcon name="keyboard" :size="14" />
              </h3>
              <ul class="shortcut-list">
                <li><span>افزودن فرزند</span><kbd>Tab</kbd></li>
                <li><span>افزودن همسایه</span><kbd>Shift + Enter</kbd></li>
                <li><span>ویرایش عنوان</span><kbd>Enter</kbd></li>
                <li><span>حذف گره</span><kbd>Delete</kbd></li>
                <li><span>توقف / ادامه رشد</span><kbd>Space</kbd></li>
                <li><span>بازگشت / تکرار</span><kbd>Ctrl + Z</kbd></li>
                <li><span>جست‌وجو</span><kbd>Ctrl + F</kbd></li>
                <li><span>نمایش کل درخت</span><kbd>Ctrl + 0</kbd></li>
                <li><span>ذخیره</span><kbd>Ctrl + S</kbd></li>
              </ul>
            </section>

            <footer class="panel-footer">
              <span>ذهن‌نگار · نسخهٔ ۱٫۰</span>
              <span>مایندمپ پژوهشی با رشد تدریجی</span>
            </footer>
          </template>

          <!-- ------------------------------------------------- گره -->
          <template v-else>
            <template v-if="selectedNode">
              <section class="node-summary">
                <span
                  class="node-branch-dot"
                  :style="{
                    background:
                      selectedNode.id === store.tree.value.id
                        ? 'var(--accent)'
                        : `var(--branch-${
                            (store.layout.value.nodeMap.get(selectedNode.id)?.branchIndex ?? 0) + 1
                          })`,
                  }"
                ></span>
                <div class="node-summary-text">
                  <strong>{{ selectedNode.label }}</strong>
                  <span>
                    {{ isRoot ? 'گره مرکزی' : `${toPersianDigits(descendantCount)} زیرشاخه` }}
                  </span>
                </div>
                <button
                  type="button"
                  class="icon-btn"
                  title="ویرایش عنوان"
                  aria-label="ویرایش عنوان"
                  @click="editLabel"
                >
                  <UiIcon name="pencil" :size="15" />
                </button>
              </section>

              <section class="panel-section">
                <h3 class="section-title">عملیات گره</h3>
                <div class="action-grid">
                  <button type="button" class="action-tile" @click="addChild">
                    <UiIcon name="plus" :size="16" />
                    <span>افزودن فرزند</span>
                    <kbd>Tab</kbd>
                  </button>
                  <button
                    type="button"
                    class="action-tile"
                    :disabled="isRoot"
                    @click="addSibling"
                  >
                    <UiIcon name="branch" :size="16" />
                    <span>افزودن همسایه</span>
                    <kbd>⇧Enter</kbd>
                  </button>
                  <button type="button" class="action-tile" @click="editLabel">
                    <UiIcon name="pencil" :size="16" />
                    <span>ویرایش عنوان</span>
                    <kbd>Enter</kbd>
                  </button>
                  <button type="button" class="action-tile" @click="focusNode">
                    <UiIcon name="target" :size="16" />
                    <span>تمرکز روی گره</span>
                  </button>
                  <button
                    type="button"
                    class="action-tile"
                    :disabled="childCount === 0"
                    @click="toggleCollapse"
                  >
                    <UiIcon :name="selectedNode.collapsed ? 'plus' : 'minus'" :size="16" />
                    <span>{{ selectedNode.collapsed ? 'باز کردن شاخه' : 'بستن شاخه' }}</span>
                  </button>
                  <button type="button" class="action-tile" @click="replayBranch">
                    <UiIcon name="replay" :size="16" />
                    <span>پخش رشد شاخه</span>
                  </button>
                  <button
                    type="button"
                    class="action-tile"
                    :disabled="!canMoveUp"
                    @click="moveUp"
                  >
                    <UiIcon name="arrow-up" :size="16" />
                    <span>جابه‌جایی بالا</span>
                  </button>
                  <button
                    type="button"
                    class="action-tile"
                    :disabled="!canMoveDown"
                    @click="moveDown"
                  >
                    <UiIcon name="arrow-down" :size="16" />
                    <span>جابه‌جایی پایین</span>
                  </button>

                </div>
                <button
                  type="button"
                  class="btn btn-danger delete-button"
                  :disabled="isRoot"
                  @click="removeNode"
                >
                  <UiIcon name="trash" :size="15" />
                  حذف گره {{ descendantCount > 0 ? 'و زیرشاخه‌ها' : '' }}
                </button>
              </section>

              <section class="panel-section">
                <h3 class="section-title">
                  <span>یادداشت گره</span>
                  <span v-if="noteHasChanges" class="unsaved-dot" title="تغییر ذخیره‌نشده"></span>
                </h3>
                <textarea
                  v-model="noteDraft"
                  class="input note-input"
                  rows="5"
                  maxlength="6000"
                  placeholder="یادداشت، منبع یا نکته‌ای برای این شاخه…"
                  aria-label="یادداشت گره"
                  @focus="setNoteFocused(true)"
                  @blur="setNoteFocused(false)"
                ></textarea>
                <div class="button-row note-actions">
                  <button
                    type="button"
                    class="btn btn-primary btn-sm"
                    :disabled="!noteHasChanges"
                    @click="saveNote"
                  >
                    <UiIcon name="check" :size="14" />
                    ذخیرهٔ یادداشت
                  </button>
                  <button
                    type="button"
                    class="btn btn-ghost btn-sm"
                    :disabled="!noteHasChanges"
                    @click="cancelNote"
                  >
                    انصراف
                  </button>
                </div>
              </section>

              <section class="panel-section">
                <h3 class="section-title">جزئیات</h3>
                <dl class="detail-list">
                  <div>
                    <dt>والد</dt>
                    <dd>{{ parentLabel }}</dd>
                  </div>
                  <div>
                    <dt>فرزندان مستقیم</dt>
                    <dd>{{ toPersianDigits(childCount) }}</dd>
                  </div>
                  <div>
                    <dt>کل زیرشاخه‌ها</dt>
                    <dd>{{ toPersianDigits(descendantCount) }}</dd>
                  </div>
                  <div>
                    <dt>شناسه</dt>
                    <dd class="mono">{{ selectedNode.id }}</dd>
                  </div>
                </dl>
                <p class="field-hint">
                  برای جابه‌جایی سریع، گره را با موس روی گره مقصد بکشید. برای دیدن منوی
                  عملیات، روی گره راست‌کلیک کنید.
                </p>
              </section>
            </template>
            <div v-else class="panel-empty">
              <UiIcon name="branch" :size="26" />
              <p>گرهی انتخاب نشده است.</p>
              <span>روی یکی از گره‌های بوم کلیک کنید.</span>
            </div>
          </template>
        </div>
      </aside>
    </Transition>
  </div>
</template>

<style scoped>
.panel-scrim {
  display: none;
}

.side-panel {
  position: fixed;
  z-index: 46;
  top: var(--header-height, 64px);
  left: 0;
  bottom: 0;
  width: 348px;
  display: flex;
  flex-direction: column;
  background: var(--panel-bg);
  border-inline-end: 1px solid var(--border);
  box-shadow: 24px 0 60px -50px var(--shadow);
  backdrop-filter: blur(22px);
}

.panel-head {
  flex: none;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
}

.panel-tabs {
  display: flex;
  gap: 3px;
  padding: 3px;
  border-radius: 9px;
  background: var(--surface-muted);
  flex: 1;
}

.panel-tab {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 29px;
  border-radius: 7px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-muted);
  transition:
    background-color 160ms ease,
    color 160ms ease;
}

.panel-tab.is-active {
  background: var(--surface);
  color: var(--accent);
  box-shadow: 0 1px 4px rgba(20, 30, 50, 0.09);
}

.panel-close {
  width: 30px;
  height: 30px;
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 14px;
}

.panel-section {
  padding: 0 0 16px;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.panel-section:last-of-type {
  border-bottom: 0;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 11px;
  font-size: 11.5px;
  font-weight: 700;
  color: var(--text);
}

.panel-field {
  margin-bottom: 13px;
}

.panel-field:last-child {
  margin-bottom: 0;
}

.field-value {
  font-size: 10.5px;
  font-weight: 500;
  color: var(--text-faint);
}

.field-label-inline {
  margin-bottom: 2px;
}

.font-stepper {
  display: flex;
  align-items: stretch;
  gap: 5px;
  padding: 4px;
  border: 1px solid var(--border);
  border-radius: 11px;
  background: var(--surface-muted);
}

.font-stepper .icon-btn {
  width: 30px;
  height: 30px;
  flex: none;
  background: var(--surface);
}

.font-preview {
  flex: 1;
  display: grid;
  place-items: center;
  padding: 4px 6px;
  border-radius: 7px;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.range-labels {
  display: flex;
  justify-content: space-between;
  font-size: 9.5px;
  color: var(--text-faint);
  margin-top: 2px;
}

.button-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.button-row.note-actions {
  margin-top: 8px;
}

.button-column {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.button-column .btn {
  justify-content: flex-start;
}

.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.switch-row .field-hint {
  display: block;
  margin-top: 2px;
}

.shortcut-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.shortcut-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 11.5px;
  color: var(--text-muted);
  padding: 4px 6px;
  border-radius: 6px;
}

.shortcut-list li:hover {
  background: var(--surface-muted);
}

kbd {
  font-family: inherit;
  font-size: 9.5px;
  padding: 1px 5px;
  border-radius: 4px;
  border: 1px solid var(--border-strong);
  background: var(--surface);
  color: var(--text-faint);
  direction: ltr;
}

.panel-footer {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 4px 2px 10px;
  font-size: 10px;
  color: var(--text-faint);
}

.node-summary {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 10px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--surface);
  margin-bottom: 16px;
}

.node-branch-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex: none;
  box-shadow: 0 0 0 3px color-mix(in srgb, currentColor 8%, transparent);
}

.node-summary-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.node-summary-text strong {
  font-size: 12.5px;
  font-weight: 650;
  line-height: 1.5;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  word-break: break-word;
}

.node-summary-text span {
  font-size: 10px;
  color: var(--text-faint);
}

.action-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.action-tile {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
  padding: 9px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--surface-muted);
  color: var(--text-muted);
  font-size: 10.8px;
  font-weight: 600;
  text-align: right;
  position: relative;
  min-height: 62px;
  transition:
    border-color 150ms ease,
    background-color 150ms ease,
    color 150ms ease;
}

.action-tile:hover:not(:disabled) {
  background: var(--surface);
  border-color: color-mix(in srgb, var(--accent) 34%, var(--border));
  color: var(--accent);
}

.action-tile kbd {
  position: absolute;
  bottom: 6px;
  left: 7px;
  font-size: 8px;
  opacity: 0.7;
}

.delete-button {
  width: 100%;
  margin-top: 9px;
  height: 33px;
  font-size: 11.5px;
}

.note-input {
  font-size: 12px;
  min-height: 96px;
}

.unsaved-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--warning);
}

.detail-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0 0 10px;
}

.detail-list > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 11px;
}

.detail-list dt {
  color: var(--text-faint);
}

.detail-list dd {
  margin: 0;
  color: var(--text-muted);
  font-weight: 600;
  max-width: 60%;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-list dd.mono {
  direction: ltr;
  font-family: 'DejaVu Sans Mono', monospace;
  font-size: 9.5px;
  font-weight: 400;
  color: var(--text-faint);
}

.panel-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 40px 14px;
  color: var(--text-faint);
  text-align: center;
}

.panel-empty p {
  margin: 6px 0 0;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-muted);
}

.panel-empty span {
  font-size: 11px;
}

.panel-slide-enter-active,
.panel-slide-leave-active {
  transition:
    transform 280ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 220ms ease;
}

.panel-slide-enter-from,
.panel-slide-leave-to {
  transform: translateX(-104%);
  opacity: 0.6;
}

.panel-scrim-enter-active,
.panel-scrim-leave-active {
  transition: opacity 200ms ease;
}

.panel-scrim-enter-from,
.panel-scrim-leave-to {
  opacity: 0;
}

@media (max-width: 860px) {
  .panel-scrim {
    display: block;
    position: fixed;
    inset: var(--header-height, 64px) 0 0;
    z-index: 45;
    background: color-mix(in srgb, #0b0f16 38%, transparent);
    backdrop-filter: blur(3px);
  }

  .side-panel {
    width: min(360px, 92vw);
    z-index: 46;
  }
}

@media (max-width: 480px) {
  .side-panel {
    width: 100%;
  }
}
</style>
