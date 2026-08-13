# Changelog

All notable changes to the LakeLevel web app are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

This repo was split out of [mtmangum/WaterLevel](https://github.com/mtmangum/WaterLevel) on 2026-08-13, with commit history for `web/` preserved. Changes predating the split, including the native macOS app, are in that repo's [CHANGELOG.md](https://github.com/mtmangum/WaterLevel/blob/main/CHANGELOG.md).

---

## [Unreleased]

### Added
- **Basic SEO metadata** — `<title>`/meta description, Open Graph and Twitter card tags, `robots.txt`, and `sitemap.xml`; the header's lake name + "WATER LEVEL MONITOR" text is now a real `<h1>` instead of a plain `<div>`.
- **"How to use" section in the INFO panel** — spells out the chart's tap/double-tap year toggles, drag-to-zoom, and hover crosshair, none of which were otherwise discoverable.
- **Server-side data cache** — an hourly scheduled function (`sync-lake-data.js`) pre-fetches every lake's CSV from waterdatafortexas.org into a shared Netlify Blobs store, so `lake-csv.js` serves cached data in a few hundred ms instead of round-tripping to the upstream on every request; falls back to a live fetch + write-through on a cold miss.
- **`dev` branch deploy environment** — pushes to `dev` build a separate preview at `dev--brilliant-churros-222631.netlify.app` with its own scoped Blobs cache (`lake-data-dev`), so testing never touches production data. Non-production builds also get a `noindex` meta tag and a blanket `robots.txt` so they're never crawled.
- **cfs/cms conversion for the unit toggle** — INFLOW/OUTFLOW stat values and the "X cfs outbound" detail line now convert to cubic meters per second when the M unit is selected, matching the FT/M toggle instead of staying in cfs regardless of unit.
- **Feet / meters unit toggle** — FT/M `SegmentedControl` in the header, next to DARK/LIGHT. All displayed levels (stat grid, chart y-axis, tooltips, Annual Summary table) convert from the source data's feet to meters and back; internal chart geometry stays in feet throughout, only display formatting changes. Gridline step sizes (0.5/1/2/5/10/20) are chosen in whichever unit is currently displayed, so meter mode gets its own nicely-rounded ticks instead of ugly converted-feet fractions like 3.048.

### Changed
- **Shareable links are now real per-lake URLs** — each lake has its own path (`/lake-buchanan`, `/lake-inks`, `/lake-lbj`, `/lake-marble-falls`, `/lake-austin`; Lake Travis stays at the root) instead of a `?lake=` query param, so each lake is a distinct, indexable page with its own `<title>`/description/canonical/OG tags. Legacy `?lake=` links still resolve and redirect to the new path.
- **Trimmed cached history to the last 31 years** — full-history CSVs go back to the 1940s for some lakes (~1.9MB), but the app only ever uses the last 30 years; the cache now trims to that window server-side, cutting payload to ~700KB raw (~174KB compressed).
- **Dropped the redundant `-1year` fetch** — every consumer of the "recent" readings (latest reading, trend calcs, current-year chart line) only needed data already present in the trimmed historical set, so it's now derived client-side instead of a second network round-trip, halving per-lake requests.
- **"SYNCED X AGO" reflects real data freshness** — now driven by the server's last successful fetch from origin instead of the browser's own request time, and re-renders every 30s so it counts up live instead of freezing between state changes.

### Fixed
- **Blobs cache never actually being read** — `lake-csv.js` used the classic `handler(event)` function signature, which doesn't get Netlify Blobs runtime context auto-injected; every request silently fell back to a live origin fetch regardless of cache state. Converted to the V2 `export default` signature.
- **Cache write-through silently never persisting** — the write to Blobs on a cold miss was fire-and-forget, so the function's runtime could terminate before it completed, leaving the cache permanently cold on that key. Now awaited.
- **Chart Y-axis auto-zoom dominated by single-day outliers** — constant-level lakes (LBJ, Austin) rendered with most of the chart empty: a single brief dip (one day for LBJ's current-year line, the historical January average for Austin) was more extreme than any of the actual displayed years, so the auto-zoom stretched to fit it, squashing everything else into a sliver. Switched to IQR-fenced bounds instead of raw min/max, and tightened `lowThreshold` config values that had been true drought/dead-pool engineering limits these lakes never realistically approach.
- **Outlier points rendering past the chart frame** — points outside the fenced Y-range used to just draw past the SVG's bottom edge into the date-label row. An SVG clipPath attempt silently failed (React's `useId()` includes colons, which don't reliably resolve in an SVG `url(#...)` reference), and even a fixed clipPath looked bad — the stroke just disappeared into a gap instead of a natural edge. Fixed by clamping each point's y-value to the plot area directly in `buildPathD`/`toSY`, so an outlier point smoothly flattens along the frame edge as a continuous line.
- **Gridlines vanishing on tightly-zoomed charts** — the fullPool/lowThreshold accent-line dedup logic deleted any regular gridline within a fixed 3ft radius, which exceeded the entire visible span on a tightly-zoomed constant-level lake, wiping out every gridline and leaving just the lone accent line. Radius now scales with the gridline step size instead of a fixed constant.
- **Gridlines not starting where the data begins** — after fixing gridlines to clear the y-axis labels, they used a fixed pixel offset instead of tracking the actual left edge of the plotted data (Jan 1, which shifts when zoomed). Gridlines now start at `toSX(40)` — the data's real screen position — clamped to never run under the axis labels.
- **Gridlines running behind y-axis labels** — dashed gridlines started at the chart's left edge (x=0), the same position as the overlaid y-axis numbers, so lines ran directly through the label text. Gridlines now start after the label column when the axis is shown.

## [1.0.0] — 2026-08-10

### Fixed
- **Chart y-axis overlay** — y-axis labels now overlay the left edge of the plot instead of reserving a separate gutter column, so the chart uses the full available width; on phone-width screens the axis numbers are hidden entirely rather than squeezed into a narrow column.
- **Netlify CSV proxy function crashing (502)** — `lake-csv.js` used CommonJS `exports.handler` while `package.json` declares `"type": "module"`, so Node refused to load it, breaking all chart data on the deployed site. Converted to `export async function handler(event)`.
- **Chart legend overflow on mobile** — the "WATER LEVEL" title + year-toggle legend (2026/2025/2024/2023/2022/30-YR AVG) shared one non-wrapping row, so on phone widths only the first two legend badges were visible/tappable and the rest overflowed off-screen. Row now wraps, with the legend dropping to its own line under 640px.
- **Chart left-alignment at all sizes** — the "WATER LEVEL" title/legend row was pinned to the plot's y-axis gutter width instead of the stat grid's own inset, leaving the chart visibly indented past "OUTFLOW" and the other stat cells at every screen size, not just mobile. Title/legend now matches the stat grid's padding directly (16px desktop, 12px under 640px) independent of the y-axis gutter, and the gutter itself narrowed (44→36px desktop, 30px on phone-width charts) to tighten the plot's left edge too.

### Changed
- **Mobile-responsive web layout** — removed the hard-coded 860px minimum width that forced horizontal scrolling on phones. Header now wraps into two rows under 640px (title/picker, then actions spaced edge-to-edge). Stat grid collapses from a 4-across row into a 2×2 grid. Annual Summary panel becomes a full-screen sheet with a visible close button (previously only closable via backdrop click, unreachable once full-screen) and its table scrolls horizontally instead of squeezing five columns unreadably narrow. Chart now handles touch events (tap for tooltip, drag for zoom) alongside the existing mouse handlers, with `touch-action: none` so gestures don't fight page scrolling.

### Added
- **Web favicon** — SVG favicon matching the native app icon's water-level wave + marker dot motif and color palette (`public/favicon.svg`).

---

## [0.1.0] — 2026-08-07

### Added
- Initial React/Vite/TypeScript port of the macOS app: dashboard stat grid, 5-year overlay chart with crosshair/zoom/legend toggles, Annual Summary table, dark/light mode, shareable `?lake=` deep links.
