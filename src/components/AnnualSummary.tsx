import React, { useEffect } from 'react'
import type { Theme } from '../theme'
import type { DailyReading } from '../types'
import type { Lake } from '../data/lakes'
import { COLORS } from '../theme'

interface Props {
  theme: Theme
  lake: Lake
  historicalReadings: DailyReading[]
  onClose: () => void
}

export function AnnualSummary({ theme, lake, historicalReadings, onClose }: Props) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const currentYear = new Date().getFullYear()
  const rows = []
  for (let yr = currentYear; yr >= currentYear - 4; yr--) {
    const r = historicalReadings.filter(h => h.year === yr)
    if (!r.length) continue
    const levels = r.map(h => h.waterLevel)
    const min = Math.min(...levels), max = Math.max(...levels)
    const avg = levels.reduce((s, v) => s + v, 0) / levels.length
    const yearEnd = r.filter(h => yr === currentYear ? true : h.month === 12)
      .sort((a, b) => b.date.localeCompare(a.date))[0]
    rows.push({
      year:  yr === currentYear ? `${yr} (YTD)` : `${yr}`,
      min:   min.toFixed(1),
      max:   max.toFixed(1),
      avg:   avg.toFixed(1),
      pct:   yearEnd ? `${Math.round(yearEnd.percentFull)}%` : '—',
    })
  }

  const cols = ['YEAR', 'MIN (FT)', 'MAX (FT)', 'AVG (FT)', 'YEAR-END % FULL']

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200 }}
      />
      {/* Panel */}
      <div style={{
        position: 'fixed', top: 80, right: 36,
        background: theme.background, border: `1px solid ${theme.divider}`,
        zIndex: 201, minWidth: 520, padding: 24,
      }}>
        <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: '0.2px', marginBottom: 16 }}>
          <span style={{ color: COLORS.water }}>{lake.name}</span>{' '}
          <span style={{ color: theme.text }}>ANNUAL SUMMARY</span>
        </div>

        {/* Table */}
        <div style={{ border: `2px solid ${theme.divider}` }}>
          {/* Header */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
            padding: '10px 20px', borderBottom: `2px solid ${theme.divider}`,
          }}>
            {cols.map(c => (
              <span key={c} style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.4px', color: theme.textMuted(0.5) }}>
                {c}
              </span>
            ))}
          </div>
          {/* Rows */}
          {rows.length === 0
            ? <div style={{ padding: 24, fontSize: 13, color: theme.textMuted(0.45) }}>Loading…</div>
            : rows.map((row, i) => (
              <div key={row.year} style={{
                display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
                padding: '12px 20px',
                borderBottom: i < rows.length - 1 ? `1px solid ${theme.divider}` : 'none',
              }}>
                {[row.year, row.min, row.max, row.avg, row.pct].map((val, j) => (
                  <span key={j} style={{ fontSize: 13.5, color: theme.text }}>{val}</span>
                ))}
              </div>
            ))}
        </div>
      </div>
    </>
  )
}
