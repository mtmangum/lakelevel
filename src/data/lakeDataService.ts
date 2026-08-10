import type { DailyReading } from '../types'
import type { Lake } from './lakes'

// Session-level parse cache — avoids re-parsing the same CSV
const cache = new Map<string, DailyReading[]>()

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

async function fetchCSV(lake: Lake, suffix: string): Promise<DailyReading[]> {
  const key = `${lake.id}${suffix}`
  if (cache.has(key)) return cache.get(key)!
  const url = `/api/lake-csv?lake=${encodeURIComponent(lake.id)}&suffix=${encodeURIComponent(suffix)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${lake.name}`)
  const text = await res.text()
  const parsed = parseCSV(text)
  cache.set(key, parsed)
  return parsed
}

export const fetchRecentReadings = (lake: Lake) => fetchCSV(lake, '-1year')
export const fetchAllReadings    = (lake: Lake) => fetchCSV(lake, '')

export function bustCache(lake: Lake) {
  cache.delete(`${lake.id}-1year`)
  cache.delete(lake.id)
}
