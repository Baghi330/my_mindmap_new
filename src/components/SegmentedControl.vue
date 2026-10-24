<script setup>
import UiIcon from './UiIcon.vue'

defineProps({
  modelValue: { type: String, required: true },
  options: { type: Array, required: true },
  ariaLabel: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <div class="segmented" role="group" :aria-label="ariaLabel">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      :aria-pressed="modelValue === option.value"
      :title="option.title || option.label"
      @click="emit('update:modelValue', option.value)"
    >
      <UiIcon v-if="option.icon" :name="option.icon" :size="14" />
      <span>{{ option.label }}</span>
    </button>
  </div>
</template>
