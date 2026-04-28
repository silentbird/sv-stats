export async function fetchJSON(url) {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${url}`)
  return r.json()
}

export async function fetchAllMatches(uid, onProgress) {
  const all = []
  let page = 1
  while (true) {
    onProgress?.(`正在加载比赛记录... 第 ${page} 页`)
    const resp = await fetchJSON(`/api/matches?user_id=${uid}&page=${page}&per_page=100`)
    if (!resp.data || resp.data.length === 0) break
    all.push(...resp.data)
    if (resp.data.length < 100) break
    page++
  }
  return all
}
