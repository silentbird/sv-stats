<script setup>
import { computed } from 'vue'
import { pct, fmt } from '../analysis.js'
import Bar from './widgets/Bar.vue'
import StatCard from './widgets/StatCard.vue'
import MonthlyChart from './charts/MonthlyChart.vue'
import AccuracyChart from './charts/AccuracyChart.vue'

const props = defineProps({
  profile: { type: Object, required: true },
  stats: { type: Object, required: true },
  analysis: { type: Object, required: true },
  analyzedAt: { type: String, default: '' },
  fromHistory: { type: Boolean, default: false },
})
defineEmits(['reanalyze', 'update'])

const p = computed(() => props.profile)
const s = computed(() => props.stats)
const an = computed(() => props.analysis)

const o = computed(() => an.value.overview)
const sh = computed(() => an.value.shotStats)

const fp = computed(() => pct(s.value.first_serve_in, s.value.first_serve))
const sp = computed(() => pct(s.value.second_serve_in, s.value.second_serve))
const fpw = computed(() => pct(s.value.first_serve_won, s.value.first_serve_in))
const spw = computed(() => pct(s.value.second_serve_won, s.value.second_serve_in))
const frp = computed(() => pct(s.value.first_return_won, s.value.first_return))
const srp = computed(() => pct(s.value.second_return_won, s.value.second_return))
const bps = computed(() => pct(s.value.break_point_saved, s.value.break_point))
const bpc = computed(() => pct(s.value.break_point_converted, s.value.break_point_opportunity))
const acc = computed(() => pct(s.value.total_shot_in, s.value.total_shot))
const ptw = computed(() => pct(s.value.total_point_won, s.value.total_point))
const fhw = computed(() => pct(s.value.forehand_winner, s.value.forehand))
const fhu = computed(() => pct(s.value.forehand_unforced_error, s.value.forehand))
const bhw = computed(() => pct(s.value.backhand_winner, s.value.backhand))
const bhu = computed(() => pct(s.value.backhand_unforced_error, s.value.backhand))
const spc = computed(() => pct(s.value.set_point_converted, s.value.set_point_opportunity))
const sps = computed(() => pct(s.value.set_point_saved, s.value.set_point_faced))
const ace = computed(() => pct(s.value.ace, s.value.serve))
const svcw = computed(() => pct(s.value.service_winner, s.value.serve))

const wingMax = computed(() => Math.max(s.value.right_wing || 0, s.value.left_wing || 0))
const rightWingW = computed(() => pct(s.value.right_wing, wingMax.value))
const leftWingW = computed(() => pct(s.value.left_wing, wingMax.value))

const durH = computed(() => fmt(s.value.duration / 3600))
const durM = computed(() => Math.round(s.value.duration / 60))
const dist = computed(() => fmt(s.value.distance_run, 2))
const since = computed(() => new Date(p.value.created_at).toLocaleDateString('zh-CN'))

const monthKeys = computed(() => Object.keys(an.value.monthly).sort())
const opponentRows = computed(() => Object.entries(an.value.opponents)
  .sort((a, b) => b[1].total - a[1].total)
  .slice(0, 10))

const showMonthlyChart = computed(() => monthKeys.value.length > 1)
const showMonthlyTable = computed(() => monthKeys.value.length > 0)
const showAccuracyChart = computed(() => an.value.accuracyTrend.length >= 2)

const locationText = computed(() => [p.value.city, p.value.state].filter(Boolean).join(', '))
const analysisTime = computed(() => props.analyzedAt
  ? new Date(props.analyzedAt).toLocaleString('zh-CN')
  : '本次会话'
)
const footerText = computed(() =>
  `数据来源: Swing Vision API · @${p.value.username} (${p.value.first_name}) · ${new Date().toLocaleString('zh-CN')}`
)

