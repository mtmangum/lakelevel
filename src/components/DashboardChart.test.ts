import { describe, it, expect } from 'vitest'
import type { Lake } from '../data/lakes'
import { ftToSvgY } from '../data/lakes'
import type { DailyReading, Point } from '../types'
import type { MonthlyAvg } from '../hooks/useAppState'
import {
  buildSegments, evalBezier, readingToSvgX, buildPathD, levelYAtX,
  computeYRange, computeGridlines, computeDateTicks, dateLabel,
  seriesFromReadings, seriesFromAvgs,
  zoomRangeFromDrag, pushZoom, popZoom,
  type YearSeries,
} from './DashboardChart'

// Round numbers make the svgY <-> ft math easy to check by hand:
// fullPool 700 -> svgY 34, lowThreshold 600 -> svgY 226 (192-unit span / 100ft).
const lake: Lake = {
  id: 'test', name: 'TEST LAKE', displayName: 'Test Lake', slug: 'test',
  location: 'TEST, TX', metaLocation: 'Test, TX',
  fullPool: 700, lowThreshold: 600,
}

function reading(month: number, day: number, waterLevel: number): DailyReading {
  return { date: `2025-${month}-${day}`, year: 2025, month, day, waterLevel, percentFull: 50, storage: 0 }
}

// ─── readingToSvgX ──────────────────────────────────────────────────────────

describe('readingToSvgX', () => {
  it('places Jan 1 at the chart origin', () => {
    expect(readingToSvgX(1, 1)).toBe(40)
  })

  it('places Mar 1 at 2 full months in', () => {
    expect(readingToSvgX(3, 1)).toBe(200)
  })

  it('places Dec 31 near, but under, the far edge', () => {
    expect(readingToSvgX(12, 31)).toBeCloseTo(997.419, 2)
  })
})

// ─── buildSegments / evalBezier ─────────────────────────────────────────────

describe('buildSegments + evalBezier', () => {
  it('produces one curve per point-to-point span', () => {
    const pts: Point[] = [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 0 }, { x: 3, y: 1 }]
    const curves = buildSegments(pts)
    expect(curves).toHaveLength(pts.length - 1)
    curves.forEach((c, i) => expect(c.end).toEqual(pts[i + 1]))
  })

  it('stays exactly on a straight line for collinear points (any Catmull-Rom weighting is still an affine combination of collinear points)', () => {
    const pts: Point[] = Array.from({ length: 6 }, (_, i) => ({ x: i * 10, y: i * 5 })) // y = x / 2
    const curves = buildSegments(pts)
    for (let t = 0; t <= curves.length; t += 0.25) {
      const p = evalBezier(curves, pts[0], t)
      expect(p.y).toBeCloseTo(p.x / 2, 6)
    }
  })

  it('returns the start point at t=0 and the final curve end at t=curves.length', () => {
    const pts: Point[] = [{ x: 0, y: 0 }, { x: 1, y: 3 }, { x: 2, y: 1 }]
    const curves = buildSegments(pts)
    expect(evalBezier(curves, pts[0], 0)).toEqual(pts[0])
    expect(evalBezier(curves, pts[0], curves.length)).toEqual(pts.at(-1))
  })

  it('returns the start point unchanged when there are no curves', () => {
    expect(evalBezier([], { x: 5, y: 9 }, 0.5)).toEqual({ x: 5, y: 9 })
  })
})

// ─── buildPathD ──────────────────────────────────────────────────────────────

describe('buildPathD', () => {
  it('starts with an M command at the scaled start point', () => {
    const pts: Point[] = [{ x: 0, y: 0 }, { x: 10, y: 10 }]
    const curves = buildSegments(pts)
    const d = buildPathD(pts[0], curves, pts[1], [0, 10], [0, 10], 100, 100)
    expect(d.startsWith('M0.00,0.00')).toBe(true)
  })

  it('emits one C command per curve', () => {
    const pts: Point[] = [{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 0 }]
    const curves = buildSegments(pts)
    const d = buildPathD(pts[0], curves, pts.at(-1)!, [0, 20], [0, 20], 100, 100)
    expect(d.match(/C/g)).toHaveLength(curves.length)
  })

  it('clamps y values that fall outside yRange instead of overshooting', () => {
    const pts: Point[] = [{ x: 0, y: -50 }, { x: 10, y: 10 }] // -50 is below yRange[0]
    const curves = buildSegments(pts)
    const d = buildPathD(pts[0], curves, pts[1], [0, 10], [0, 100], 100, 100)
    // Clamped to yRange[0]=0 -> scaled py = (0-0)*sy = 0, not negative.
    expect(d.startsWith('M0.00,0.00')).toBe(true)
  })
})

