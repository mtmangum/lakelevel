export type Units = 'ft' | 'm'

const FT_TO_M = 0.3048
const FT3_TO_M3 = 0.0283168

const cfsFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

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

export function formatFlow(cfs: number, units: Units): string {
  if (units === 'ft') return `${cfsFormat.format(cfs)} cfs`
  return `${(cfs * FT3_TO_M3).toFixed(1)} cms`
}
