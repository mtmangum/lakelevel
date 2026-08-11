import React, { useEffect } from 'react'
import type { Theme } from '../theme'
import type { DailyReading } from '../types'
import type { Lake } from '../data/lakes'
import { COLORS } from '../theme'
import type { Units } from '../units'
import { toDisplayValue } from '../units'

interface Props {
  theme: Theme
  lake: Lake
  historicalReadings: DailyReading[]
  units: Units
  onClose: () => void
}

export function AnnualSummary({ theme, lake, historicalReadings, units, onClose }: Props) {
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
      min:   toDisplayValue(min, units).toFixed(1),
      max:   toDisplayValue(max, units).toFixed(1),
      avg:   toDisplayValue(avg, units).toFixed(1),
      pct:   yearEnd ? `${Math.round(yearEnd.percentFull)}%` : '—',
    })
  }

  const unitLabel = units.toUpperCase()
  const cols = ['YEAR', `MIN (${unitLabel})`, `MAX (${unitLabel})`, `AVG (${unitLabel})`, 'YEAR-END % FULL']

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200 }}
      />
      {/* Panel */}
      <div className="annual-summary-panel" style={{
        position: 'fixed',
        background: theme.background, border: `1px solid ${theme.divider}`,
        zIndex: 201,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: '0.2px' }}>
            <span style={{ color: COLORS.water }}>{lake.name}</span>{' '}
            <span style={{ color: theme.text }}>ANNUAL SUMMARY</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 22, lineHeight: 1, padding: 6,
              color: theme.textMuted(0.55),
            }}
          >
            ×
          </button>
        </div>

        {/* Table */}
        <div style={{ border: `2px solid ${theme.divider}`, overflowX: 'auto' }}>
          <div style={{ minWidth: 480 }}>
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
      </div>
    </>
  )
}
