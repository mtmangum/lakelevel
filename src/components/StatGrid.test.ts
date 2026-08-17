import { describe, it, expect } from 'vitest'
import { classifyFlow } from './StatGrid'

describe('classifyFlow', () => {
  it('is unknown with no data', () => {
    expect(classifyFlow(null, 1)).toBeNull()
    expect(classifyFlow(null, -1)).toBeNull()
  })

  it('reports inflow magnitude only when net flow is positive beyond the noise floor', () => {
    expect(classifyFlow(15, 1)).toBe(15)
    expect(classifyFlow(5, 1)).toBe('steady')
    expect(classifyFlow(-15, 1)).toBe('steady') // net outflow -> no notable inflow
  })

  it('reports outflow magnitude only when net flow is negative beyond the noise floor', () => {
    expect(classifyFlow(-15, -1)).toBe(15)
    expect(classifyFlow(-5, -1)).toBe('steady')
    expect(classifyFlow(15, -1)).toBe('steady') // net inflow -> no notable outflow
  })

  it('treats the noise-floor boundary itself as steady (strictly greater-than, not >=)', () => {
    expect(classifyFlow(10, 1)).toBe('steady')
    expect(classifyFlow(10.01, 1)).toBeCloseTo(10.01)
    expect(classifyFlow(-10, -1)).toBe('steady')
    expect(classifyFlow(-10.01, -1)).toBeCloseTo(10.01)
  })
})
