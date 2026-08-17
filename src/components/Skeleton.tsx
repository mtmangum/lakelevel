import type { CSSProperties } from 'react'
import type { Theme } from '../theme'

interface Props {
  theme: Theme
  style: CSSProperties
}

export function Skeleton({ theme, style }: Props) {
  return (
    <div style={{ position: 'relative', overflow: 'hidden', background: theme.surface, ...style }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(90deg, transparent, ${theme.textMuted(0.16)}, transparent)`,
        animation: 'skeleton-shimmer 1.6s ease-in-out infinite',
      }} />
    </div>
  )
}
