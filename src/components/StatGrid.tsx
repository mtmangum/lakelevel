import React from 'react'
import type { Theme } from '../theme'
import { COLORS } from '../theme'
import type { DailyReading } from '../types'
import type { MonthlyAvg } from '../hooks/useAppState'
import type { Units } from '../units'
import { formatLevel, formatSignedLevel, formatFlow } from '../units'
import { Skeleton } from './Skeleton'

interface Props {
  theme: Theme
  readings: DailyReading[]
  dailyNetCfs: number | null
  thirtyYearAvgLevel: number | null
  thirtyYearMonthlyAvgs: MonthlyAvg[]
  units: Units
  isLoadingData: boolean
}

// Below this, day-to-day movement is normal gauge/measurement noise, not an
// actual inflow/outflow event — rendered as a distinct "steady" state rather
// than a number so it doesn't read as "zero flow."
const FLOW_NOISE_FLOOR_CFS = 10

// `direction` picks which side of net flow this reads: 1 for inflow (net
// positive), -1 for outflow (net negative, reported as a positive magnitude).
export function classifyFlow(netCfs: number | null, direction: 1 | -1): number | 'steady' | null {
  if (netCfs === null) return null
  const signed = netCfs * direction
  return signed > FLOW_NOISE_FLOOR_CFS ? signed : 'steady'
}

function SteadyValue({ theme }: { theme: Theme }) {
  return (
    <span
      title="Change is within normal day-to-day noise"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 700, color: theme.textMuted(0.5) }}
    >
      <span aria-hidden="true">≈</span>Steady
    </span>
  )
}

export function StatGrid({ theme, readings, dailyNetCfs, thirtyYearAvgLevel, units, isLoadingData }: Props) {
  const latest = readings.at(-1) ?? null
  const showSkeleton = isLoadingData && !latest

  const levelStr = !latest ? '—' : formatLevel(latest.waterLevel, units)

  const netCfs = dailyNetCfs
  const inflowClass = classifyFlow(netCfs, 1)
  const outflowClass = classifyFlow(netCfs, -1)
  const inflowValue = inflowClass === null ? '—'
    : inflowClass === 'steady' ? <SteadyValue theme={theme} />
    : formatFlow(inflowClass, units)
  const outflowValue = outflowClass === null ? '—'
    : outflowClass === 'steady' ? <SteadyValue theme={theme} />
    : formatFlow(outflowClass, units)

  const vsAvg = latest && thirtyYearAvgLevel !== null
    ? latest.waterLevel - thirtyYearAvgLevel : null
  const vsAvgStr = vsAvg !== null ? formatSignedLevel(vsAvg, units) : '—'
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
          value: inflowValue,
          valueColor: theme.text,
          detail: inflowPct !== null
            ? <span style={{ color: inflowPct >= 0 ? COLORS.water : COLORS.accent }}>{inflowPct >= 0 ? '+' : ''}{inflowPct.toFixed(0)}% vs yesterday</span>
            : typeof outflowClass === 'number'
              ? <span style={{ color: COLORS.accent }}>↓ {formatFlow(outflowClass, units)} outbound</span>
              : null,
        },
        {
          label: 'OUTFLOW',
          value: outflowValue,
          valueColor: theme.text,
          detail: <span style={{ color: theme.textMuted(0.45) }}>NET DAILY</span>,
        },
        {
          label: '30-YR HISTORICAL AVG',
          value: vsAvgStr,
          valueColor: vsAvgColor,
          detail: thirtyYearAvgLevel !== null
            ? <span style={{ color: theme.textMuted(0.55) }}>Hist. avg: {formatLevel(thirtyYearAvgLevel, units)}</span>
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
            {showSkeleton ? <Skeleton theme={theme} style={{ width: 64, height: 22 }} /> : cell.value}
          </div>
          <div style={{ fontSize: 11, minHeight: 16 }}>
            {cell.detail ?? <span style={{ opacity: 0 }}>–</span>}
          </div>
        </div>
      ))}
    </div>
  )
}
