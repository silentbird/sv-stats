<script setup>
import { ref, onMounted, nextTick } from 'vue'

const props = defineProps({
  errMsg: { type: String, default: '' },
})
const emit = defineEmits(['submit'])

const input = ref('')
const inputEl = ref(null)

onMounted(() => nextTick(() => inputEl.value?.focus()))

function submit() {
  const v = input.value.trim()
  if (!v) return
  emit('submit', v)
}
</script>

<template>
  <div class="landing">
    <div class="landing-box">
      <h1>🎾 Swing Vision</h1>
      <p>输入你的 Swing Vision 用户链接或 UUID<br>自动分析全部比赛数据</p>
      <div class="input-row">
        <input
          ref="inputEl"
          v-model="input"
          type="text"
          placeholder="https://app.swing.tennis/... 或直接输入 UUID"
          @keydown.enter="submit"
        />
        <button class="btn-primary" @click="submit">分析</button>
      </div>
      <div class="err">{{ errMsg }}</div>
    </div>
  </div>
</template>
