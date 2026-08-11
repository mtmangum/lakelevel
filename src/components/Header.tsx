import React, { useState, useRef, useEffect } from 'react'
import type { Theme } from '../theme'
import { COLORS } from '../theme'
import type { Lake } from '../data/lakes'
import { LAKES } from '../data/lakes'
import type { Units } from '../units'

interface Props {
  theme: Theme
  selectedLake: Lake
  onSelectLake: (lake: Lake) => void
  isDark: boolean
  onToggleDark: () => void
  units: Units
  onSetUnits: (units: Units) => void
  isLoading: boolean
  syncLabel: string
  onAnnualSummary: () => void
}

export function Header({ theme, selectedLake, onSelectLake, isDark, onToggleDark, units, onSetUnits, isLoading, syncLabel, onAnnualSummary }: Props) {
  const [showPicker, setShowPicker] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  // Close picker on outside click
  useEffect(() => {
    if (!showPicker) return
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showPicker])

  return (
    <header className="app-header" style={{
      display: 'flex', alignItems: 'center',
      borderBottom: `1px solid ${theme.divider}`,
      position: 'relative',
    }}>
      {/* Left: lake picker + title */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Lake picker button */}
          <div ref={pickerRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setShowPicker(p => !p)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                display: 'flex', alignItems: 'center', gap: 4,
                color: COLORS.water, fontFamily: 'inherit',
                fontSize: 16, fontWeight: 900, letterSpacing: '0.1px',
              }}
            >
              <svg width={10} height={7} viewBox="0 0 10 7" fill={COLORS.water}>
                <path d="M0 0 L5 7 L10 0 Z" />
              </svg>
              {selectedLake.name}
            </button>

            {showPicker && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, marginTop: 6,
                background: theme.background, border: `1px solid ${theme.divider}`,
                minWidth: 220, zIndex: 100,
              }}>
                {LAKES.map(lake => (
                  <button
                    key={lake.id}
                    onClick={() => { onSelectLake(lake); setShowPicker(false) }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                      padding: '9px 16px', textAlign: 'left', fontFamily: 'inherit',
                      fontSize: 13, fontWeight: lake.id === selectedLake.id ? 700 : 400,
                      color: lake.id === selectedLake.id ? COLORS.water : theme.text,
                    }}
                  >
                    {lake.name}
                    {lake.id === selectedLake.id && (
                      <svg width={11} height={9} viewBox="0 0 11 9" fill={COLORS.water}>
                        <path d="M1 4L4 7L10 1" stroke={COLORS.water} strokeWidth={2} fill="none" strokeLinecap="round" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <span style={{ fontSize: 16, fontWeight: 900, color: theme.text, letterSpacing: '0.1px' }}>
            WATER LEVEL MONITOR
          </span>
        </div>

        {/* Subtitle: location + sync status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.4px', color: theme.textMuted(0.45) }}>
            {selectedLake.location}
          </span>
          <span style={{ color: theme.textMuted(0.25) }}>·</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            {isLoading
              ? <PulsingDot color={theme.textMuted(0.5)} />
              : <div style={{ width: 5, height: 5, background: COLORS.accent }} />
            }
            <span style={{
              fontSize: 10.5, fontWeight: 700,
              color: isLoading ? theme.textMuted(0.4) : COLORS.accent,
            }}>
              {isLoading ? 'FETCHING DATA…' : syncLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="header-spacer" style={{ flex: 1 }} />

      <div className="header-actions" style={{ display: 'flex', alignItems: 'center' }}>
        {/* Annual summary button */}
        <button
          onClick={onAnnualSummary}
          style={{
            background: 'none', border: `1.5px solid ${theme.divider}`,
            cursor: 'pointer', fontFamily: 'inherit',
            fontSize: 11, fontWeight: 600, letterSpacing: '0.3px',
            color: theme.textMuted(0.5), padding: '8px 12px', marginRight: 16,
          }}
        >
          ANNUAL SUMMARY
        </button>

        {/* Dark / Light toggle */}
        <SegmentedControl
          options={[{ label: 'DARK', value: true }, { label: 'LIGHT', value: false }]}
          value={isDark}
          onChange={() => onToggleDark()}
          theme={theme}
        />

        <div style={{ width: 8 }} />

        {/* Units toggle */}
        <SegmentedControl
          options={[{ label: 'FT', value: 'ft' as const }, { label: 'M', value: 'm' as const }]}
          value={units}
          onChange={onSetUnits}
          theme={theme}
        />
      </div>

      {/* Loading shimmer under header */}
      {isLoading && (
        <div style={{
          position: 'absolute', bottom: -1, left: 0, right: 0, height: 2, overflow: 'hidden',
        }}>
          <ShimmerBar color={COLORS.accent} />
        </div>
      )}
    </header>
  )
}

function PulsingDot({ color }: { color: string }) {
  return (
    <div style={{ width: 5, height: 5, borderRadius: '50%', background: color, animation: 'pulse 1.1s ease-in-out infinite' }}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.15} }`}</style>
    </div>
  )
}

function ShimmerBar({ color }: { color: string }) {
  return (
    <>
      <style>{`
        @keyframes shimmer { from{transform:translateX(-100%)} to{transform:translateX(350%)} }
      `}</style>
      <div style={{
        width: '30%', height: '100%',
        background: `linear-gradient(90deg, transparent, ${color}80, ${color}, ${color}80, transparent)`,
        animation: 'shimmer 1.5s linear infinite',
      }} />
    </>
  )
}

function SegmentedControl<T>({ options, value, onChange, theme }: {
  options: Array<{ label: string; value: T }>
  value: T
  onChange: (value: T) => void
  theme: Theme
}) {
  return (
    <div style={{ display: 'flex', border: `1.5px solid ${theme.divider}` }}>
      {options.map(opt => (
        <button
          key={opt.label}
          onClick={() => onChange(opt.value)}
          style={{
            background: opt.value === value ? theme.surface : 'none',
            border: 'none',
            borderRight: opt === options[0] ? `1px solid ${theme.divider}` : 'none',
            cursor: 'pointer', fontFamily: 'inherit',
            fontSize: 11, fontWeight: 700, letterSpacing: '0.4px',
            color: opt.value === value ? theme.text : theme.textMuted(0.45),
            padding: '5px 10px',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
