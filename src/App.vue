<script setup>
import { ref } from 'vue'
import { fetchJSON, fetchAllMatches } from './api.js'
import { extractUID, analyzeMatches } from './analysis.js'
import Landing from './components/Landing.vue'
import Loading from './components/Loading.vue'
import Report from './components/Report.vue'

const state = ref('landing')
const loadingMsg = ref('正在加载数据...')
const errMsg = ref('')
const profile = ref(null)
const stats = ref(null)
const analysis = ref(null)

async function runAnalysis(input) {
  errMsg.value = ''
  const uid = extractUID(input)
  if (!uid) {
    errMsg.value = '无法从输入中提取用户 ID，请确认链接或 UUID 格式正确'
    return
  }

  state.value = 'loading'
  loadingMsg.value = '正在加载用户信息...'

  try {
    const [profResp, statsResp, matches] = await Promise.all([
      fetchJSON(`/api/users/${uid}`),
      fetchJSON(`/api/users/${uid}/stats`),
      fetchAllMatches(uid, msg => { loadingMsg.value = msg }),
    ])
    loadingMsg.value = '正在生成分析报告...'
    profile.value = profResp.data
    stats.value = statsResp.data
    analysis.value = analyzeMatches(matches, uid)
    state.value = 'content'
  } catch (e) {
    state.value = 'landing'
    errMsg.value = '加载失败: ' + e.message
  }
}

function reanalyze() {
  state.value = 'landing'
}
</script>

<template>
  <Landing v-if="state === 'landing'" :err-msg="errMsg" @submit="runAnalysis" />
  <Loading v-else-if="state === 'loading'" :message="loadingMsg" />
  <Report
    v-else
    :profile="profile"
    :stats="stats"
    :analysis="analysis"
    @reanalyze="reanalyze"
  />
</template>
