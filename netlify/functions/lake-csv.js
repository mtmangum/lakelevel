// CORS proxy: forwards /api/lake-csv?lake=travis&suffix=-1year
// to https://waterdatafortexas.org/reservoirs/individual/travis-1year.csv
export async function handler(event) {
  const { lake, suffix = '' } = event.queryStringParameters || {}
  if (!lake) return { statusCode: 400, body: 'Missing lake parameter' }

  const url = `https://waterdatafortexas.org/reservoirs/individual/${lake}${suffix}.csv`
  const res = await fetch(url)
  if (!res.ok) return { statusCode: res.status, body: 'Upstream error' }

  const text = await res.text()
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
    body: text,
  }
}
