import React from 'react'
import type { Theme } from '../theme'
import { COLORS } from '../theme'
import type { DailyReading } from '../types'
import type { MonthlyAvg } from '../hooks/useAppState'

interface Props {
  theme: Theme
  readings: DailyReading[]
  dailyNetCfs: number | null
  thirtyYearAvgLevel: number | null
  thirtyYearMonthlyAvgs: MonthlyAvg[]
}

const cfsFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

export function StatGrid({ theme, readings, dailyNetCfs, thirtyYearAvgLevel }: Props) {
  const latest = readings.at(-1) ?? null

  const levelStr = !latest ? '—'
    : latest.waterLevel >= 1000
      ? `${Math.round(latest.waterLevel)} ft`
      : `${latest.waterLevel.toFixed(1)} ft`

  const netCfs = dailyNetCfs
  const inflowStr = netCfs === null ? '—'
    : netCfs > 10 ? `${cfsFormat.format(netCfs)} cfs`
    : 'Steady'

  const outflowStr = netCfs === null ? '—'
    : netCfs < -10 ? `${cfsFormat.format(Math.abs(netCfs))} cfs`
    : 'Steady'

  const vsAvg = latest && thirtyYearAvgLevel !== null
    ? latest.waterLevel - thirtyYearAvgLevel : null
  const vsAvgStr = vsAvg !== null ? `${vsAvg >= 0 ? '+' : ''}${vsAvg.toFixed(1)} ft` : '—'
  const vsAvgColor = vsAvg !== null ? (vsAvg >= 0 ? COLORS.water : COLORS.accent) : theme.text

  // Trend direction
  const trend: boolean | null = readings.length >= 2
    ? (() => { const d = readings.at(-1)!.waterLevel - readings.at(-2)!.waterLevel; return Math.abs(d) >= 0.01 ? d > 0 : null })()
    : null

  // % change in inflow vs yesterday
  const inflowPct: number | null = readings.length >= 3
    ? (() => {
        const today = (readings.at(-1)!.storage - readings.at(-2)!.storage) * 0.504
        const yday  = (readings.at(-2)!.storage - readings.at(-3)!.storage) * 0.504
        return today > 10 && yday > 10 ? (today - yday) / yday * 100 : null
      })()
    : null

  return (
    <div className="stat-grid" style={{
      display: 'flex', borderBottom: `1px solid ${theme.divider}`,
      ...({ '--stat-divider': theme.divider } as React.CSSProperties),
    }}>
      {[
        {
          label: 'CURRENT LEVEL',
          value: levelStr,
          valueColor: COLORS.water,
          detail: latest ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ color: theme.textMuted(0.55) }}>{latest.percentFull.toFixed(1)}% full</span>
              {trend !== null && (
                <>
                  <span style={{ color: trend ? COLORS.water : COLORS.accent }}>{trend ? '↑' : '↓'}</span>
                  <span style={{ color: trend ? COLORS.water : COLORS.accent }}>{trend ? 'Rising' : 'Falling'}</span>
                </>
              )}
            </div>
          ) : null,
        },
        {
          label: 'INFLOW',
          value: inflowStr,
          valueColor: theme.text,
          detail: inflowPct !== null
            ? <span style={{ color: inflowPct >= 0 ? COLORS.water : COLORS.accent }}>{inflowPct >= 0 ? '+' : ''}{inflowPct.toFixed(0)}% vs yesterday</span>
            : netCfs !== null && netCfs < -10
              ? <span style={{ color: COLORS.accent }}>↓ {cfsFormat.format(Math.abs(netCfs))} cfs outbound</span>
              : null,
        },
        {
          label: 'OUTFLOW',
          value: outflowStr,
          valueColor: theme.text,
          detail: <span style={{ color: theme.textMuted(0.45) }}>NET DAILY</span>,
        },
        {
          label: '30-YR HISTORICAL AVG',
          value: vsAvgStr,
          valueColor: vsAvgColor,
          detail: thirtyYearAvgLevel !== null
            ? <span style={{ color: theme.textMuted(0.55) }}>Hist. avg: {thirtyYearAvgLevel.toFixed(1)} ft</span>
            : null,
        },
      ].map((cell, i, arr) => (
        <div key={cell.label} style={{
          borderRight: i < arr.length - 1 ? `1px solid ${theme.divider}` : 'none',
        }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.5px', color: theme.textMuted(0.45), marginBottom: 4 }}>
            {cell.label}
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: cell.valueColor, lineHeight: 1.1, marginBottom: 4 }}>
            {cell.value}
          </div>
          <div style={{ fontSize: 11, minHeight: 16 }}>
            {cell.detail ?? <span style={{ opacity: 0 }}>–</span>}
          </div>
        </div>
      ))}
    </div>
  )
}
