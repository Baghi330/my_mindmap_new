<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useGrowthEngine } from '../composables/useGrowthEngine.js'

const props = defineProps({
  edge: { type: Object, required: true },
  color: { type: String, required: true },
})

const growthEngine = useGrowthEngine()
const pathElement = ref(null)

onMounted(() => {
  growthEngine.registerEdgeElement(props.edge.id, pathElement.value)
})

onBeforeUnmount(() => {
  growthEngine.registerEdgeElement(props.edge.id, null)
})
</script>

<template>
  <path
    ref="pathElement"
    class="mindmap-edge"
    pathLength="1"
    :d="edge.path"
    fill="none"
    :stroke="color"
    :stroke-width="edge.depth === 1 ? 2.1 : 1.5"
    :stroke-opacity="edge.depth === 1 ? 0.6 : 0.34"
    stroke-linecap="round"
    stroke-dashoffset="1"
    opacity="0"
  />
</template>

<style scoped>
.mindmap-edge {
  stroke-dasharray: 1;
  pointer-events: none;
}
</style>
