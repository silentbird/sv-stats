const API_BASE = 'https://api.swing.tennis/v1'

export async function onRequest({ request, params }) {
  const rawPath = Array.isArray(params.path)
    ? params.path.join('/')
    : params.path || ''
  const sourceUrl = new URL(request.url)
  const targetUrl = new URL(`${API_BASE}/${rawPath}`)
  targetUrl.search = sourceUrl.search

  try {
    const apiResponse = await fetch(targetUrl, {
      method: request.method,
      headers: {
        Accept: 'application/json',
        'User-Agent': request.headers.get('User-Agent') || 'sv-stats',
      },
    })

    const headers = new Headers(apiResponse.headers)
    headers.set('Access-Control-Allow-Origin', sourceUrl.origin)

    return new Response(apiResponse.body, {
      status: apiResponse.status,
      statusText: apiResponse.statusText,
      headers,
    })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to proxy API request' },
      { status: 502 }
    )
  }
}