// ─── levelYAtX ───────────────────────────────────────────────────────────────

describe('levelYAtX', () => {
  const pts: Point[] = [{ x: 0, y: 0 }, { x: 100, y: 50 }] // straight line, y = x / 2
  const series: YearSeries = { id: 'a', year: 'a', color: '#000', start: pts[0], curves: buildSegments(pts), end: pts[1] }

  it('interpolates linearly along a straight two-point series', () => {
    expect(levelYAtX(series, 40)).toBeCloseTo(20, 5)
    expect(levelYAtX(series, 0)).toBeCloseTo(0, 5)
    expect(levelYAtX(series, 100)).toBeCloseTo(50, 5)
  })

  it('returns null outside the series x-range', () => {
    expect(levelYAtX(series, -10)).toBeNull()
    expect(levelYAtX(series, 200)).toBeNull()
  })
})

// ─── computeYRange ───────────────────────────────────────────────────────────

describe('computeYRange', () => {
  it('falls back to the default frame when there are no in-range points', () => {
    expect(computeYRange([], lake, [0, 1000])).toEqual([34, 226])
  })

  it('produces top < bot (SVG y grows downward) and brackets a flat series', () => {
    const flatFt = 650
    const y = ftToSvgY(lake, flatFt)
    const pts: Point[] = [{ x: 0, y }, { x: 500, y }, { x: 1000, y }]
    const series: YearSeries = { id: 'flat', year: 'flat', color: '#000', start: pts[0], curves: buildSegments(pts), end: pts.at(-1)! }
    const [top, bot] = computeYRange([series], lake, [0, 1000])
    expect(top).toBeLessThan(bot)
    expect(y).toBeGreaterThanOrEqual(top)
    expect(y).toBeLessThanOrEqual(bot)
  })

  it('ignores points outside the given xRange', () => {
    const flatFt = 650, outlierFt = 610
    const flatY = ftToSvgY(lake, flatFt), outlierY = ftToSvgY(lake, outlierFt)
    const pts: Point[] = [{ x: 0, y: flatY }, { x: 500, y: flatY }, { x: 999, y: outlierY }]
    const series: YearSeries = { id: 's', year: 's', color: '#000', start: pts[0], curves: buildSegments(pts), end: pts.at(-1)! }

    const [, botWithOutlier] = computeYRange([series], lake, [0, 1000])
    const [, botWithoutOutlier] = computeYRange([series], lake, [0, 400])

    // Excluding the outlier keeps the frame tighter around the flat value —
    // the bottom edge (closer to the low outlier) should sit at a smaller
    // svgY (higher on screen) once the outlier is out of range.
    expect(botWithoutOutlier).toBeLessThan(botWithOutlier)
  })
})

// ─── computeGridlines ────────────────────────────────────────────────────────

describe('computeGridlines', () => {
  it('every gridline round-trips to the svgY computed from its own ft value', () => {
    const yRange: [number, number] = [ftToSvgY(lake, 680), ftToSvgY(lake, 620)]
    const lines = computeGridlines(lake, yRange, 'ft', false)
    for (const gl of lines) expect(gl.svgY).toBeCloseTo(ftToSvgY(lake, gl.ft), 6)
  })

  it('sorts descending by feet (chart top to bottom)', () => {
    const yRange: [number, number] = [ftToSvgY(lake, 680), ftToSvgY(lake, 620)]
    const lines = computeGridlines(lake, yRange, 'ft', false)
    for (let i = 1; i < lines.length; i++) expect(lines[i].ft).toBeLessThanOrEqual(lines[i - 1].ft)
  })

  it('flags fullPool and lowThreshold as accent lines when in range', () => {
    const yRange: [number, number] = [ftToSvgY(lake, 700), ftToSvgY(lake, 600)]
    const lines = computeGridlines(lake, yRange, 'ft', false)
    const fullPoolLine = lines.find(l => Math.abs(l.ft - lake.fullPool) < 0.01)
    const lowLine = lines.find(l => Math.abs(l.ft - lake.lowThreshold) < 0.01)
    expect(fullPoolLine?.isAccent).toBe(true)
    expect(lowLine?.isAccent).toBe(true)
  })

  it('uses a finer step in dense mode', () => {
    const yRange: [number, number] = [ftToSvgY(lake, 660), ftToSvgY(lake, 640)] // 20ft span -> baseStep 5
    const sparse = computeGridlines(lake, yRange, 'ft', false)
    const dense = computeGridlines(lake, yRange, 'ft', true)
    expect(dense.length).toBeGreaterThan(sparse.length)
  })
})

// ─── computeDateTicks ────────────────────────────────────────────────────────

