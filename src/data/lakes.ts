export interface Lake {
  id:           string
  name:         string
  displayName:  string   // proper-cased name for <title>/meta, e.g. "Lake LBJ"
  slug:         string   // URL slug — path is `/lake-${slug}`
  location:     string
  metaLocation: string   // proper-cased location for <title>/meta, e.g. "Austin, TX"
  fullPool:     number   // ft MSL
  lowThreshold: number   // ft MSL
}

// Invariant: svgY 34 = fullPool, svgY 226 = lowThreshold (192-unit span)
export function ftToSvgY(lake: Lake, ft: number): number {
  return 34 + (lake.fullPool - ft) * (192 / (lake.fullPool - lake.lowThreshold))
}

export function svgYToFt(lake: Lake, svgY: number): number {
  return lake.fullPool - (svgY - 34) * ((lake.fullPool - lake.lowThreshold) / 192)
}

export const LAKES: Lake[] = [
  { id: 'buchanan',         name: 'LAKE BUCHANAN',     displayName: 'Lake Buchanan',     slug: 'buchanan',    location: 'BURNET COUNTY, TX', metaLocation: 'Burnet County, TX', fullPool: 1020.5, lowThreshold: 920.0 },
  { id: 'inks',             name: 'LAKE INKS',          displayName: 'Lake Inks',          slug: 'inks',         location: 'BURNET COUNTY, TX', metaLocation: 'Burnet County, TX', fullPool: 888.25, lowThreshold: 848.0 },
  { id: 'lyndon-b-johnson', name: 'LAKE LBJ',           displayName: 'Lake LBJ',           slug: 'lbj',          location: 'LLANO COUNTY, TX',  metaLocation: 'Llano County, TX',  fullPool: 824.0,  lowThreshold: 815.0 },
  { id: 'marble-falls',     name: 'LAKE MARBLE FALLS',  displayName: 'Lake Marble Falls',  slug: 'marble-falls', location: 'BURNET COUNTY, TX', metaLocation: 'Burnet County, TX', fullPool: 738.5,  lowThreshold: 710.0 },
  { id: 'travis',           name: 'LAKE TRAVIS',        displayName: 'Lake Travis',        slug: 'travis',       location: 'AUSTIN, TX',         metaLocation: 'Austin, TX',         fullPool: 681.0,  lowThreshold: 605.0 },
  { id: 'austin',           name: 'LAKE AUSTIN',        displayName: 'Lake Austin',        slug: 'austin',       location: 'AUSTIN, TX',         metaLocation: 'Austin, TX',         fullPool: 492.0,  lowThreshold: 475.0 },
]

export const DEFAULT_LAKE = LAKES.find(l => l.id === 'travis')!

// Lake Travis lives at the bare root — it's the default lake and the site's
// primary SEO target. The other five get their own `/lake-<slug>` path.
export function lakePath(lake: Lake): string {
  return lake.id === DEFAULT_LAKE.id ? '/' : `/lake-${lake.slug}`
}

// Note: '/' deliberately doesn't resolve to DEFAULT_LAKE here — a bare root
// request might still carry a legacy `?lake=<other>` query string that
// should win, so that fallback is left to the caller's resolution chain.
export function lakeFromPath(pathname: string): Lake | null {
  const match = /^\/lake-([a-z-]+)\/?$/.exec(pathname)
  if (!match) return null
  return LAKES.find(l => l.slug === match[1]) ?? null
}
