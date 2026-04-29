<script setup>
import { onMounted, ref } from 'vue'
import { fetchJSON, fetchAllMatches } from './api.js'
import { extractUID, analyzeMatches } from './analysis.js'
import Landing from './components/Landing.vue'
import Loading from './components/Loading.vue'
import Report from './components/Report.vue'

const HISTORY_KEY = 'sv-stats.analysis-history.v1'

const state = ref('landing')
const loadingMsg = ref('正在加载数据...')
const errMsg = ref('')
const profile = ref(null)
const stats = ref(null)
const analysis = ref(null)
const history = ref([])
const currentUid = ref('')
const analyzedAt = ref('')
const fromHistory = ref(false)

onMounted(loadHistory)

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    const rows = raw ? JSON.parse(raw) : []
    history.value = Array.isArray(rows)
      ? rows
        .filter(row => row.uid && row.profile && row.stats && row.analysis)
        .map(row => ({
          ...row,
          title: row.title || historyTitle(row.profile),
          username: row.username || row.profile?.username || '',
          matchCount: row.matchCount || row.profile?.match_count || 0,
          analyzedAt: row.analyzedAt || new Date().toISOString(),
        }))
      : []
  } catch {
    history.value = []
  }
}

function saveHistory() {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.value.slice(0, 12)))
  } catch {
    errMsg.value = '分析完成，但浏览器存储空间不足，历史记录未保存'
  }
}

function historyTitle(prof) {
  const name = [prof?.first_name, prof?.last_name].filter(Boolean).join(' ')
  return name || prof?.username || '未命名用户'
}

function setReport(record, cached = true) {
  currentUid.value = record.uid
  profile.value = record.profile
  stats.value = record.stats
  analysis.value = record.analysis
  analyzedAt.value = record.analyzedAt
  fromHistory.value = cached
  state.value = 'content'
}

function upsertHistory(record) {
  history.value = [
    record,
    ...history.value.filter(item => item.uid !== record.uid),
  ].slice(0, 12)
  saveHistory()
}

async function runAnalysis(input, options = {}) {
  errMsg.value = ''
  const uid = extractUID(input)
  if (!uid) {
    errMsg.value = '无法从输入中提取用户 ID，请确认链接或 UUID 格式正确'
    return
  }

  const cached = history.value.find(item => item.uid === uid)
  if (cached && !options.force) {
    setReport(cached, true)
    return
  }

  currentUid.value = uid
  state.value = 'loading'
  loadingMsg.value = options.force ? '正在更新用户信息...' : '正在加载用户信息...'

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
    analyzedAt.value = new Date().toISOString()
    fromHistory.value = false
    upsertHistory({
      uid,
      title: historyTitle(profile.value),
      username: profile.value?.username || '',
      matchCount: profile.value?.match_count || 0,
      analyzedAt: analyzedAt.value,
      profile: profile.value,
      stats: stats.value,
      analysis: analysis.value,
    })
    state.value = 'content'
  } catch (e) {
    state.value = 'landing'
    errMsg.value = '加载失败: ' + e.message
  }
}

function openHistory(record) {
  setReport(record, true)
}

function updateCurrent() {
  if (currentUid.value) runAnalysis(currentUid.value, { force: true })
}

function reanalyze() {
  state.value = 'landing'
}
</script>

<template>
  <Landing
    v-if="state === 'landing'"
    :err-msg="errMsg"
    :history="history"
    @submit="runAnalysis"
    @open-history="openHistory"
  />
  <Loading v-else-if="state === 'loading'" :message="loadingMsg" />
  <Report
    v-else
    :profile="profile"
    :stats="stats"
    :analysis="analysis"
    :analyzed-at="analyzedAt"
    :from-history="fromHistory"
    @reanalyze="reanalyze"
    @update="updateCurrent"
  />
</template>
