import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react'
import type { DailyReading, Point, CubicSegment } from '../types'
import type { Lake } from '../data/lakes'
import { ftToSvgY, svgYToFt } from '../data/lakes'
import type { Theme } from '../theme'
import { COLORS } from '../theme'
import type { MonthlyAvg } from '../hooks/useAppState'

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTH_NAMES  = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
const DAYS_IN_MONTH = [31,28,31,30,31,30,31,31,30,31,30,31]
const K_AVG = '30-YR AVG'

const YEAR_COLORS: Record<string, string> = {
  '2026': COLORS.water,
  '2025': COLORS.neutral500,
  '2024': COLORS.neutral600,
  '2023': COLORS.neutral700,
  '2022': COLORS.neutral800,
}

const PAD_LEFT   = 44   // y-axis label column width
const PAD_BOTTOM = 30   // x-axis label row height

// ─── Types ────────────────────────────────────────────────────────────────────

interface YearSeries {
  id: string
  year: string
  color: string
  start: Point
  curves: CubicSegment[]
  end: Point
  dotPosition?: Point
}

// ─── Pure math ────────────────────────────────────────────────────────────────

function buildSegments(pts: Point[]): CubicSegment[] {
  return pts.slice(0, -1).map((_, i) => {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i]
    const p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)]
    return {
      c1:  { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 },
      c2:  { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 },
      end: p2,
    }
  })
}

function evalBezier(curves: CubicSegment[], start: Point, t: number): Point {
  if (!curves.length) return start
  const i = Math.min(Math.floor(t), curves.length - 1)
  const lt = t - i
  const p0 = i === 0 ? start : curves[i - 1].end
  const { c1, c2, end } = curves[i]
  const u = 1 - lt
  return {
    x: u*u*u*p0.x + 3*u*u*lt*c1.x + 3*u*lt*lt*c2.x + lt*lt*lt*end.x,
    y: u*u*u*p0.y + 3*u*u*lt*c1.y + 3*u*lt*lt*c2.y + lt*lt*lt*end.y,
  }
}

function readingToSvgX(month: number, day: number): number {
  return 40 + (month - 1) * 80 + (day - 1) / DAYS_IN_MONTH[month - 1] * 80
}

function buildPathD(
  start: Point, curves: CubicSegment[], end: Point,
  xRange: [number, number], yRange: [number, number],
  w: number, h: number
): string {
  const sx = w / (xRange[1] - xRange[0]), sy = h / (yRange[1] - yRange[0])
  const px = (x: number) => ((x - xRange[0]) * sx).toFixed(2)
  const py = (y: number) => ((y - yRange[0]) * sy).toFixed(2)
  const parts = [`M${px(start.x)},${py(start.y)}`]
  for (const { c1, c2, end: e } of curves)
    parts.push(`C${px(c1.x)},${py(c1.y)} ${px(c2.x)},${py(c2.y)} ${px(e.x)},${py(e.y)}`)
  const lastEnd = curves.at(-1)?.end
  if (lastEnd && (lastEnd.x !== end.x || lastEnd.y !== end.y))
    parts.push(`L${px(end.x)},${py(end.y)}`)
  return parts.join('')
}

function levelYAtX(series: YearSeries, targetX: number): number | null {
  const n = series.curves.length
  const samples = Math.max(600, n * 2)
  let prev = series.start
  for (let i = 1; i <= samples; i++) {
    const pt = evalBezier(series.curves, series.start, (i / samples) * n)
    if (prev.x <= targetX && pt.x >= targetX) {
      const dx = pt.x - prev.x
      return dx === 0 ? prev.y : prev.y + (targetX - prev.x) / dx * (pt.y - prev.y)
    }
    prev = pt
  }
  const last = series.curves.at(-1)?.end
  if (last && last.x <= targetX && series.end.x >= targetX) {
    const dx = series.end.x - last.x
    return dx === 0 ? last.y : last.y + (targetX - last.x) / dx * (series.end.y - last.y)
  }
  return null
}