const trainingFocus = computed(() => {
  const items = []

  function add(title, metric, detail, action, tone, score) {
    items.push({ title, metric, detail, action, tone, score })
  }

  if (s.value.first_serve >= 20 && fp.value < 55) {
    add(
      '一发稳定性',
      `${fmt(fp.value)}%`,
      `一发进区 ${s.value.first_serve_in}/${s.value.first_serve}，会直接影响保发压力。`,
      '安排 20 分钟定点发球：先追求 7/10 进区，再逐步加入落点变化。',
      'warn',
      100 - fp.value
    )
  }

  if (s.value.second_serve_in >= 10 && spw.value < 45) {
    add(
      '二发保护',
      `${fmt(spw.value)}%`,
      `二发得分 ${s.value.second_serve_won}/${s.value.second_serve_in}，对手容易在二发上抢攻。`,
      '练高弧线深区二发和发后第一拍，目标是把二发回合拖进中性相持。',
      'warn',
      90 - spw.value
    )
  }

  if (s.value.first_return >= 20 && frp.value < 35) {
    add(
      '一接质量',
      `${fmt(frp.value)}%`,
      `一接得分 ${s.value.first_return_won}/${s.value.first_return}，破发机会可能被压缩。`,
      '优先练站位和挡回深度：把一发先回到中路深区，再追求角度。',
      'info',
      85 - frp.value
    )
  }

  if (s.value.break_point_opportunity >= 5 && bpc.value < 40) {
    add(
      '破发点执行',
      `${fmt(bpc.value)}%`,
      `破发点转化 ${s.value.break_point_converted}/${s.value.break_point_opportunity}。`,
      '模拟 30-40 / AD 接发局，提前设定第一拍路线，减少临场犹豫。',
      'hot',
      80 - bpc.value
    )
  }

  if (s.value.total_shot >= 100 && acc.value < 75) {
    add(
      '击球容错',
      `${fmt(acc.value)}%`,
      `总击球进界 ${s.value.total_shot_in}/${s.value.total_shot}，失误成本偏高。`,
      '做 50 球连续相持训练：高度过网、落点过发球线，先把连续性拉起来。',
      'info',
      78 - acc.value
    )
  }

  const fhErrorGap = fhu.value - fhw.value
  const bhErrorGap = bhu.value - bhw.value
  if (s.value.forehand >= 50 && fhErrorGap > 8) {
    add(
      '正手风险控制',
      `${fmt(fhu.value)}% UE`,
      `正手非受迫性失误率比制胜分率高 ${fmt(fhErrorGap)} 个百分点。`,
      '把正手进攻球分成三档：过渡、压制、终结，只在明确短球时终结。',
      'hot',
      fhErrorGap + 45
    )
  }
  if (s.value.backhand >= 50 && bhErrorGap > 8) {
    add(
      '反手稳定性',
      `${fmt(bhu.value)}% UE`,
      `反手非受迫性失误率比制胜分率高 ${fmt(bhErrorGap)} 个百分点。`,
      '练反手斜线深球和切削防守，把弱侧回合从失分点变成过渡点。',
      'hot',
      bhErrorGap + 45
    )
  }

  const recentLosses = an.value.recentForm.slice(0, 5).filter(r => r === 'L').length
  if (an.value.recentForm.length >= 5 && recentLosses >= 3) {
    add(
      '近期比赛节奏',
      `${recentLosses}/5 负`,
      '最近 5 场正式比赛输球偏多，可能需要先稳住比赛模板。',
      '下一场只设 2 个战术目标：提高一发进区率，并把接发回到深区。',
      'warn',
      70 + recentLosses
    )
  }

  if (items.length === 0) {
    add(
      '保持优势',
      `${o.value.winRate}%`,
      '当前核心指标没有明显短板，适合进入专项打磨阶段。',
      '挑一个最想升级的武器做 2 周专项，例如一发落点、接发抢攻或反手变线。',
      'good',
      1
    )
  }

  return items.sort((a, b) => b.score - a.score).slice(0, 4)
})

function winRate(total, wins) {
  return total > 0 ? (wins / total * 100).toFixed(0) : 0
}
</script>

