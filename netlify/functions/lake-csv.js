// CORS proxy + cache: serves /api/lake-csv?lake=travis&suffix=-1year
// from the shared Blobs cache (warmed by sync-lake-data.js) when available,
// falling back to a live fetch from waterdatafortexas.org on a cold miss.
import { getLakeStore } from '../lib/lakeStore.js'

export async function handler(event) {
  const { lake, suffix = '' } = event.queryStringParameters || {}
  if (!lake) return { statusCode: 400, body: 'Missing lake parameter' }

  const key = `${lake}${suffix}`
  let store = null

  try {
    store = getLakeStore()
    const cached = await store.getWithMetadata(key, { type: 'text' })
    if (cached) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'public, max-age=300',
          'X-Fetched-At': cached.metadata?.fetchedAt ?? '',
        },
        body: cached.data,
      }
    }
  } catch {
    // Blobs unavailable or read failed — fall through to a live fetch
  }

  const url = `https://waterdatafortexas.org/reservoirs/individual/${lake}${suffix}.csv`
  const res = await fetch(url)
  if (!res.ok) return { statusCode: res.status, body: 'Upstream error' }
  const text = await res.text()

  const fetchedAt = new Date().toISOString()
  store?.set(key, text, { metadata: { fetchedAt } }).catch(() => {})

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      'X-Fetched-At': fetchedAt,
    },
    body: text,
  }
}
