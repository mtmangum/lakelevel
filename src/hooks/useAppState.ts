import { useState, useEffect, useCallback, useRef } from 'react'
import type { DailyReading } from '../types'
import { LAKES, DEFAULT_LAKE, type Lake } from '../data/lakes'
import { fetchAllReadings } from '../data/lakeDataService'
import type { Units } from '../units'

export interface MonthlyAvg { month: number; level: number }

function derivedData(historical: DailyReading[]) {
  const currentYear = new Date().getFullYear()
  const cutoff = currentYear - 30
  const relevant = historical.filter(r => r.year >= cutoff && r.year < currentYear)

  // Trimmed mean: drop lowest 20% per month to reduce drawdown skew
  const monthlyAvgs: MonthlyAvg[] = []
  for (let month = 1; month <= 12; month++) {
    const vals = relevant
      .filter(r => r.month === month && r.waterLevel > 0 && r.percentFull > 0)
      .map(r => r.waterLevel)
      .sort((a, b) => a - b)
    if (!vals.length) continue
    const trimmed = vals.slice(Math.floor(vals.length / 5))
    if (!trimmed.length) continue
    monthlyAvgs.push({ month, level: trimmed.reduce((s, v) => s + v, 0) / trimmed.length })
  }

  const chartYears: Record<number, DailyReading[]> = {}
  for (const year of [2022, 2023, 2024, 2025]) {
    const rows = historical.filter(r => r.year === year)
    if (rows.length) chartYears[year] = rows
  }

  return { monthlyAvgs, chartYears }
}

function lakeFromURL(): Lake | null {
  const id = new URLSearchParams(window.location.search).get('lake')
  return LAKES.find(l => l.id === id) ?? null
}

export function useAppState() {
  const [isDark, setIsDark] = useState(true)
  const [units,  setUnits]  = useState<Units>('ft')
  const [selectedLake, setSelectedLakeRaw] = useState<Lake>(() => {
    const saved = localStorage.getItem('selectedLakeID')
    return lakeFromURL() ?? LAKES.find(l => l.id === saved) ?? DEFAULT_LAKE
  })

  const [readings,              setReadings]              = useState<DailyReading[]>([])
  const [historicalReadings,    setHistoricalReadings]    = useState<DailyReading[]>([])
  const [thirtyYearMonthlyAvgs, setThirtyYearMonthlyAvgs] = useState<MonthlyAvg[]>([])
  const [chartYearDailyReadings, setChartYearDailyReadings] = useState<Record<number, DailyReading[]>>({})
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [dataError,     setDataError]     = useState<string | null>(null)
  const [lastUpdated,   setLastUpdated]   = useState<Date | null>(null)

  const genRef = useRef(0)

  // Re-render periodically so the "SYNCED Xm/h AGO" label keeps counting up
  // instead of freezing at whatever it read on the last data fetch.
  const [, retick] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => retick(t => t + 1), 30_000)
    return () => clearInterval(timer)
  }, [])

  const fetchData = useCallback(async (lake: Lake) => {
    genRef.current += 1
    const gen = genRef.current
    setIsLoadingData(true)
    setDataError(null)
    try {
      const historical = await fetchAllReadings(lake)
      if (gen !== genRef.current) return
      const { monthlyAvgs, chartYears } = derivedData(historical.rows)
      setReadings(historical.rows)
      setHistoricalReadings(historical.rows)
      setThirtyYearMonthlyAvgs(monthlyAvgs)
      setChartYearDailyReadings(chartYears)
      setLastUpdated(historical.fetchedAt ?? new Date())
    } catch (err) {
      if (gen !== genRef.current) return
      setDataError(err instanceof Error ? err.message : 'Fetch failed')
    } finally {
      if (gen === genRef.current) setIsLoadingData(false)
    }
  }, [])

  const selectLake = useCallback((lake: Lake, replace = false) => {
    setSelectedLakeRaw(lake)
    localStorage.setItem('selectedLakeID', lake.id)
    const url = new URL(window.location.href)
    url.searchParams.set('lake', lake.id)
    window.history[replace ? 'replaceState' : 'pushState'](null, '', url)
    setReadings([])
    setHistoricalReadings([])
    setThirtyYearMonthlyAvgs([])
    setChartYearDailyReadings({})
    setLastUpdated(null)
  }, [])

  // Sync selected lake to the URL on first load, and react to back/forward navigation
  useEffect(() => {
    const url = new URL(window.location.href)
    if (url.searchParams.get('lake') !== selectedLake.id) {
      url.searchParams.set('lake', selectedLake.id)
      window.history.replaceState(null, '', url)
    }
    const onPopState = () => {
      const lake = lakeFromURL()
      if (lake && lake.id !== selectedLake.id) selectLake(lake, true)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLake.id])

  // Fetch on lake change + hourly refresh
  useEffect(() => {
    fetchData(selectedLake)
    const prefetch = async () => {
      for (const lake of LAKES.filter(l => l.id !== selectedLake.id)) {
        try { await fetchAllReadings(lake) }
        catch { /* ignore prefetch failures */ }
      }
    }
    prefetch()
    const timer = setInterval(() => fetchData(selectedLake), 3_600_000)
    return () => clearInterval(timer)
  }, [selectedLake, fetchData])

  // Computed
  const latestReading = readings.at(-1) ?? null

  const dailyNetCfs = readings.length >= 2
    ? (readings.at(-1)!.storage - readings.at(-2)!.storage) * 0.504
    : null

  const thirtyYearAvgLevel = (() => {
    const m = new Date().getMonth() + 1
    return thirtyYearMonthlyAvgs.find(a => a.month === m)?.level ?? null
  })()

  const syncLabel = (() => {
    if (!lastUpdated) return 'LIVE'
    const secs = Math.floor((Date.now() - lastUpdated.getTime()) / 1000)
    if (secs < 60)    return 'LIVE · SYNCED JUST NOW'
    if (secs < 3600)  return `LIVE · SYNCED ${Math.floor(secs / 60)}M AGO`
    if (secs < 86400) return `LIVE · SYNCED ${Math.floor(secs / 3600)}H AGO`
    return `LIVE · SYNCED ${Math.floor(secs / 86400)}D AGO`
  })()

  return {
    isDark, setIsDark,
    units, setUnits,
    selectedLake, selectLake,
    readings, historicalReadings,
    thirtyYearMonthlyAvgs, chartYearDailyReadings,
    isLoadingData, dataError, lastUpdated, syncLabel,
    latestReading, dailyNetCfs, thirtyYearAvgLevel,
  }
}