// ─── Y-range ──────────────────────────────────────────────────────────────────

function computeYRange(series: YearSeries[], lake: Lake, xRange: [number, number]): [number, number] {
  const [xLo, xHi] = xRange
  let minY = 9999, maxY = -9999, found = false
  const extend = ({ x, y }: Point) => {
    if (x < xLo || x > xHi) return
    if (!found) { minY = y; maxY = y; found = true }
    else { minY = Math.min(minY, y); maxY = Math.max(maxY, y) }
  }
  for (const s of series) {
    extend(s.start)
    const n = s.curves.length, samples = Math.max(200, n)
    for (let i = 1; i <= samples; i++) extend(evalBezier(s.curves, s.start, (i / samples) * n))
    extend(s.end)
  }
  if (!found) return [34, 226]
  const ceil = lake.fullPool + 29, floor = lake.lowThreshold - 45
  const hi = svgYToFt(lake, minY), lo = svgYToFt(lake, maxY)
  const pad = Math.max(0.5, (hi - lo) * 0.15)
  const mid = (Math.min(ceil, hi + pad) + Math.max(floor, lo - pad)) / 2
  const half = Math.max((lake.fullPool - lake.lowThreshold) * 0.05, (Math.min(ceil, hi + pad) - Math.max(floor, lo - pad)) / 2)
  const top = ftToSvgY(lake, Math.min(ceil, mid + half))
  const bot = ftToSvgY(lake, Math.max(floor, mid - half))
  return top < bot ? [top, bot] : [34, 226]
}

// ─── Gridlines ────────────────────────────────────────────────────────────────

function computeGridlines(lake: Lake, yRange: [number, number]) {
  const [yLo, yHi] = yRange
  const top = svgYToFt(lake, yLo), bot = svgYToFt(lake, yHi), span = top - bot
  const step = span < 3 ? 0.5 : span < 6 ? 1 : span < 12 ? 2 : span < 25 ? 5 : span < 150 ? 10 : 20
  const ftSet = new Set<number>()
  let f = Math.ceil(bot / step) * step
  while (f <= top + step * 0.01) { ftSet.add(f); f += step }
  for (const anchor of [lake.fullPool, lake.lowThreshold]) {
    if (anchor >= bot - 0.5 && anchor <= top + 0.5) {
      ftSet.forEach(v => { if (Math.abs(v - anchor) < 3) ftSet.delete(v) })
      ftSet.add(anchor)
    }
  }
  return [...ftSet].sort((a, b) => b - a).flatMap(ft => {
    const svgY = ftToSvgY(lake, ft)
    if (svgY < yLo - 1 || svgY > yHi + 1) return []
    const isAccent = Math.abs(ft - lake.fullPool) < 0.01 || Math.abs(ft - lake.lowThreshold) < 0.01
    const label = ft >= 1000 ? Math.round(ft).toString() : ft === Math.floor(ft) ? `${ft}` : ft.toFixed(1)
    return [{ ft, svgY, isAccent, label }]
  })
}

// ─── Date ticks ───────────────────────────────────────────────────────────────

function computeDateTicks(xRange: [number, number]): Array<{ x: number; label: string }> {
  const [xLo, xHi] = xRange
  const span = xHi - xLo
  const days = span / 80 * 30.5
  if (days > 270) {
    return MONTH_NAMES
      .map((name, i) => ({ x: 40 + i * 80, label: name }))
      .filter(t => t.x >= xLo - 5 && t.x <= xHi + 5)
  }
  const step = days < 10 ? 1 : days < 21 ? 2 : days < 45 ? 3 : days < 90 ? 7 : days < 135 ? 10 : 14
  const ticks: Array<{ x: number; label: string }> = []
  for (let m = 0; m < 12; m++) {
    const dim = DAYS_IN_MONTH[m]
    for (let d = 1; d <= dim; d += step) {
      const x = 40 + m * 80 + (d - 1) / dim * 80
      if (x >= xLo - 2 && x <= xHi + 2)
        ticks.push({ x, label: d === 1 ? MONTH_NAMES[m] : `${MONTH_NAMES[m]} ${d}` })
    }
  }
  return ticks
}

