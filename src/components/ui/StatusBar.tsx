'use client'
import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { clsx } from 'clsx'

interface IndexQuote {
  symbol: string
  name: string
  value: number
  change: number
  pct: number
}

// Fallback skeleton shown while real data loads — keeps layout stable
const BASE_INDICES: IndexQuote[] = [
  { symbol: 'SPX',    name: 'S&P 500', value: 7433.25,  change:  36.8,   pct:  0.50 },
  { symbol: 'NDX',    name: 'NASDAQ',  value: 26331.06, change: 152.6,   pct:  0.58 },
  { symbol: 'DJI',    name: 'DJIA',    value: 49614.64, change: 109.2,   pct:  0.22 },
  { symbol: 'VIX',    name: 'VIX',     value: 18.40,    change:  -0.64,  pct: -3.36 },
  { symbol: 'DXY',    name: 'USD IDX', value: 100.80,   change:  -0.22,  pct: -0.22 },
  { symbol: 'GOLD',   name: 'GOLD',    value: 4540.40,  change:  19.8,   pct:  0.44 },
  { symbol: 'OIL',    name: 'WTI/bbl', value: 100.78,   change:  -1.14,  pct: -1.12 },
  { symbol: 'UST10Y', name: '10Y UST', value: 4.584,    change:   0.024, pct:  0.53 },
]

interface Clock { label: string; tz: string }
const CLOCKS: Clock[] = [
  { label: 'NYC', tz: 'America/New_York' },
  { label: 'LON', tz: 'Europe/London' },
  { label: 'WAW', tz: 'Europe/Warsaw' },
  { label: 'TOK', tz: 'Asia/Tokyo' },
]

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function StatusBar({ isDemo }: { isDemo: boolean }) {
  const [times, setTimes] = useState<string[]>([])
  const [marketOpen, setMarketOpen] = useState(false)
  const [tick, setTick] = useState(0)

  // Same key as MarketOverview — SWR deduplicates the request
  const { data: liveIndices } = useSWR<IndexQuote[]>('/api/indices', fetcher, {
    refreshInterval: 60000,
    revalidateOnFocus: false,
  })

  useEffect(() => {
    const update = () => {
      const now = new Date()
      setTimes(CLOCKS.map(c =>
        now.toLocaleTimeString('pl-PL', { timeZone: c.tz, hour: '2-digit', minute: '2-digit' })
      ))
      const h = now.getUTCHours()
      const d = now.getUTCDay()
      setMarketOpen(d > 0 && d < 6 && h >= 13 && h < 21)
      setTick(t => t + 1)
    }
    update()
    const t = setInterval(update, 5000)
    return () => clearInterval(t)
  }, [])

  // Use real data when available; animate fallback skeleton while loading
  const indices = liveIndices && liveIndices.length > 0
    ? liveIndices
    : BASE_INDICES.map((idx, i) => {
        const phase = i * 2.399
        const freq  = 0.15 + i * 0.07
        const drift = Math.sin(tick * freq + phase) * idx.value * 0.00015
        return { ...idx, value: idx.value + drift }
      })

  return (
    <div className="flex items-center justify-between bg-black border-b border-[#1c1c1c] px-2 shrink-0" style={{ height: 26 }}>
      {/* Left: brand + demo badge */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[11px] font-bold text-[#ffaa00] tracking-[0.2em]">BLOOMBERG</span>
        <span className="text-[11px] font-bold text-[#666]">DASHBOARD</span>
        {isDemo && (
          <span className="border border-[#ffaa00] text-[#ffaa00] text-[9px] font-bold px-1 py-px tracking-widest blink">
            DEMO
          </span>
        )}
      </div>

      {/* Center: market indices */}
      <div className="flex items-center gap-0 overflow-hidden">
        {indices.map((idx, i) => (
          <div
            key={idx.symbol}
            className={clsx(
              'flex items-center gap-1 px-2 border-l border-[#1c1c1c] text-[10px] shrink-0',
              i === 0 && 'border-l-0'
            )}
          >
            <span className="text-[#888] font-bold">{idx.symbol}</span>
            <span className="num text-[#c8c8c8]">
              {idx.value < 10
                ? idx.value.toFixed(3)
                : idx.value < 1000
                  ? idx.value.toFixed(2)
                  : idx.value.toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
            <span className={clsx('num font-bold', idx.pct >= 0 ? 'text-[#00ff41]' : 'text-[#ff0040]')}>
              {idx.pct >= 0 ? '+' : ''}{idx.pct.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>

      {/* Right: clocks + market status */}
      <div className="flex items-center gap-0 shrink-0">
        {CLOCKS.map((c, i) => (
          <div key={c.label} className="flex items-center gap-1 px-2 border-l border-[#1c1c1c] text-[10px]">
            <span className="text-[#555] font-bold">{c.label}</span>
            <span className="num text-[#888]">{times[i] ?? '--:--'}</span>
          </div>
        ))}
        <div className="flex items-center gap-1 px-2 border-l border-[#1c1c1c] text-[10px]">
          <span className={clsx('blink', marketOpen ? 'text-[#00ff41]' : 'text-[#ff0040]')}>●</span>
          <span className={clsx('font-bold', marketOpen ? 'text-[#00ff41]' : 'text-[#555]')}>
            {marketOpen ? 'OTWARTY' : 'ZAMKNIĘTY'}
          </span>
        </div>
      </div>
    </div>
  )
}
