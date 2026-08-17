import type { DailyReading } from '../types'
import type { Lake } from './lakes'

export interface CSVFetchResult {
  rows: DailyReading[]
  fetchedAt: Date | null // when the server last pulled this data from origin
}

// Session-level parse cache — avoids re-parsing the same CSV on lake-switch
// prefetches. Entries expire before useAppState's hourly refresh timer fires,
// so that poll actually reaches the network instead of re-serving the first
// result for the rest of the session.
const CACHE_TTL_MS = 55 * 60 * 1000
const cache = new Map<string, { result: CSVFetchResult; cachedAt: number }>()

function parseCSV(csv: string): DailyReading[] {
  const rows: DailyReading[] = []
  for (const line of csv.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#') || t.startsWith('date')) continue
    const f = t.split(',')
    if (f.length < 6) continue
    const parts = f[0].split('-')
    if (parts.length < 3) continue
    const waterLevel  = parseFloat(f[1])
    const percentFull = parseFloat(f[5])
    const storage     = parseFloat(f[4])
    if (isNaN(waterLevel) || isNaN(percentFull)) continue
    rows.push({
      date: f[0],
      year:  parseInt(parts[0]),
      month: parseInt(parts[1]),
      day:   parseInt(parts[2]),
      waterLevel,
      percentFull,
      storage: isNaN(storage) ? 0 : storage,
    })
  }
  return rows.sort((a, b) => a.date.localeCompare(b.date))
}

export async function fetchAllReadings(lake: Lake): Promise<CSVFetchResult> {
  const key = lake.id
  const cached = cache.get(key)
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) return cached.result
  const url = `/api/lake-csv?lake=${encodeURIComponent(lake.id)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${lake.name}`)
  const text = await res.text()
  const fetchedAtHeader = res.headers.get('X-Fetched-At')
  const result: CSVFetchResult = {
    rows: parseCSV(text),
    fetchedAt: fetchedAtHeader ? new Date(fetchedAtHeader) : null,
  }
  cache.set(key, { result, cachedAt: Date.now() })
  return result
}
