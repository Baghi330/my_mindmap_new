<script setup>
import { computed } from 'vue'

const props = defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 18 },
  strokeWidth: { type: [Number, String], default: 1.7 },
})

const iconPaths = {
  logo: `
    <circle cx="6" cy="6" r="2.2" />
    <circle cx="18" cy="6" r="2.2" />
    <circle cx="12" cy="18" r="2.4" />
    <path d="M8.2 6h7.6M7.1 8l3.7 7.9M16.9 8l-3.7 7.9" />
  `,
  search: `<circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" />`,
  undo: `<path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />`,
  redo: `<path d="m15 14 5-5-5-5" /><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />`,
  plus: `<path d="M12 5v14M5 12h14" />`,
  minus: `<path d="M5 12h14" />`,
  fit: `<path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" />`,
  sun: `<circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />`,
  moon: `<path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z" />`,
  monitor: `<rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" />`,
  sliders: `<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h13M20 18h0" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="19" cy="18" r="2" />`,
  download: `<path d="M12 3v12M7.5 10.5 12 15l4.5-4.5" /><path d="M4 17v2.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V17" />`,
  sparkles: `<path d="M12 3.5l1.5 4.2L17.7 9.2l-4.2 1.5L12 14.9l-1.5-4.2L6.3 9.2l4.2-1.5L12 3.5Z" /><path d="M18.5 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" /><path d="M5 15l.6 1.6L7.2 17l-1.6.6L5 19.2l-.6-1.6L2.8 17l1.6-.4L5 15Z" />`,
  play: `<path d="M8 5.8v12.4a.6.6 0 0 0 .9.5l10-6.2a.6.6 0 0 0 0-1L8.9 5.3a.6.6 0 0 0-.9.5Z" fill="currentColor" stroke="none" />`,
  pause: `<rect x="7" y="5" width="3.4" height="14" rx="1" fill="currentColor" stroke="none" /><rect x="13.6" y="5" width="3.4" height="14" rx="1" fill="currentColor" stroke="none" />`,
  replay: `<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" /><path d="M3.5 4.5V10h5.5" />`,
  skip: `<path d="M5 5.8v12.4a.6.6 0 0 0 .9.5l9-6.2a.6.6 0 0 0 0-1l-9-6.2a.6.6 0 0 0-.9.5Z" fill="currentColor" stroke="none" /><path d="M18.5 5v14" stroke-width="2.2" />`,
  'chevron-down': `<path d="m6 9 6 6 6-6" />`,
  'chevron-up': `<path d="m6 15 6-6 6 6" />`,
  'chevron-left': `<path d="m15 6-6 6 6 6" />`,
  'chevron-right': `<path d="m9 6 6 6-6 6" />`,
  close: `<path d="M6 6l12 12M18 6 6 18" />`,
  trash: `<path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 12.2A1.8 1.8 0 0 0 8.8 21h6.4a1.8 1.8 0 0 0 1.8-1.8L18 7M10 11v6M14 11v6" />`,
  pencil: `<path d="m4 20 4.5-1 10.2-10.2a2.1 2.1 0 0 0 0-3L17.2 4.3a2.1 2.1 0 0 0-3 0L4 14.5 3 19l1 1Z" /><path d="m13.5 5 5.5 5.5" />`,
  note: `<path d="M14 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V8l-5-5Z" /><path d="M14 3v5h5M8.5 13h7M8.5 17h4.5" />`,
  check: `<path d="m5 12.5 4.5 4.5L19 7.5" />`,
  'check-circle': `<circle cx="12" cy="12" r="9" /><path d="m8 12.2 2.8 2.8L16.4 9" />`,
  branch: `<circle cx="6" cy="5" r="2" /><circle cx="6" cy="19" r="2" /><circle cx="18" cy="7" r="2" /><path d="M6 7v10M18 9c0 4-4 4-6 4H6" />`,
  'arrow-up': `<path d="M12 20V5M6.5 10.5 12 5l5.5 5.5" />`,
  'arrow-down': `<path d="M12 4v15M6.5 13.5 12 19l5.5-5.5" />`,
  target: `<circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" />`,
  more: `<circle cx="5" cy="12" r="1.3" fill="currentColor" /><circle cx="12" cy="12" r="1.3" fill="currentColor" /><circle cx="19" cy="12" r="1.3" fill="currentColor" />`,
  braces: `<path d="M9 4H8a2 2 0 0 0-2 2v4a2 2 0 0 1-2 2 2 2 0 0 1 2 2v4a2 2 0 0 0 2 2h1M15 4h1a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2 2 2 0 0 0-2 2v4a2 2 0 0 1-2 2h-1" />`,
  image: `<rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="m4.5 18 4.7-5 3.4 3.5 2.3-2.5 4.6 5" />`,
  printer: `<path d="M7 8V4h10v4M7 18H5.5A1.5 1.5 0 0 1 4 16.5v-6A1.5 1.5 0 0 1 5.5 9h13A1.5 1.5 0 0 1 20 10.5v6a1.5 1.5 0 0 1-1.5 1.5H17" /><rect x="7" y="14" width="10" height="7" rx="1" /><path d="M17 12h.01" />`,
  alert: `<path d="M10.3 4.3 2.8 18a1.8 1.8 0 0 0 1.6 2.7h15.2a1.8 1.8 0 0 0 1.6-2.7L13.7 4.3a1.9 1.9 0 0 0-3.4 0Z" /><path d="M12 9v4.5M12 17.5h.01" />`,
  info: `<circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" />`,
  stop: `<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none" />`,
  menu: `<path d="M4 7h16M4 12h16M4 17h16" />`,
  keyboard: `<rect x="3" y="6" width="18" height="12" rx="2" /><path d="M7 10h.01M10.5 10h.01M14 10h.01M17.5 10h.01M8 14h8" />`,
  clock: `<circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />`,
  folder: `<path d="M3.5 7A1.5 1.5 0 0 1 5 5.5h4l2 2h8A1.5 1.5 0 0 1 20.5 9v9A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18V7Z" />`,
  eye: `<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3" />`,
  'zoom-in': `<circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2M11 8.5v5M8.5 11h5" />`,
  'zoom-out': `<circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2M8.5 11h5" />`,
  refresh: `<path d="M20 11a8 8 0 0 0-14.9-4M4 13a8 8 0 0 0 14.9 4" /><path d="M20 4v7h-7M4 20v-7h7" />`,
  cloud: `<path d="M7 18a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 8.5a4.2 4.2 0 0 1 .4 8.4" /><path d="m9 14 2 2 4-4" />`,
  'panel-left': `<rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" />`,
}

const inner = computed(() => iconPaths[props.name] || iconPaths.info)
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    v-html="inner"
  />
</template>
