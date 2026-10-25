<script setup>
import { computed } from "vue";
import { useGrowthEngine } from "../composables/useGrowthEngine.js";
import { useMindmapStore } from "../composables/useMindmapStore.js";
import { toPersianDigits } from "../utils/text.js";

const store = useMindmapStore();
const growthEngine = useGrowthEngine();

const total = computed(() => growthEngine.totalCount.value);
const drawn = computed(() => growthEngine.drawnCount.value);
const isPlaying = computed(() => growthEngine.isPlaying.value);
const isComplete = computed(() => growthEngine.isComplete.value);
const isStreaming = computed(() => store.isStreaming.value);
const visible = computed(() => store.nodeCount.value > 1 || isStreaming.value);
const percent = computed(() => {
  if (total.value === 0) return 100;
  return Math.round((drawn.value / total.value) * 100);
});

const statusText = computed(() => {
  if (isStreaming.value) {
    if (isPlaying.value) return "هوش مصنوعی در حال نوشتن مایندمپ است";
    return "داده دریافت شد؛ نمایش متوقف است";
  }
  if (!isComplete.value) return "رشد شاخه‌ها در جریان است";
  return "مایندمپ کامل شد";
});

const countText = computed(
  () =>
    `${toPersianDigits(drawn.value)} از ${toPersianDigits(total.value)} گره`,
);
</script>

<template>
  <Transition name="growth-bar">
    <div v-if="visible" class="growth-bar" role="status" aria-live="polite">
      <div class="growth-info">
        <div class="growth-status">
          <span class="status-text">{{ statusText }}</span>
          <span
            v-if="isStreaming && isPlaying"
            class="typing-dots"
            aria-hidden="true"
          >
            <i></i><i></i><i></i>
          </span>
          <span class="growth-count">{{ countText }}</span>
        </div>
        <div class="growth-track">
          <span class="growth-fill" :style="{ width: `${percent}%` }"></span>
          <span v-if="isPlaying || isStreaming" class="growth-shimmer"></span>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.growth-bar {
  position: fixed;
  z-index: 45;
  left: 50%;
  bottom: 18px;
  transform: translateX(-50%);
  width: min(540px, calc(100vw - 180px));
  min-height: 56px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 15px;
  border: 1px solid var(--border);
  background: var(--panel-bg);
  box-shadow: 0 20px 50px -26px var(--shadow);
  backdrop-filter: blur(20px);
}

.growth-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.growth-status {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}

.status-text {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.growth-count {
  margin-inline-start: auto;
  flex: none;
  font-size: 10px;
  color: var(--text-faint);
  white-space: nowrap;
}

.typing-dots {
  display: inline-flex;
  gap: 2px;
  align-items: center;
  flex: none;
  color: var(--accent);
}

.typing-dots i {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: currentColor;
  animation: dot-wave 1.1s ease-in-out infinite;
}

.typing-dots i:nth-child(2) {
  animation-delay: 0.14s;
}

.typing-dots i:nth-child(3) {
  animation-delay: 0.28s;
}

.growth-track {
  position: relative;
  height: 4px;
  border-radius: 4px;
  background: var(--surface-muted);
  overflow: hidden;
}

.growth-fill {
  position: absolute;
  inset-block: 0;
  right: 0;
  border-radius: 4px;
  background: var(--accent);
  transition: width 260ms ease;
  z-index: 1;
}

.growth-shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent,
    color-mix(in srgb, var(--accent) 28%, transparent),
    transparent
  );
  animation: growth-shimmer 2s linear infinite;
  z-index: 2;
}

@keyframes growth-shimmer {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(100%);
  }
}

.growth-bar-enter-active,
.growth-bar-leave-active {
  transition:
    opacity 220ms ease,
    transform 220ms ease;
}

.growth-bar-enter-from,
.growth-bar-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(10px);
}

@media (max-width: 720px) {
  .growth-bar {
    width: calc(100vw - 20px);
    bottom: 10px;
    padding: 7px 8px;
    gap: 8px;
    min-height: 52px;
  }

  .growth-count {
    display: none;
  }

  .status-text {
    font-size: 11px;
  }
}
</style>
