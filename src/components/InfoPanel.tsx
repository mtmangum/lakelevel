import React, { useEffect } from 'react'
import type { Theme } from '../theme'
import { COLORS } from '../theme'

const REPO_URL = 'https://github.com/mtmangum/lakelevel'
const TWDB_URL = 'https://waterdatafortexas.org/reservoirs/statewide'

interface Props {
  theme: Theme
  onClose: () => void
}

export function InfoPanel({ theme, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200 }}
      />
      <div className="info-panel" style={{
        position: 'fixed',
        background: theme.background, border: `1px solid ${theme.divider}`,
        zIndex: 201,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: '0.2px', color: theme.text }}>
            ABOUT HIGHLAND LAKE LEVELS
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

        <p style={{ fontSize: 14, lineHeight: 1.55, color: theme.text, margin: '0 0 14px' }}>
          This site shows real-time and historical water levels for the six central Texas highland lakes on the Colorado River — Buchanan, Inks, LBJ, Marble Falls, Travis, and Austin.
        </p>
        <p style={{ fontSize: 14, lineHeight: 1.55, color: theme.textMuted(0.75), margin: '0 0 20px' }}>
          Data is sourced from LCRA via the{' '}
          <a
            href={TWDB_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: theme.textMuted(0.75) }}
          >
            Texas Water Development Board
          </a>{' '}
          and refreshes automatically throughout the day.
        </p>

        <div style={{ borderTop: `1px solid ${theme.divider}`, paddingTop: 16, paddingBottom: 4 }}>
          <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: '0.2px', color: theme.text, marginBottom: 12 }}>
            HOW TO USE
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {[
              ['LAKE ▾', 'switch between the six Highland Lakes'],
              ['Tap a year', 'in the chart legend to hide/show it — double-tap to isolate it'],
              ['Drag across the chart', 'to zoom into a date range; tap RESET to zoom back out'],
              ['Hover the chart', '(or tap on mobile) to read the exact level for any date'],
              ['ANNUAL SUMMARY', "min/max/avg and year-end levels for the selected lake"],
              ['FT / M and DARK / LIGHT', 'switch units and theme from the header'],
            ].map(([label, desc]) => (
              <li key={label} style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 9 }}>
                <span style={{ fontWeight: 700, color: theme.text }}>{label}</span>
                <span style={{ color: theme.textMuted(0.7) }}> — {desc}</span>
              </li>
            ))}
          </ul>
        </div>

        <div style={{ borderTop: `1px solid ${theme.divider}`, paddingTop: 18 }}>
          <p style={{ fontSize: 13, lineHeight: 1.5, color: theme.textMuted(0.6), margin: '0 0 10px' }}>
            This project is open source — fork it, adapt it, or point it at your own lake.
          </p>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 13, fontWeight: 700, letterSpacing: '0.2px',
              color: COLORS.water, textDecoration: 'none',
            }}
          >
            View source & fork on GitHub
            <svg width={11} height={11} viewBox="0 0 11 11" fill="none">
              <path d="M2 9L9 2M9 2H3.5M9 2V7.5" stroke={COLORS.water} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
      </div>
    </>
  )
}
