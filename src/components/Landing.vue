<script setup>
import { ref, onMounted, nextTick } from 'vue'

const props = defineProps({
  errMsg: { type: String, default: '' },
  history: { type: Array, default: () => [] },
})
const emit = defineEmits(['submit', 'open-history'])

const input = ref('')
const inputEl = ref(null)

onMounted(() => nextTick(() => inputEl.value?.focus()))

function submit() {
  const v = input.value.trim()
  if (!v) return
  emit('submit', v)
}

function formatTime(value) {
  if (!value) return '未知时间'
  return new Date(value).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
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

      <div v-if="props.history.length" class="history-panel">
        <div class="history-title">历史分析</div>
        <button
          v-for="item in props.history"
          :key="item.uid"
          class="history-row"
          type="button"
          @click="emit('open-history', item)"
        >
          <span>
            <strong>{{ item.title }}</strong>
            <small>@{{ item.username || item.uid.slice(0, 8) }} · {{ item.matchCount }} 场</small>
          </span>
          <time>{{ formatTime(item.analyzedAt) }}</time>
        </button>
      </div>
    </div>
  </div>
</template>
