import type { Lake } from './data/lakes'
import { lakePath } from './data/lakes'

const SITE_ORIGIN = 'https://highlandlakelevels.org'

function setMetaContent(selector: string, content: string) {
  document.querySelector(selector)?.setAttribute('content', content)
}

export function syncSeoTags(lake: Lake) {
  const title = `${lake.displayName} Water Level Today — Live Monitor | ${lake.metaLocation}`
  const description = `Live water level for ${lake.displayName}, one of the six Highland Lakes near Austin, TX. Current level, inflow/outflow, and 5-year charts, updated hourly from LCRA data.`
  const url = `${SITE_ORIGIN}${lakePath(lake)}`

  document.title = title
  setMetaContent('meta[name="description"]', description)
  setMetaContent('meta[property="og:title"]', `${lake.displayName} Water Level Today — Live Monitor`)
  setMetaContent('meta[property="og:description"]', description)
  setMetaContent('meta[property="og:url"]', url)
  setMetaContent('meta[name="twitter:title"]', `${lake.displayName} Water Level Today — Live Monitor`)
  setMetaContent('meta[name="twitter:description"]', description)
  document.querySelector('link[rel="canonical"]')?.setAttribute('href', url)
}
