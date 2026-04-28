<script setup>
import { computed } from 'vue'

const props = defineProps({
  label: { type: String, required: true },
  display: { type: String, required: true },
  cls: { type: String, default: 'bar-accent' },
  width: { type: Number, default: null },
})

const w = computed(() => {
  const raw = props.width !== null ? props.width : parseFloat(props.display)
  return Math.min(100, Math.max(0, raw || 0))
})
</script>

<template>
  <div class="bar-wrap">
    <div class="bar-label">
      <span>{{ label }}</span>
      <span>{{ display }}</span>
    </div>
    <div class="bar-track">
      <div class="bar-fill" :class="cls" :style="{ width: w + '%' }"></div>
    </div>
  </div>
</template>
