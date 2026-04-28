<script setup>
defineProps({
  message: { type: String, default: '正在加载数据...' },
})
</script>

<template>
  <div class="loading">
    <div class="spinner"></div>
    <p>{{ message }}</p>
  </div>
</template>
