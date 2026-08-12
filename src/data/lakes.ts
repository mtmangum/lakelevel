export interface Lake {
  id:           string
  name:         string
  location:     string
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
  { id: 'buchanan',         name: 'LAKE BUCHANAN',     location: 'BURNET COUNTY, TX', fullPool: 1020.5, lowThreshold: 920.0 },
  { id: 'inks',             name: 'LAKE INKS',          location: 'BURNET COUNTY, TX', fullPool: 888.25, lowThreshold: 848.0 },
  { id: 'lyndon-b-johnson', name: 'LAKE LBJ',           location: 'LLANO COUNTY, TX',  fullPool: 824.0,  lowThreshold: 815.0 },
  { id: 'marble-falls',     name: 'LAKE MARBLE FALLS',  location: 'BURNET COUNTY, TX', fullPool: 738.5,  lowThreshold: 710.0 },
  { id: 'travis',           name: 'LAKE TRAVIS',        location: 'AUSTIN, TX',         fullPool: 681.0,  lowThreshold: 605.0 },
  { id: 'austin',           name: 'LAKE AUSTIN',        location: 'AUSTIN, TX',         fullPool: 492.0,  lowThreshold: 475.0 },
]

export const DEFAULT_LAKE = LAKES.find(l => l.id === 'travis')!
