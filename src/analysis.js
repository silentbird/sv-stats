export function extractUID(input) {
  const m = input.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
  return m ? m[0] : null
}

function num(v) {
  const raw = v && typeof v === 'object' && 'value' in v ? v.value : v
  const n = Number(raw)
  return Number.isFinite(n) ? n : 0
}

export function pct(a, b) {
  const den = num(b)
  return den > 0 ? num(a) / den * 100 : 0
}

export function fmt(n, d = 1) { return num(n).toFixed(d) }

function validDate(value) {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function matchDate(m) {
  return [
    m.played_at,
    m.played_on,
    m.match_date,
    m.recorded_at,
    m.recording_started_at,
    m.started_at,
    m.created_at,
  ].map(validDate).find(Boolean)
}

function cleanName(name) {
  const value = String(name || '').trim()
  if (!value || value === 'Opponent') return ''
  return value
}

function objectHasUid(value, uid, depth = 0) {
  if (!value || depth > 5) return false
  if (typeof value === 'string') return value === uid
  if (Array.isArray(value)) return value.some(v => objectHasUid(v, uid, depth + 1))
  if (typeof value !== 'object') return false

  if ([value.uuid, value.user_id, value.id].some(v => String(v || '') === uid)) return true
  return Object.values(value).some(v => objectHasUid(v, uid, depth + 1))
}

function sideValues(m, side) {
  return [
    m[side],
    m[`${side}_user`],
    m[`${side}_users`],
    m[`${side}_player`],
    m[`${side}_players`],
    m[`${side}_team`],
    m[`${side}_team_players`],
    m[`${side}_participant`],
    m[`${side}_participants`],
    m[`${side}_uuid`],
    m[`${side}_user_id`],
    m[`${side}_id`],
  ].filter(v => v !== undefined && v !== null)
}

function sideHasUid(m, side, uid) {
  return sideValues(m, side).some(v => objectHasUid(v, uid))
}

function userRole(m, uid) {
  const inHost = sideHasUid(m, 'host', uid)
  const inGuest = sideHasUid(m, 'guest', uid)
  if (inHost && !inGuest) return 'host'
  if (inGuest && !inHost) return 'guest'
  return m.owner && m.owner.uuid === uid ? 'host' : 'guest'
}

function nameFromObject(value) {
  if (!value) return ''
  if (typeof value === 'string') return cleanName(value)
  if (typeof value !== 'object') return ''
  return cleanName(
    value.name ||
    value.display_name ||
    value.full_name ||
    [value.first_name, value.last_name].filter(Boolean).join(' ') ||
    value.username
  )
}

function collectNames(value, uid, depth = 0) {
  if (!value || depth > 4) return []
  if (typeof value === 'string') return [cleanName(value)].filter(Boolean)
  if (Array.isArray(value)) return value.flatMap(v => collectNames(v, uid, depth + 1))
  if (typeof value !== 'object') return []
  if (objectHasUid(value, uid, 0)) return []

  const ownName = nameFromObject(value)
  if (ownName) return [ownName]
  return Object.values(value).flatMap(v => collectNames(v, uid, depth + 1))
}

function opponentName(m, role, uid) {
  const side = role === 'host' ? 'guest' : 'host'
  const names = [
    m[`${side}_name`],
    ...sideValues(m, side),
  ].flatMap(v => collectNames(v, uid))

  return [...new Set(names)].join(' / ')
}

export function analyzeMatches(matches, uid) {
  const classified = matches.map(m => {
    const role = userRole(m, uid)
    const isHost = role === 'host'
    const date = matchDate(m)
    const userShotCount = num(isHost ? m.host_shot_count : m.guest_shot_count)
    const userShotIn = num(isHost ? m.host_shot_in : m.guest_shot_in)
    let result = 'unknown'
    if (m.has_completed) {
      if (m.winner === 'draw') result = 'draw'
      else if ((m.winner === 'host' && isHost) || (m.winner === 'guest' && !isHost)) result = 'win'
      else result = 'loss'
    }
    const durationMin = m.recording_duration ? Math.round(m.recording_duration / 60 * 10) / 10 : 0
    return {
      id: m.id, date,
      dateStr: date ? date.toLocaleDateString('zh-CN') : '未知日期',
      isSingles: !m.is_doubles, isDoubles: m.is_doubles,
      sessionType: m.session_type || 'match',
      role, result,
      userShotCount, userShotIn,
      accuracy: userShotCount > 0 ? userShotIn / userShotCount * 100 : 0,
      durationMin,
      opponentName: opponentName(m, role, uid),
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
  completed.filter(m => m.date).forEach(m => {
    const d = m.date
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!monthly[k]) monthly[k] = { total: 0, wins: 0, losses: 0, draws: 0, duration: 0 }
    monthly[k].total++
    if (m.result === 'win') monthly[k].wins++
    else if (m.result === 'loss') monthly[k].losses++
    else monthly[k].draws++
    monthly[k].duration += m.durationMin
  })

  const recentForm = [...realMatches]
    .filter(m => m.date)
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 10)
    .map(m => m.result === 'win' ? 'W' : m.result === 'loss' ? 'L' : 'D')

  const accuracyTrend = [...withShots]
    .filter(m => m.date)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map(m => ({ date: m.dateStr, accuracy: +m.accuracy.toFixed(1) }))

  const opponents = {}
  realMatches.forEach(m => {
    const name = m.opponentName
    if (name) {
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