describe('computeDateTicks', () => {
  it('returns one tick per month for the full-year view', () => {
    const ticks = computeDateTicks([0, 1000])
    expect(ticks).toHaveLength(12)
    expect(ticks[0]).toEqual({ x: 40, label: 'JAN' })
  })

  it('returns denser, in-range ticks for a narrow zoom', () => {
    const ticks = computeDateTicks([40, 120]) // ~Jan, zoomed to under 10 days-equivalent width isn't guaranteed, just check bounds
    expect(ticks.length).toBeGreaterThan(0)
    for (const t of ticks) expect(t.x).toBeGreaterThanOrEqual(38)
  })
})

// ─── dateLabel ───────────────────────────────────────────────────────────────

describe('dateLabel', () => {
  it('labels the chart origin as Jan 1', () => {
    expect(dateLabel(40)).toBe('JAN 1')
  })

  it('labels the start of March correctly', () => {
    expect(dateLabel(200)).toBe('MAR 1')
  })

  it('clamps an out-of-range x to Dec 31 rather than overflowing', () => {
    expect(dateLabel(999)).toBe('DEC 31')
  })
})

// ─── seriesFromReadings / seriesFromAvgs ────────────────────────────────────

describe('seriesFromReadings', () => {
  it('returns null with fewer than 2 rows', () => {
    expect(seriesFromReadings([], '2025', '#000', lake)).toBeNull()
    expect(seriesFromReadings([reading(1, 1, 650)], '2025', '#000', lake)).toBeNull()
  })

  it('builds start/end points from the first and last reading', () => {
    const rows = [reading(1, 1, 650), reading(6, 15, 660), reading(12, 31, 640)]
    const s = seriesFromReadings(rows, '2025', '#f00', lake)!
    expect(s.start).toEqual({ x: readingToSvgX(1, 1), y: ftToSvgY(lake, 650) })
    expect(s.end).toEqual({ x: readingToSvgX(12, 31), y: ftToSvgY(lake, 640) })
  })

  it('only sets dotPosition when dotAtEnd is true', () => {
    const rows = [reading(1, 1, 650), reading(6, 15, 660)]
    expect(seriesFromReadings(rows, '2025', '#f00', lake, true)!.dotPosition).toBeDefined()
    expect(seriesFromReadings(rows, '2025', '#f00', lake, false)!.dotPosition).toBeUndefined()
  })
})

describe('seriesFromAvgs', () => {
  it('returns null with fewer than 2 months', () => {
    expect(seriesFromAvgs([{ month: 1, level: 650 }], lake, '#000')).toBeNull()
  })

  it('extends the December level out to the end of the x-axis', () => {
    const avgs: MonthlyAvg[] = [{ month: 1, level: 650 }, { month: 12, level: 670 }]
    const s = seriesFromAvgs(avgs, lake, '#000')!
    expect(s.end).toEqual({ x: 1000, y: ftToSvgY(lake, 670) })
  })

  it('falls back to the last available month if December is missing', () => {
    const avgs: MonthlyAvg[] = [{ month: 1, level: 650 }, { month: 6, level: 655 }]
    const s = seriesFromAvgs(avgs, lake, '#000')!
    expect(s.end).toEqual({ x: 1000, y: ftToSvgY(lake, 655) })
  })
})

// ─── Zoom history ────────────────────────────────────────────────────────────

describe('zoomRangeFromDrag', () => {
  it('maps a full-width drag back to the current range', () => {
    expect(zoomRangeFromDrag([0, 1000], 0, 100, 100)).toEqual([0, 1000])
  })

  it('scales a partial drag against the currently visible range', () => {
    // Currently zoomed to [200, 700] (span 500) over a 100px chart;
    // dragging px 20..60 should map to svg 200+100 .. 200+300.
    expect(zoomRangeFromDrag([200, 700], 20, 60, 100)).toEqual([300, 500])
  })

  it('clamps to [0, 1000]', () => {
    expect(zoomRangeFromDrag([0, 1000], -50, 1050, 100)).toEqual([0, 1000])
  })
})

describe('pushZoom / popZoom', () => {
  it('pushZoom appends to the end of history', () => {
    expect(pushZoom([[0, 1000]], [100, 900])).toEqual([[0, 1000], [100, 900]])
  })

  it('popZoom returns null range and unchanged (empty) history when nothing to pop', () => {
    expect(popZoom([])).toEqual({ history: [], range: null })
  })

  it('popZoom returns the most recent range and the shortened history', () => {
    const history: Array<[number, number]> = [[0, 1000], [100, 900]]
    expect(popZoom(history)).toEqual({ history: [[0, 1000]], range: [100, 900] })
  })
})