function dateLabel(svgX: number): string {
  const adj = Math.max(0, svgX - 40)
  const mi  = Math.max(0, Math.min(11, Math.floor(adj / 80)))
  const pos = (adj - mi * 80) / 80
  const day = Math.max(1, Math.min(DAYS_IN_MONTH[mi], Math.floor(pos * DAYS_IN_MONTH[mi]) + 1))
  return `${MONTH_NAMES[mi]} ${day}`
}

// ─── Series builders ──────────────────────────────────────────────────────────

function seriesFromReadings(
  rows: DailyReading[], year: string, color: string, lake: Lake, dotAtEnd = false
): YearSeries | null {
  if (rows.length < 2) return null
  const pts = rows.map(r => ({ x: readingToSvgX(r.month, r.day), y: ftToSvgY(lake, r.waterLevel) }))
  const curves = buildSegments(pts)
  return { id: year, year, color, start: pts[0], curves, end: pts.at(-1)!, dotPosition: dotAtEnd ? pts.at(-1) : undefined }
}

function seriesFromAvgs(avgs: MonthlyAvg[], lake: Lake, color: string): YearSeries | null {
  if (avgs.length < 2) return null
  const pts = avgs.map(a => ({ x: 40 + (a.month - 1) * 80, y: ftToSvgY(lake, a.level) }))
  const dec = avgs.find(a => a.month === 12)?.level ?? avgs.at(-1)!.level
  pts.push({ x: 1000, y: ftToSvgY(lake, dec) })
  return { id: K_AVG, year: K_AVG, color, start: pts[0], curves: buildSegments(pts), end: pts.at(-1)! }
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  theme: Theme
  lake: Lake
  readings: DailyReading[]
  chartYearDailyReadings: Record<number, DailyReading[]>
  thirtyYearMonthlyAvgs: MonthlyAvg[]
}

