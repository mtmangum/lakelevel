// The client only ever uses the last 30 years of data (30yr monthly
// averages + current-year readings), but full history for some lakes goes
// back to the 1940s. Trimming before caching cuts payload size dramatically
// with a year of buffer built in.
const YEARS_KEPT = 31

export function trimHistoricalCSV(csv) {
  const minYear = new Date().getFullYear() - YEARS_KEPT
  const lines = csv.split('\n')
  const kept = []
  for (const line of lines) {
    const t = line.trim()
    if (!t || t.startsWith('#') || t.startsWith('date')) {
      kept.push(line)
      continue
    }
    const year = parseInt(t.split(',')[0]?.split('-')[0], 10)
    if (isNaN(year) || year >= minYear) kept.push(line)
  }
  return kept.join('\n')
}
