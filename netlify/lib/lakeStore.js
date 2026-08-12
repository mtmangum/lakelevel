// Shared helper so lake-csv.js and sync-lake-data.js agree on the Blobs
// store name. Non-production deploy contexts (branch deploys, deploy
// previews, local `netlify dev`) get their own store so they never read
// or write production's cached data.
import { getStore } from '@netlify/blobs'

export function getLakeStore() {
  const context = process.env.CONTEXT
  const isProd = context === 'production'
  const name = isProd ? 'lake-data' : `lake-data-${process.env.BRANCH || context || 'dev'}`
  return getStore(name)
}
