export async function fetchJSON(url) {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${url}`)
  return r.json()
}

function firstFiniteNumber(...values) {
  for (const value of values) {
    const n = Number(value)
    if (Number.isFinite(n) && n > 0) return n
  }
  return 0
}

function matchKey(match) {
  const primary = match.id || match.uuid
  if (primary) return String(primary)

  const fallback = [
    match.started_at,
    match.created_at,
    match.host_name,
    match.guest_name,
    match.recording_duration,
    match.host_shot_count,
    match.guest_shot_count,
  ].map(v => v ?? '').join('|')

  return fallback.replace(/\|/g, '') ? fallback : JSON.stringify(match)
}

function pageSignature(rows) {
  return rows.map(matchKey).join('||')
}

function nextPageFromLink(link) {
  const raw = typeof link === 'string' ? link : link?.url || link?.href
  if (!raw) return 0

  try {
    const url = new URL(raw, window.location.origin)
    return firstFiniteNumber(url.searchParams.get('page'))
  } catch {
    return 0
  }
}

function paginationInfo(resp) {
  const meta = resp.meta || resp.pagination || {}
  const links = resp.links || meta.links || {}
  return {
    currentPage: Number.isFinite(Number(meta.current_page ?? meta.currentPage ?? resp.current_page ?? resp.currentPage))
      ? Number(meta.current_page ?? meta.currentPage ?? resp.current_page ?? resp.currentPage)
      : null,
    hasMore: resp.has_more ?? resp.hasMore ?? meta.has_more ?? meta.hasMore ?? null,
    nextPage: firstFiniteNumber(
      resp.next_page,
      resp.nextPage,
      meta.next_page,
      meta.nextPage,
      nextPageFromLink(resp.next),
      nextPageFromLink(links.next)
    ),
    totalPages: firstFiniteNumber(
      resp.total_pages,
      resp.totalPages,
      resp.last_page,
      resp.lastPage,
      meta.total_pages,
      meta.totalPages,
      meta.last_page,
      meta.lastPage
    ),
    totalCount: firstFiniteNumber(
      resp.total,
      resp.total_count,
      resp.totalCount,
      meta.total,
      meta.total_count,
      meta.totalCount
    ),
  }
}

export async function fetchAllMatches(uid, onProgress) {
  const all = []
  const seen = new Set()
  const seenPages = new Set()
  let page = 0
  const perPage = 100

  while (true) {
    onProgress?.(`正在加载比赛记录... 第 ${page + 1} 页`)
    const resp = await fetchJSON(`/api/users/${uid}/completedmatches?page=${page}&per_page=${perPage}`)
    const rows = Array.isArray(resp.data) ? resp.data : []
    if (rows.length === 0) break

    const signature = pageSignature(rows)
    if (seenPages.has(signature)) break
    seenPages.add(signature)

    let newCount = 0
    rows.forEach(match => {
      const key = matchKey(match)
      if (seen.has(key)) return
      seen.add(key)
      all.push(match)
      newCount++
    })
    if (newCount === 0) break

    const info = paginationInfo(resp)
    if (info.hasMore === false) break

    if (info.nextPage && info.nextPage > page) {
      page = info.nextPage
      continue
    }

    if (info.totalPages) {
      const currentPage = info.currentPage ?? page
      if (currentPage + 1 >= info.totalPages) break
      page++
      continue
    }

    if (info.totalCount) {
      if (all.length >= info.totalCount) break
      page++
      continue
    }

    if (rows.length < perPage) break
    page++
  }
  return all
}