export function DashboardChart({ theme, lake, readings, chartYearDailyReadings, thirtyYearMonthlyAvgs }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 800, h: 320 })
  const [xRange, setXRange] = useState<[number, number]>([0, 1000])
  const [hidden, setHidden]   = useState<Set<string>>(new Set())
  const [hoverX, setHoverX]   = useState<number | null>(null)
  const [hoverY, setHoverY]   = useState<number | null>(null)
  const [dragStart, setDragStart] = useState<number | null>(null)
  const [dragEnd,   setDragEnd]   = useState<number | null>(null)

  useEffect(() => {
    const el = containerRef.current; if (!el) return
    const obs = new ResizeObserver(([e]) => {
      const { width: w, height: h } = e.contentRect
      setSize({ w, h })
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    setXRange([0, 1000]); setHidden(new Set()); setHoverX(null); setHoverY(null)
  }, [lake.id])

  // Series
  const allSeries = useMemo<YearSeries[]>(() => {
    const s2026 = seriesFromReadings(readings.filter(r => r.year === 2026), '2026', COLORS.water, lake, true)
    const hist  = [2025, 2024, 2023, 2022].flatMap(yr => {
      const r = chartYearDailyReadings[yr]
      const s = r?.length ? seriesFromReadings(r, `${yr}`, YEAR_COLORS[`${yr}`] ?? COLORS.neutral600, lake) : null
      return s ? [s] : []
    })
    return [s2026, ...hist].filter(Boolean) as YearSeries[]
  }, [readings, chartYearDailyReadings, lake])

  const avgSeries = useMemo(
    () => seriesFromAvgs(thirtyYearMonthlyAvgs, lake, theme.chartAvgLine),
    [thirtyYearMonthlyAvgs, lake, theme.chartAvgLine]
  )

  const allIds = useMemo(() => [...allSeries.map(s => s.id), K_AVG], [allSeries])

  // Y range (from visible series within x-range)
  const visibleForRange = useMemo(() => {
    const base = allSeries.filter(s => !hidden.has(s.id))
    return !hidden.has(K_AVG) && avgSeries ? [...base, avgSeries] : base
  }, [allSeries, avgSeries, hidden])

  const yRange = useMemo(() => computeYRange(visibleForRange, lake, xRange), [visibleForRange, lake, xRange])

  const chartW = size.w - PAD_LEFT
  const chartH = size.h - PAD_BOTTOM

  const toSX = (sx: number) => (sx - xRange[0]) / (xRange[1] - xRange[0]) * chartW
  const toSY = (sy: number) => (sy - yRange[0]) / (yRange[1] - yRange[0]) * chartH

  // Memoized gridlines & ticks
  const gridlines = useMemo(() => computeGridlines(lake, yRange), [lake, yRange])
  const dateTicks = useMemo(() => computeDateTicks(xRange), [xRange])

  // Path strings — expensive, memoized
  const pathMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const s of [...allSeries, avgSeries].filter(Boolean) as YearSeries[])
      m.set(s.id, buildPathD(s.start, s.curves, s.end, xRange, yRange, chartW, chartH))
    return m
  }, [allSeries, avgSeries, xRange, yRange, chartW, chartH])

  // Crosshair SVG X
  const svgX = hoverX !== null ? hoverX / chartW * (xRange[1] - xRange[0]) + xRange[0] : null

  // Tooltip rows
  const tooltipRows = useMemo(() => {
    if (svgX === null || dragStart !== null) return []
    const rows: Array<{ id: string; color: string; label: string; dashed: boolean; ft: string }> = []
    for (const s of allSeries) {
      if (hidden.has(s.id)) continue
      const y = levelYAtX(s, svgX)
      if (y !== null) rows.push({ id: s.id, color: s.color, label: s.year, dashed: false, ft: `${svgYToFt(lake, y).toFixed(1)} ft` })
    }
    if (!hidden.has(K_AVG) && avgSeries) {
      const y = levelYAtX(avgSeries, svgX)
      if (y !== null) rows.push({ id: K_AVG, color: theme.chartAvgLine, label: K_AVG, dashed: true, ft: `${svgYToFt(lake, y).toFixed(1)} ft` })
    }
    return rows
  }, [svgX, dragStart, allSeries, avgSeries, hidden, lake, theme.chartAvgLine])

  const isZoomed = xRange[0] > 1 || xRange[1] < 999
  const showTooltip = tooltipRows.length > 0 && hoverX !== null
  const flipLeft    = (hoverX ?? 0) > chartW * 0.62
  const tooltipX    = PAD_LEFT + (hoverX ?? 0) + (flipLeft ? -90 : 90)
  const tooltipY    = Math.max(90, Math.min(hoverY ?? 0, chartH - 120))

  // Interaction
  const onMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - r.left, y = e.clientY - r.top
    setHoverX(x); setHoverY(y)
    if (dragStart !== null) setDragEnd(x)
  }, [dragStart])

  const onMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    setDragStart(e.clientX - e.currentTarget.getBoundingClientRect().left)
    setDragEnd(null)
  }, [])

  const onMouseUp = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (dragStart === null) return
    const x = e.clientX - e.currentTarget.getBoundingClientRect().left
    const lo = Math.min(dragStart, x), hi = Math.max(dragStart, x)
    if (hi - lo > 15) {
      const span = xRange[1] - xRange[0]
      setXRange([
        Math.max(0, xRange[0] + (lo / chartW) * span),
        Math.min(1000, xRange[0] + (hi / chartW) * span),
      ])
    }
    setDragStart(null); setDragEnd(null)
  }, [dragStart, xRange, chartW])

  const toggle = useCallback((id: string) => {
    setHidden(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  }, [])

  const isolate = useCallback((id: string) => {
    setHidden(p => {
      const isIso = !p.has(id) && allIds.filter(i => i !== id).every(i => p.has(i))
      return isIso ? new Set<string>() : new Set(allIds.filter(i => i !== id))
    })
  }, [allIds])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', paddingTop: 14 }}>
      {/* Title + reset + legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, paddingLeft: PAD_LEFT }}>
        <span style={{ fontSize: 14.5, fontWeight: 900, letterSpacing: '0.2px', color: theme.text }}>WATER LEVEL</span>
        {isZoomed && (
          <button onClick={() => setXRange([0, 1000])} style={{
            background: 'none', border: `1px solid ${COLORS.water}80`,
            color: COLORS.water, fontFamily: 'inherit',
            fontSize: 10, fontWeight: 700, letterSpacing: '0.4px', padding: '3px 7px', cursor: 'pointer',
          }}>
            RESET
          </button>
        )}
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {allSeries.map(s => (
            <LegendItem key={s.id} id={s.id} label={s.year} color={s.color} dashed={false}
              hidden={hidden.has(s.id)} onToggle={toggle} onIsolate={isolate} theme={theme} />
          ))}
          <LegendItem id={K_AVG} label={K_AVG} color={theme.chartAvgLine} dashed={true}
            hidden={hidden.has(K_AVG)} onToggle={toggle} onIsolate={isolate} theme={theme} />
        </div>
      </div>

      {/* Chart */}
      <div ref={containerRef} style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        {/* Y-axis labels */}
        {gridlines.map(gl => (
          <span key={gl.ft} style={{
            position: 'absolute', left: 0, top: toSY(gl.svgY) - 4,
            width: PAD_LEFT - 4, textAlign: 'right',
            fontSize: 10.5, fontWeight: gl.isAccent ? 700 : 400, lineHeight: 1,
            color: gl.isAccent ? theme.accent : theme.textMuted(0.35), userSelect: 'none',
          }}>
            {gl.label}
          </span>
        ))}

        {/* SVG chart area */}
        <svg
          style={{ position: 'absolute', left: PAD_LEFT, top: 0, width: chartW, height: chartH, cursor: 'crosshair' }}
          onMouseMove={onMouseMove}
          onMouseLeave={() => { setHoverX(null); setHoverY(null) }}
          onMouseDown={onMouseDown}
          onMouseUp={onMouseUp}
        >
          {/* Gridlines */}
          {gridlines.map(gl => {
            const y = toSY(gl.svgY)
            return (
              <line key={gl.ft} x1={0} y1={y} x2={chartW} y2={y}
                stroke={gl.isAccent ? theme.accent : theme.divider}
                strokeWidth={1} strokeDasharray={gl.isAccent ? undefined : '3,5'} />
            )
          })}

          {/* 30-yr avg */}
          {!hidden.has(K_AVG) && avgSeries && pathMap.has(K_AVG) && (
            <path d={pathMap.get(K_AVG)!} fill="none"
              stroke={theme.chartAvgLine} strokeWidth={1.5} strokeDasharray="5,5" />
          )}

          {/* Year lines (reversed → 2026 on top) */}
          {[...allSeries].reverse().map(s => {
            if (hidden.has(s.id)) return null
            const d = pathMap.get(s.id); if (!d) return null
            const dot = s.dotPosition ? { sx: toSX(s.dotPosition.x), sy: toSY(s.dotPosition.y) } : null
            return (
              <g key={s.id}>
                <path d={d} fill="none" stroke={s.color}
                  strokeWidth={s.year === '2026' ? 2.5 : 1.5} strokeLinecap="round" />
                {dot && dot.sx >= 0 && dot.sx <= chartW && (
                  <circle cx={dot.sx} cy={dot.sy} r={4.5} fill={s.color} />
                )}
              </g>
            )
          })}

          {/* Crosshair vertical line */}
          {hoverX !== null && dragStart === null && (
            <line x1={hoverX} y1={0} x2={hoverX} y2={chartH - 28}
              stroke={`${COLORS.water}73`} strokeWidth={1} />
          )}

          {/* Crosshair dots */}
          {svgX !== null && dragStart === null && tooltipRows.map(row => {
            const s = allSeries.find(s => s.id === row.id) ?? avgSeries
            if (!s) return null
            const y = levelYAtX(s, svgX); if (y === null) return null
            return (
              <circle key={row.id} cx={hoverX!} cy={toSY(y)}
                r={row.id === '2026' ? 4.5 : 3.5}
                fill={row.color}
                stroke={row.id === '2026' ? theme.surface : 'none'}
                strokeWidth={2}
              />
            )
          })}

          {/* Drag selection */}
          {dragStart !== null && dragEnd !== null && (() => {
            const lo = Math.min(dragStart, dragEnd), hi = Math.max(dragStart, dragEnd)
            return (
              <g>
                <rect x={lo} y={0} width={hi - lo} height={chartH} fill={`${COLORS.water}1A`} />
                <line x1={lo} y1={0} x2={lo} y2={chartH} stroke={`${COLORS.water}B3`} strokeWidth={1} />
                <line x1={hi} y1={0} x2={hi} y2={chartH} stroke={`${COLORS.water}B3`} strokeWidth={1} />
              </g>
            )
          })()}
        </svg>

        {/* X-axis labels */}
        {dateTicks.map(tick => (
          <span key={`${tick.x}-${tick.label}`} style={{
            position: 'absolute', bottom: 14,
            left: PAD_LEFT + toSX(tick.x), transform: 'translateX(-50%)',
            fontSize: tick.label.length > 3 ? 9.5 : 11,
            color: theme.textMuted(0.55), whiteSpace: 'nowrap', userSelect: 'none',
          }}>
            {tick.label}
          </span>
        ))}

        {/* Tooltip */}
        {showTooltip && hoverX !== null && (
          <div style={{
            position: 'absolute', left: tooltipX, top: tooltipY,
            transform: 'translate(-50%, -50%)',
            background: theme.background, border: `1px solid ${theme.divider}`,
            padding: '8px 10px', pointerEvents: 'none', zIndex: 10, minWidth: 148,
          }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.3px', color: theme.textMuted(0.55), marginBottom: 5 }}>
              {svgX !== null ? dateLabel(svgX) : ''}
            </div>
            {tooltipRows.map(row => (
              <div key={row.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <svg width={10} height={2} style={{ flexShrink: 0 }}>
                  {row.dashed
                    ? <line x1={0} y1={1} x2={10} y2={1} stroke={row.color} strokeWidth={2} strokeDasharray="3,2" />
                    : <line x1={0} y1={1} x2={10} y2={1} stroke={row.color} strokeWidth={2} />
                  }
                </svg>
                <span style={{ fontSize: 11, fontWeight: 600, color: theme.textMuted(0.6), flex: 1 }}>{row.label}</span>
                <span style={{ fontSize: 12, fontWeight: 900, color: theme.text }}>{row.ft}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Legend item ──────────────────────────────────────────────────────────────

function LegendItem({ id, label, color, dashed, hidden, onToggle, onIsolate, theme }: {
  id: string; label: string; color: string; dashed: boolean; hidden: boolean
  onToggle: (id: string) => void; onIsolate: (id: string) => void; theme: Theme
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleClick = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current); timerRef.current = null
      onIsolate(id)
    } else {
      timerRef.current = setTimeout(() => {
        timerRef.current = null; onToggle(id)
      }, 250)
    }
  }
  return (
    <div onClick={handleClick} style={{
      display: 'flex', alignItems: 'center', gap: 5,
      opacity: hidden ? 0.35 : 1, cursor: 'pointer', userSelect: 'none',
    }}>
      <svg width={14} height={2.5}>
        {dashed
          ? <line x1={0} y1={1.25} x2={14} y2={1.25} stroke={hidden ? theme.divider : color} strokeWidth={2.5} strokeDasharray="3,2" />
          : <line x1={0} y1={1.25} x2={14} y2={1.25} stroke={hidden ? theme.divider : color} strokeWidth={2.5} />
        }
      </svg>
      <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.3px', color: theme.textMuted(0.6) }}>{label}</span>
    </div>
  )
}
