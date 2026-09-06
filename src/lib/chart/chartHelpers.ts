import type { Time } from 'lightweight-charts'
import type { OHLCBar } from '@/types'

export function cleanBars(data: OHLCBar[]): OHLCBar[] {
  if (!data.length) return []
  const sorted = [...data].sort((a, b) => a.time.localeCompare(b.time))
  // Last bar per date (4h CoinGecko → daily close)
  const deduped = sorted.filter((bar, i, arr) =>
    i === arr.length - 1 || bar.time !== arr[i + 1].time
  ).filter(b => isFinite(b.close) && b.close > 0)

  if (!deduped.length) return []

  // Median-based outlier filter — removes anomalous bars (>80% deviation from median)
  const closes = [...deduped].map(b => b.close).sort((a, b) => a - b)
  const median = closes[Math.floor(closes.length / 2)]
  return deduped.filter(b => b.close >= median * 0.2 && b.close <= median * 5)
}

// lightweight-charts gives back a BusinessDay object ({year,month,day}) when
// bar times were passed in as 'YYYY-MM-DD' strings, or a UTC timestamp
// (seconds) otherwise -- handle both.
export function formatChartDate(time: Time): string {
  const date =
    typeof time === 'object' && time !== null && 'year' in time
      ? new Date(Date.UTC(time.year, time.month - 1, time.day))
      : new Date(Number(time) * 1000)
  return date.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// Canonical 'YYYY-MM-DD' key so bar times (always strings) and crosshair
// times (BusinessDay object or timestamp, depending on how lightweight-charts
// parsed the input) can be matched to the same news-by-day lookup.
export function timeKey(time: Time | string): string {
  if (typeof time === 'string') return time.slice(0, 10)
  if (typeof time === 'object' && time !== null && 'year' in time) {
    return `${time.year}-${String(time.month).padStart(2, '0')}-${String(time.day).padStart(2, '0')}`
  }
  return new Date(Number(time) * 1000).toISOString().slice(0, 10)
}

export function nearestBarTime(bars: OHLCBar[], targetMs: number): string | null {
  if (!bars.length) return null
  let closest = bars[0]
  let closestDiff = Math.abs(new Date(bars[0].time).getTime() - targetMs)
  for (const bar of bars) {
    const diff = Math.abs(new Date(bar.time).getTime() - targetMs)
    if (diff < closestDiff) {
      closest = bar
      closestDiff = diff
    }
  }
  // Don't attach news to a bar more than 2 days away from its publish date
  return closestDiff <= 2 * 86_400_000 ? closest.time : null
}
