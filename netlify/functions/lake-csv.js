// CORS proxy + cache: serves /api/lake-csv?lake=travis&suffix=-1year
// from the shared Blobs cache (warmed by sync-lake-data.js) when available,
// falling back to a live fetch from waterdatafortexas.org on a cold miss.
//
// Uses the V2 function signature (default export) rather than the classic
// handler(event) form — only V2 functions get Netlify Blobs context
// auto-injected at runtime; the classic form throws MissingBlobsEnvironmentError.
import { getLakeStore } from '../lib/lakeStore.js'

export default async req => {
  const url = new URL(req.url)
  const lake = url.searchParams.get('lake')
  const suffix = url.searchParams.get('suffix') ?? ''
  if (!lake) return new Response('Missing lake parameter', { status: 400 })

  const key = `${lake}${suffix}`
  let store = null

  try {
    store = getLakeStore()
    const cached = await store.getWithMetadata(key, { type: 'text' })
    if (cached) {
      return new Response(cached.data, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'public, max-age=300',
          'X-Fetched-At': cached.metadata?.fetchedAt ?? '',
          'X-Cache': 'HIT',
        },
      })
    }
  } catch (err) {
    console.error(`lake-data blob read failed for ${key}`, err)
  }

  const originUrl = `https://waterdatafortexas.org/reservoirs/individual/${lake}${suffix}.csv`
  const res = await fetch(originUrl)
  if (!res.ok) return new Response('Upstream error', { status: res.status })
  const text = await res.text()

  const fetchedAt = new Date().toISOString()
  store?.set(key, text, { metadata: { fetchedAt } }).catch(err => {
    console.error(`lake-data blob write failed for ${key}`, err)
  })

  return new Response(text, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      'X-Fetched-At': fetchedAt,
      'X-Cache': 'MISS',
    },
  })
}
