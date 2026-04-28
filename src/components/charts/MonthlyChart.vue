<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

const props = defineProps({
  monthly: { type: Object, required: true },
})

const canvas = ref(null)
let chart = null

const gridOpt = { color: 'rgba(30,42,69,.6)', drawBorder: false }
const tickOpt = { color: '#7a8599', font: { size: 11 } }

function build() {
  if (!canvas.value) return
  if (chart) chart.destroy()

  const labels = Object.keys(props.monthly).sort()
  const wins = labels.map(k => props.monthly[k].wins)
  const losses = labels.map(k => props.monthly[k].losses)

  chart = new Chart(canvas.value, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: '胜', data: wins, backgroundColor: 'rgba(46,213,115,.75)', borderRadius: 4 },
        { label: '负', data: losses, backgroundColor: 'rgba(255,71,87,.65)', borderRadius: 4 },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: { legend: { labels: { color: '#7a8599', font: { size: 12 } } } },
      scales: {
        x: { grid: gridOpt, ticks: tickOpt },
        y: { grid: gridOpt, ticks: { ...tickOpt, stepSize: 1 }, beginAtZero: true },
      },
    },
  })
}

onMounted(build)
watch(() => props.monthly, build, { deep: true })
onBeforeUnmount(() => { if (chart) chart.destroy() })
</script>

<template>
  <canvas ref="canvas" height="180"></canvas>
</template>
