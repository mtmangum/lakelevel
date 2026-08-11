import React, { useState } from 'react'
import { makeTheme } from './theme'
import { useAppState } from './hooks/useAppState'
import { Header } from './components/Header'
import { StatGrid } from './components/StatGrid'
import { DashboardChart } from './components/DashboardChart'
import { AnnualSummary } from './components/AnnualSummary'

export function App() {
  const state = useAppState()
  const theme = makeTheme(state.isDark)
  const [showSummary, setShowSummary] = useState(false)

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: theme.background, color: theme.text,
    }}>
      <Header
        theme={theme}
        selectedLake={state.selectedLake}
        onSelectLake={state.selectLake}
        isDark={state.isDark}
        onToggleDark={() => state.setIsDark(d => !d)}
        units={state.units}
        onSetUnits={state.setUnits}
        isLoading={state.isLoadingData}
        syncLabel={state.syncLabel}
        onAnnualSummary={() => setShowSummary(s => !s)}
      />

      <div className="app-content" style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        minHeight: 0,
      }}>
        <StatGrid
          theme={theme}
          readings={state.readings}
          dailyNetCfs={state.dailyNetCfs}
          thirtyYearAvgLevel={state.thirtyYearAvgLevel}
          thirtyYearMonthlyAvgs={state.thirtyYearMonthlyAvgs}
          units={state.units}
        />

        <div style={{ flex: 1, minHeight: 0 }}>
          <DashboardChart
            theme={theme}
            lake={state.selectedLake}
            readings={state.readings}
            chartYearDailyReadings={state.chartYearDailyReadings}
            thirtyYearMonthlyAvgs={state.thirtyYearMonthlyAvgs}
            units={state.units}
          />
        </div>
      </div>

      {showSummary && (
        <AnnualSummary
          theme={theme}
          lake={state.selectedLake}
          historicalReadings={state.historicalReadings}
          units={state.units}
          onClose={() => setShowSummary(false)}
        />
      )}
    </div>
  )
}
