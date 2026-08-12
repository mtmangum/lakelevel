// Scheduled function: pre-fetches every lake's CSV data from waterdatafortexas.org
// and warms the shared Blobs cache that lake-csv.js reads from.
import { getLakeStore } from '../lib/lakeStore.js'

const LAKE_IDS = ['buchanan', 'inks', 'lyndon-b-johnson', 'marble-falls', 'travis', 'austin']
const SUFFIXES = ['', '-1year']

export default async () => {
  let store
  try {
    store = getLakeStore()
  } catch (err) {
    console.error('lake-data blob store unavailable, skipping sync', err)
    return
  }
  const fetchedAt = new Date().toISOString()

  await Promise.all(
    LAKE_IDS.flatMap(lake =>
      SUFFIXES.map(async suffix => {
        const url = `https://waterdatafortexas.org/reservoirs/individual/${lake}${suffix}.csv`
        try {
          const res = await fetch(url)
          if (!res.ok) return
          const text = await res.text()
          await store.set(`${lake}${suffix}`, text, { metadata: { fetchedAt } })
        } catch {
          // skip this lake/suffix this run; the next scheduled run will retry
        }
      })
    )
  )
}

export const config = { schedule: '@hourly' }
