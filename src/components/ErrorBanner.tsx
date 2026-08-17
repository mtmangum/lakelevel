import type { Theme } from '../theme'
import { COLORS } from '../theme'

interface Props {
  theme: Theme
  message: string
  onRetry: () => void
}

export function ErrorBanner({ theme, message, onRetry }: Props) {
  return (
    <div className="error-banner" style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 36px', borderBottom: `1px solid ${theme.divider}`,
      background: `${COLORS.accent}14`,
    }}>
      <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1px', color: COLORS.accent }}>
        {message}
      </span>
      <button
        onClick={onRetry}
        style={{
          background: 'none', border: `1.5px solid ${COLORS.accent}80`,
          color: COLORS.accent, fontFamily: 'inherit', cursor: 'pointer',
          fontSize: 11, fontWeight: 700, letterSpacing: '0.3px',
          padding: '4px 10px',
        }}
      >
        RETRY
      </button>
    </div>
  )
}
