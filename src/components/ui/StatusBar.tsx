'use client'
import { useEffect, useState } from 'react'
import { clsx } from 'clsx'

interface IndexQuote {
  symbol: string
  name: string
  value: number
  change: number
  pct: number
}

const BASE_INDICES: IndexQuote[] = [
  { symbol: 'SPX',  name: 'S&P 500',  value: 5261.72, change: 21.34, pct: 0.41  },
  { symbol: 'NDX',  name: 'NASDAQ',   value: 18234.30, change: 122.4, pct: 0.68 },
  { symbol: 'DJI',  name: 'DJIA',     value: 39721.36, change: 88.21, pct: 0.22 },
  { symbol: 'VIX',  name: 'VIX',      value: 14.23,   change: -0.38, pct: -2.60 },
  { symbol: 'DXY',  name: 'USD IDX',  value: 104.72,  change: -0.14, pct: -0.13 },
  { symbol: 'GOLD', name: 'GOLD',     value: 2342.80, change: 7.40,  pct: 0.32  },
  { symbol: 'OIL',  name: 'WTI/bbl',  value: 79.24,   change: -0.58, pct: -0.73 },
  { symbol: 'UST10Y',name:'10Y UST',  value: 4.424,   change: 0.018, pct: 0.41  },
]

interface Clock { label: string; tz: string }
const CLOCKS: Clock[] = [
  { label: 'NYC', tz: 'America/New_York' },
  { label: 'LON', tz: 'Europe/London' },
  { label: 'WAW', tz: 'Europe/Warsaw' },
  { label: 'TOK', tz: 'Asia/Tokyo' },
]

export default function StatusBar({ isDemo }: { isDemo: boolean }) {
  const [times, setTimes] = useState<string[]>([])
  const [marketOpen, setMarketOpen] = useState(false)
  const [tick, setTick] = useState(0)

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

  // Each index has its own sine wave phase + frequency → independent movement
  const indices = BASE_INDICES.map((idx, i) => {
    const phase = i * 2.399  // golden angle spacing — avoids harmonic correlation
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
              {idx.value < 10 ? idx.value.toFixed(3) : idx.value.toFixed(2)}
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
