<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

const props = defineProps({
  trend: { type: Array, required: true },
})

const canvas = ref(null)
let chart = null

const gridOpt = { color: 'rgba(30,42,69,.6)', drawBorder: false }
const tickOpt = { color: '#7a8599', font: { size: 11 } }

function build() {
  if (!canvas.value || props.trend.length < 2) return
  if (chart) chart.destroy()

  chart = new Chart(canvas.value, {
    type: 'line',
    data: {
      labels: props.trend.map(d => d.date),
      datasets: [{
        label: '准确率 %',
        data: props.trend.map(d => d.accuracy),
        borderColor: '#00d4aa',
        backgroundColor: 'rgba(0,212,170,.08)',
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: '#00d4aa',
        fill: true,
        tension: 0.3,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: gridOpt, ticks: { ...tickOpt, maxTicksLimit: 8 } },
        y: { grid: gridOpt, ticks: tickOpt, min: 0, max: 100 },
      },
    },
  })
}

onMounted(build)
watch(() => props.trend, build, { deep: true })
onBeforeUnmount(() => { if (chart) chart.destroy() })
</script>

<template>
  <canvas ref="canvas" height="120"></canvas>
</template>