<template>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>🎾 Swing Vision 比赛分析</h1>
      <div class="sub">全面数据分析报告</div>
      <div class="user-info">
        <span style="font-size:19px;font-weight:600">{{ p.first_name }} {{ p.last_name }}</span>
        <span class="badge">PRO</span>
        <span v-if="p.usta_rating" class="badge ntrp">NTRP {{ p.usta_rating }}</span>
        <span v-if="locationText" class="badge muted">{{ locationText }}</span>
        <span class="badge muted">@{{ p.username }}</span>
        <span class="badge muted">{{ fromHistory ? '历史记录' : '最新分析' }} · {{ analysisTime }}</span>
      </div>
      <div class="header-actions">
        <button class="reanalyze-btn" @click="$emit('reanalyze')">↩ 重新分析</button>
        <button class="update-btn" @click="$emit('update')">⟳ 更新数据</button>
      </div>
    </div>

    <!-- Overview -->
    <div class="section">
      <div class="section-title"><span class="ico">📊</span> 总览</div>
      <div class="grid grid-4">
        <StatCard title="总比赛数" :value="p.match_count" :label="`自 ${since} 起`" color="accent" />
        <StatCard title="总时长" :value="durH" unit="h" :label="`${durM} 分钟`" color="accent2" />
        <StatCard title="总得分" :value="s.total_point_won"
                  :label="`/ ${s.total_point} (${fmt(ptw)}%)`" color="green" />
        <StatCard title="跑动距离" :value="dist" unit="km"
                  :label="`🔥 ${s.calorie_burned} cal`" color="yellow" />
      </div>
      <div class="grid grid-4">
        <StatCard title="已完成场次" :value="o.totalMatches"
                  :label="`单打 ${o.singlesCount} | 双打 ${o.doublesCount}`" color="accent" />
        <StatCard title="胜率" :value="`${o.winRate}%`"
                  :label="`胜${o.wins} 负${o.losses} 平${o.draws}`" color="green" />
        <StatCard title="击球准确率" :value="`${sh.accuracy}%`"
                  :label="`${sh.totalShotsIn} / ${sh.totalShots}`" color="accent2" />
        <StatCard title="正式比赛" :value="o.realMatchCount"
                  :label="`发球练习 ${o.servePracticeCount}`" color="yellow" />
      </div>
    </div>

    <!-- Training focus -->
    <div class="section">
      <div class="section-title"><span class="ico">🧭</span> 训练重点</div>
      <div class="focus-grid">
        <div v-for="(item, i) in trainingFocus" :key="item.title" class="focus-card" :class="`focus-${item.tone}`">
          <div class="focus-head">
            <span class="focus-rank">#{{ i + 1 }}</span>
            <span class="focus-metric">{{ item.metric }}</span>
          </div>
          <h3>{{ item.title }}</h3>
          <p>{{ item.detail }}</p>
          <div class="focus-action">{{ item.action }}</div>
        </div>
      </div>
    </div>

    <!-- Serve -->
    <div class="section">
      <div class="section-title"><span class="ico">🎾</span> 发球数据</div>
      <div class="grid grid-2">
        <div class="card">
          <h3>发球概况</h3>
          <div class="serve-box">
            <div class="serve-stat"><div class="num accent">{{ s.ace }}</div><div class="lbl">ACE ({{ fmt(ace) }}%)</div></div>
            <div class="serve-stat"><div class="num accent2">{{ s.service_winner }}</div><div class="lbl">直接得分 ({{ fmt(svcw) }}%)</div></div>
            <div class="serve-stat"><div class="num green">{{ s.serve }}</div><div class="lbl">总发球次数</div></div>
            <div class="serve-stat"><div class="num yellow">{{ fmt(s.average_serve_velocity) }}</div><div class="lbl">均速 (m/s)</div></div>
          </div>
        </div>
        <div class="card">
          <h3>一发 / 二发</h3>
          <Bar label="一发进区率" :display="`${fmt(fp)}%`" />
          <Bar label="一发得分率" :display="`${fmt(fpw)}%`" />
          <Bar label="二发进区率" :display="`${fmt(sp)}%`" cls="bar-green" />
          <Bar label="二发得分率" :display="`${fmt(spw)}%`" cls="bar-green" />
          <div style="margin-top:10px;font-size:11px;color:var(--dim)">
            一发: {{ s.first_serve_in }}/{{ s.first_serve }} &nbsp;|&nbsp;
            二发: {{ s.second_serve_in }}/{{ s.second_serve }}
          </div>
        </div>
      </div>
    </div>

    <!-- Return & Break -->
    <div class="section">
      <div class="section-title"><span class="ico">↩️</span> 接发球 & 破发</div>
      <div class="grid grid-2">
        <div class="card">
          <h3>接发球得分率</h3>
          <Bar label="一接得分率" :display="`${fmt(frp)}%`" />
          <Bar label="二接得分率" :display="`${fmt(srp)}%`" />
          <div style="margin-top:10px;font-size:11px;color:var(--dim)">
            一接: {{ s.first_return_won }}/{{ s.first_return }} &nbsp;|&nbsp;
            二接: {{ s.second_return_won }}/{{ s.second_return }}
          </div>
        </div>
        <div class="card">
          <h3>破发点</h3>
          <Bar label="破发成功率" :display="`${fmt(bpc)}%`" cls="bar-green" />
          <Bar label="保发成功率" :display="`${fmt(bps)}%`" cls="bar-yellow" />
          <div style="margin-top:10px;font-size:11px;color:var(--dim)">
            破发: {{ s.break_point_converted }}/{{ s.break_point_opportunity }} &nbsp;|&nbsp;
            保发: {{ s.break_point_saved }}/{{ s.break_point }}
          </div>
        </div>
      </div>
    </div>

    <!-- Shots -->
    <div class="section">
      <div class="section-title"><span class="ico">🎯</span> 击球分析</div>
      <div class="grid grid-3">
        <StatCard title="总击球" :value="s.total_shot"
                  :label="`有效 ${s.total_shot_in} (${fmt(acc)}%)`" color="accent" />
        <StatCard title="正手" :value="s.forehand"
                  :label="`制胜 ${s.forehand_winner} | UE ${s.forehand_unforced_error}`" color="accent2" />
        <StatCard title="反手" :value="s.backhand"
                  :label="`制胜 ${s.backhand_winner} | UE ${s.backhand_unforced_error}`" color="green" />
      </div>
      <div class="grid grid-2">
        <div class="card">
          <h3>正手分析</h3>
          <Bar label="制胜分率" :display="`${fmt(fhw)}%`" cls="bar-green" />
          <Bar label="非受迫性失误率" :display="`${fmt(fhu)}%`" cls="bar-red" />
        </div>
        <div class="card">
          <h3>反手分析</h3>
          <Bar label="制胜分率" :display="`${fmt(bhw)}%`" cls="bar-green" />
          <Bar label="非受迫性失误率" :display="`${fmt(bhu)}%`" cls="bar-red" />
        </div>
      </div>
      <div class="grid grid-2">
        <div class="card">
          <h3>正手侧</h3>
          <Bar label="击球数" :display="String(s.right_wing)" cls="bar-accent" :width="rightWingW" />
          <div style="font-size:11px;color:var(--dim);margin-top:8px">
            制胜分: {{ s.right_wing_winner }} &nbsp;|&nbsp; 均速: {{ fmt(s.average_right_wing_velocity) }} m/s
          </div>
        </div>
        <div class="card">
          <h3>反手侧</h3>
          <Bar label="击球数" :display="String(s.left_wing)" cls="bar-accent" :width="leftWingW" />
          <div style="font-size:11px;color:var(--dim);margin-top:8px">
            制胜分: {{ s.left_wing_winner }} &nbsp;|&nbsp; 均速: {{ fmt(s.average_left_wing_velocity) }} m/s
          </div>
        </div>
      </div>
    </div>

    <!-- Set points -->
    <div class="section">
      <div class="section-title"><span class="ico">🏆</span> 盘点 / 关键分</div>
      <div class="grid grid-2">
        <div class="card">
          <h3>盘点转化</h3>
          <Bar label="盘点转化率" :display="`${fmt(spc)}%`" cls="bar-green" />
          <div style="font-size:11px;color:var(--dim);margin-top:8px">
            成功: {{ s.set_point_converted }} / {{ s.set_point_opportunity }}
          </div>
        </div>
        <div class="card">
          <h3>盘点挽救</h3>
          <Bar label="盘点挽救率" :display="`${fmt(sps)}%`" cls="bar-yellow" />
          <div style="font-size:11px;color:var(--dim);margin-top:8px">
            挽救: {{ s.set_point_saved }} / {{ s.set_point_faced }}
          </div>
        </div>
      </div>
    </div>

    <!-- Physical -->
    <div class="section">
      <div class="section-title"><span class="ico">💪</span> 体能数据</div>
      <div class="grid grid-4">
        <StatCard title="总跑动" :value="dist" unit="km" color="accent" />
        <StatCard title="消耗热量" :value="s.calorie_burned" unit="cal" color="red" />
        <StatCard title="平均心率" :value="s.average_heart_rate" unit="bpm" color="yellow" />
        <StatCard title="心率记录" :value="s.heart_rate_count" unit="次" color="accent2" />
      </div>
    </div>

    <!-- Monthly -->
    <div v-if="showMonthlyChart" class="section">
      <div class="section-title"><span class="ico">📅</span> 月度统计</div>
      <div class="grid grid-2">
        <div class="card">
          <h3>月度胜负分布</h3>
          <MonthlyChart :monthly="an.monthly" />
        </div>
        <div class="card" style="padding:0;overflow:hidden">
          <table class="data-table">
            <thead>
              <tr><th>月份</th><th>场次</th><th>胜</th><th>负</th><th>平</th><th>胜率</th><th>时长</th></tr>
            </thead>
            <tbody>
              <tr v-for="k in monthKeys" :key="k">
                <td>{{ k }}</td>
                <td>{{ an.monthly[k].total }}</td>
                <td class="green">{{ an.monthly[k].wins }}</td>
                <td class="red">{{ an.monthly[k].losses }}</td>
                <td style="color:var(--dim)">{{ an.monthly[k].draws }}</td>
                <td>{{ winRate(an.monthly[k].total, an.monthly[k].wins) }}%</td>
                <td style="color:var(--dim)">{{ Math.round(an.monthly[k].duration) }}m</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <div v-else-if="showMonthlyTable" class="section">
      <div class="section-title"><span class="ico">📅</span> 月度统计</div>
      <div class="card" style="padding:0;overflow:hidden">
        <table class="data-table">
          <thead>
            <tr><th>月份</th><th>场次</th><th>胜</th><th>负</th><th>平</th><th>胜率</th><th>时长</th></tr>
          </thead>
          <tbody>
            <tr v-for="k in monthKeys" :key="k">
              <td>{{ k }}</td>
              <td>{{ an.monthly[k].total }}</td>
              <td class="green">{{ an.monthly[k].wins }}</td>
              <td class="red">{{ an.monthly[k].losses }}</td>
              <td style="color:var(--dim)">{{ an.monthly[k].draws }}</td>
              <td>{{ winRate(an.monthly[k].total, an.monthly[k].wins) }}%</td>
              <td style="color:var(--dim)">{{ Math.round(an.monthly[k].duration) }}m</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Accuracy trend -->
    <div v-if="showAccuracyChart" class="section">
      <div class="section-title"><span class="ico">📈</span> 准确率趋势</div>
      <div class="card">
        <h3>逐场击球准确率</h3>
        <AccuracyChart :trend="an.accuracyTrend" />
      </div>
    </div>

    <!-- Recent form -->
    <div v-if="an.recentForm.length > 0" class="section">
      <div class="section-title"><span class="ico">🔥</span> 近期状态</div>
      <div class="card">
        <h3>最近 {{ an.recentForm.length }} 场正式比赛</h3>
        <div class="form-badges">
          <span
            v-for="(r, i) in an.recentForm"
            :key="i"
            class="fb"
            :class="r === 'W' ? 'fb-w' : r === 'L' ? 'fb-l' : 'fb-d'"
          >{{ r }}</span>
        </div>
      </div>
    </div>

    <!-- Opponents -->
    <div v-if="opponentRows.length > 0" class="section">
      <div class="section-title"><span class="ico">👥</span> 对手统计</div>
      <div class="card" style="padding:0;overflow:hidden">
        <table class="data-table">
          <thead>
            <tr><th>对手</th><th>场次</th><th>胜</th><th>负</th><th>胜率</th></tr>
          </thead>
          <tbody>
            <tr v-for="[name, st] in opponentRows" :key="name">
              <td>{{ name }}</td>
              <td>{{ st.total }}</td>
              <td class="green">{{ st.wins }}</td>
              <td class="red">{{ st.losses }}</td>
              <td>{{ winRate(st.total, st.wins) }}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Summary -->
    <div class="section">
      <div class="summary-card">
        <h3>📝 分析总结</h3>
        <p>
          <strong>发球：</strong>一发进区率 {{ fmt(fp) }}%，一发得分率 {{ fmt(fpw) }}%。
          {{ fp > 60 ? '一发稳定性不错。' : '一发稳定性有待提高。' }}
          <template v-if="s.ace > 0"> 共 {{ s.ace }} 个ACE，{{ s.service_winner }} 个发球直接得分。</template>
        </p>
        <p>
          <strong>接发球：</strong>一接得分率 {{ fmt(frp) }}%，二接得分率 {{ fmt(srp) }}%。
          {{ frp > 40 ? '接发球表现不错。' : '接发球有提升空间，建议更积极的回球策略。' }}
        </p>
        <p>
          <strong>破发：</strong>破发成功率 {{ fmt(bpc) }}%（{{ s.break_point_converted }}/{{ s.break_point_opportunity }}），
          保发成功率 {{ fmt(bps) }}%。{{ bpc > 50 ? '关键分把握较好。' : '关键分把握需要加强。' }}
        </p>
        <p>
          <strong>击球：</strong>总击球 {{ s.total_shot }} 次，准确率 {{ fmt(acc) }}%。
          正手制胜分 {{ s.forehand_winner }} vs UE {{ s.forehand_unforced_error }}；
          反手制胜分 {{ s.backhand_winner }} vs UE {{ s.backhand_unforced_error }}。
        </p>
        <p>
          <strong>体能：</strong>累计跑动 {{ dist }}km，消耗 {{ s.calorie_burned }}cal，
          平均心率 {{ s.average_heart_rate }}bpm。
        </p>
      </div>
    </div>

    <div class="footer">{{ footerText }}</div>
  </div>
</template>
