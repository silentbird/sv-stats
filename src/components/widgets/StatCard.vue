<script setup>
defineProps({
  title: { type: String, required: true },
  value: { type: [String, Number], default: '' },
  unit: { type: String, default: '' },
  label: { type: String, default: '' },
  color: { type: String, default: 'accent' },
})
</script>

<template>
  <div class="card stat-big">
    <h3>{{ title }}</h3>
    <div class="value" :class="color">
      <slot>{{ value }}</slot><span v-if="unit" class="unit">{{ unit }}</span>
    </div>
    <div v-if="label" class="label">
      <slot name="label">{{ label }}</slot>
    </div>
  </div>
</template>
