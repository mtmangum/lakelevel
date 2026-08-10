export const COLORS = {
  accent:       '#EC3013',
  water:        '#2B82D4',
  neutral100:   '#F8F4F4',
  neutral200:   '#EAE7E7',
  neutral300:   '#D7D3D3',
  neutral400:   '#BAB6B6',
  neutral500:   '#9B9797',
  neutral600:   '#7D7979',
  neutral700:   '#605D5D',
  neutral800:   '#444141',
  neutral900:   '#2D2B2B',
  lightBg:      '#F3F2F2',
  lightSurface: '#EAE9E9',
  lightText:    '#201E1D',
} as const

export interface Theme {
  isDark:       boolean
  background:   string
  surface:      string
  text:         string
  divider:      string
  accent:       string
  chartAvgLine: string
  textMuted:    (opacity: number) => string
}

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '')
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)).join(',')
}

export function makeTheme(isDark: boolean): Theme {
  const textBase = isDark ? COLORS.neutral100 : COLORS.lightText
  const textRgb  = hexToRgb(textBase)
  return {
    isDark,
    background:   isDark ? COLORS.neutral900 : COLORS.lightBg,
    surface:      isDark ? COLORS.neutral800 : COLORS.lightSurface,
    text:         textBase,
    divider:      isDark
      ? `rgba(${hexToRgb(COLORS.neutral100)},0.3)`
      : `rgba(${textRgb},0.4)`,
    accent:       COLORS.accent,
    chartAvgLine: COLORS.neutral400,
    textMuted:    (o: number) => `rgba(${textRgb},${o})`,
  }
}
