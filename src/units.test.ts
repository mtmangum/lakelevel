import { describe, it, expect } from 'vitest'
import { toDisplayValue, fromDisplayValue, formatLevel, formatSignedLevel, formatFlow } from './units'

describe('toDisplayValue / fromDisplayValue', () => {
  it('passes feet through unchanged', () => {
    expect(toDisplayValue(681, 'ft')).toBe(681)
    expect(fromDisplayValue(681, 'ft')).toBe(681)
  })

  it('converts feet to meters and back', () => {
    expect(toDisplayValue(100, 'm')).toBeCloseTo(30.48, 5)
    expect(fromDisplayValue(30.48, 'm')).toBeCloseTo(100, 5)
  })
})

describe('formatLevel', () => {
  it('shows one decimal in feet under 1000', () => {
    expect(formatLevel(681, 'ft')).toBe('681.0 ft')
  })

  it('drops decimals in feet at/above 1000', () => {
    expect(formatLevel(1020.7, 'ft')).toBe('1021 ft')
  })

  it('always keeps one decimal in meters, even at large magnitudes', () => {
    expect(formatLevel(3300, 'm')).toBe('1005.8 m')
  })
})

describe('formatSignedLevel', () => {
  it('prefixes a + for zero and positive deltas', () => {
    expect(formatSignedLevel(13.14, 'ft')).toBe('+13.1 ft')
    expect(formatSignedLevel(0, 'ft')).toBe('+0.0 ft')
  })

  it('leaves the sign as-is for negative deltas', () => {
    expect(formatSignedLevel(-5.06, 'ft')).toBe('-5.1 ft')
  })
})

describe('formatFlow', () => {
  it('formats whole, comma-grouped cfs', () => {
    expect(formatFlow(568, 'ft')).toBe('568 cfs')
    expect(formatFlow(1234.6, 'ft')).toBe('1,235 cfs')
  })

  it('converts to one-decimal cms for metric units', () => {
    expect(formatFlow(100, 'm')).toBe('2.8 cms')
  })
})
