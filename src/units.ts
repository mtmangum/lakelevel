export type Units = 'ft' | 'm'

const FT_TO_M = 0.3048

export function toDisplayValue(ft: number, units: Units): number {
  return units === 'm' ? ft * FT_TO_M : ft
}

export function fromDisplayValue(value: number, units: Units): number {
  return units === 'm' ? value / FT_TO_M : value
}

export function formatLevel(ft: number, units: Units): string {
  const v = toDisplayValue(ft, units)
  const decimals = units === 'ft' && Math.abs(v) >= 1000 ? 0 : 1
  return `${v.toFixed(decimals)} ${units}`
}

export function formatSignedLevel(ftDelta: number, units: Units): string {
  const v = toDisplayValue(ftDelta, units)
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)} ${units}`
}
