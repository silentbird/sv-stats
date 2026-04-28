export function extractUID(input) {
  const m = input.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
  return m ? m[0] : null
}

export function pct(a, b) { return b > 0 ? a / b * 100 : 0 }
export function fmt(n, d = 1) { return Number(n).toFixed(d) }

export function analyzeMatches(matches, uid) {
  const classified = matches.map(m => {
    const isHost = m.owner && m.owner.uuid === uid
    const userShotCount = isHost ? m.host_shot_count : m.guest_shot_count
    const userShotIn = isHost ? m.host_shot_in : m.guest_shot_in
    let result = 'unknown'
    if (m.has_completed) {
      if (m.winner === 'draw') result = 'draw'
      else if ((m.winner === 'host' && isHost) || (m.winner === 'guest' && !isHost)) result = 'win'
      else result = 'loss'
    }
    const durationMin = m.recording_duration ? Math.round(m.recording_duration / 60 * 10) / 10 : 0
    return {
      id: m.id, date: m.started_at,
      dateStr: new Date(m.started_at).toLocaleDateString('zh-CN'),
      isSingles: !m.is_doubles, isDoubles: m.is_doubles,
      sessionType: m.session_type || 'match',
      role: isHost ? 'host' : 'guest', result,
      userShotCount, userShotIn,
      accuracy: userShotCount > 0 ? userShotIn / userShotCount * 100 : 0,
      durationMin,
      hostName: m.host_name, guestName: m.guest_name,
      hasCompleted: m.has_completed,
    }
  })

  const completed = classified.filter(m => m.hasCompleted)
  const wins = completed.filter(m => m.result === 'win').length
  const losses = completed.filter(m => m.result === 'loss').length
  const draws = completed.filter(m => m.result === 'draw').length

  const servePractice = completed.filter(m => m.sessionType === 'serve_practice')
  const realMatches = completed.filter(m => m.sessionType !== 'serve_practice')

  const withShots = completed.filter(m => m.userShotCount > 0)
  const totalShots = withShots.reduce((s, m) => s + m.userShotCount, 0)
  const totalShotsIn = withShots.reduce((s, m) => s + m.userShotIn, 0)

  const monthly = {}
  completed.forEach(m => {
    const d = new Date(m.date)
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!monthly[k]) monthly[k] = { total: 0, wins: 0, losses: 0, draws: 0, duration: 0 }
    monthly[k].total++
    if (m.result === 'win') monthly[k].wins++
    else if (m.result === 'loss') monthly[k].losses++
    else monthly[k].draws++
    monthly[k].duration += m.durationMin
  })

  const recentForm = [...realMatches]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10)
    .map(m => m.result === 'win' ? 'W' : m.result === 'loss' ? 'L' : 'D')

  const accuracyTrend = [...withShots]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(m => ({ date: m.dateStr, accuracy: +m.accuracy.toFixed(1) }))

  const opponents = {}
  realMatches.forEach(m => {
    const name = m.role === 'host' ? m.guestName : m.hostName
    if (name && name !== 'Opponent') {
      if (!opponents[name]) opponents[name] = { total: 0, wins: 0, losses: 0 }
      opponents[name].total++
      if (m.result === 'win') opponents[name].wins++
      else if (m.result === 'loss') opponents[name].losses++
    }
  })

  return {
    overview: {
      totalMatches: completed.length, wins, losses, draws,
      winRate: completed.length > 0 ? (wins / completed.length * 100).toFixed(1) : '0.0',
      singlesCount: completed.filter(m => m.isSingles).length,
      doublesCount: completed.filter(m => m.isDoubles).length,
      servePracticeCount: servePractice.length,
      realMatchCount: realMatches.length,
    },
    shotStats: {
      totalShots, totalShotsIn,
      accuracy: totalShots > 0 ? (totalShotsIn / totalShots * 100).toFixed(1) : '0.0',
    },
    monthly, recentForm, accuracyTrend, opponents,
  }
}
