'use client'
import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { clsx } from 'clsx'
import type { MarketIndex } from '@/types'
import { getNyseSession, type NyseSession } from '@/lib/utils/marketHours'

// Fallback skeleton — mirrors INDICES config in /api/indices/route.ts
const EMPTY_INDICES: MarketIndex[] = [
  { symbol: 'SPX', name: 'S&P 500', value: NaN, change: NaN, pct: NaN },
  { symbol: 'NDX', name: 'NASDAQ', value: NaN, change: NaN, pct: NaN },
  { symbol: 'DJI', name: 'DJIA', value: NaN, change: NaN, pct: NaN },
  { symbol: 'VIX', name: 'VIX', value: NaN, change: NaN, pct: NaN },
  { symbol: 'USDPLN', name: 'USD/PLN', value: NaN, change: NaN, pct: NaN },
  { symbol: 'EURPLN', name: 'EUR/PLN', value: NaN, change: NaN, pct: NaN },
  { symbol: 'EURUSD', name: 'EUR/USD', value: NaN, change: NaN, pct: NaN },
  { symbol: 'GOLD', name: 'GOLD', value: NaN, change: NaN, pct: NaN },
  { symbol: 'OIL', name: 'WTI/bbl', value: NaN, change: NaN, pct: NaN },
]

interface Clock { label: string; tz: string }
const CLOCKS: Clock[] = [
  { label: 'NYC', tz: 'America/New_York' },
  { label: 'LON', tz: 'Europe/London' },
  { label: 'WAW', tz: 'Europe/Warsaw' },
  { label: 'TOK', tz: 'Asia/Tokyo' },
]

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

const SESSION_LABELS: Record<NyseSession, string> = {
  open: 'NYSE OTWARTA',
  'pre-market': 'NYSE PRE',
  'after-hours': 'NYSE AFTER',
  closed: 'NYSE ZAMKNIĘTA',
  holiday: 'NYSE ŚWIĘTO',
}

export default function StatusBar({ isDemo }: { isDemo: boolean }) {
  const [times, setTimes] = useState<string[]>([])
  const [session, setSession] = useState<NyseSession>('closed')

  // Same key as MarketOverview — SWR deduplicates the request
  const { data: liveIndices, error } = useSWR<MarketIndex[]>('/api/indices', fetcher, {
    refreshInterval: 60000,
    revalidateOnFocus: false,
  })

  useEffect(() => {
    const update = () => {
      const now = new Date()
      setTimes(CLOCKS.map(c =>
        now.toLocaleTimeString('pl-PL', { timeZone: c.tz, hour: '2-digit', minute: '2-digit' })
      ))
      setSession(getNyseSession(now))
    }
    update()
    const t = setInterval(update, 5000)
    return () => clearInterval(t)
  }, [])

  const indices = liveIndices?.length ? liveIndices : EMPTY_INDICES
  const demoCount = liveIndices?.filter(index => index.quality === 'demo').length ?? 0
  const hasDemoData = isDemo || demoCount > 0
  const dataBadge = error
    ? { label: 'BRAK DANYCH', color: 'text-[#ff0040] border-[#ff0040]' }
    : hasDemoData
      ? { label: demoCount > 0 && demoCount < indices.length ? 'CZĘŚĆ DEMO' : 'DEMO', color: 'text-[#ffaa00] border-[#ffaa00]' }
      : liveIndices?.length
        ? { label: 'OPÓŹNIONE', color: 'text-[#ffaa00] border-[#ffaa00]' }
        : { label: 'ŁADOWANIE', color: 'text-[#555] border-[#333]' }
  const marketOpen = session === 'open'
  const sessionActive = session === 'pre-market' || session === 'after-hours'

  return (
    <div className="flex items-center justify-between gap-2 bg-black border-b border-[#1c1c1c] px-2 shrink-0 overflow-hidden" style={{ height: 26 }}>
      {/* Left: brand + demo badge */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[11px] font-bold text-[#ffaa00] tracking-[0.2em]">BLOOMBERG</span>
        <span className="text-[11px] font-bold text-[#666]">DASHBOARD</span>
        <span className={clsx('border text-[9px] font-bold px-1 py-px tracking-widest', dataBadge.color)}>
          {dataBadge.label}
        </span>
      </div>

      {/* Center: market indices */}
      <div className="flex flex-1 items-center gap-0 overflow-x-auto min-w-0">
        {indices.map((idx, i) => (
          <div
            key={idx.symbol}
            title={`${idx.name}${idx.source ? ` · ${idx.source}` : ''}${idx.lastUpdated ? ` · ${new Date(idx.lastUpdated).toLocaleTimeString('pl-PL')}` : ''}`}
            className={clsx(
              'flex items-center gap-1 px-2 border-l border-[#1c1c1c] text-[10px] shrink-0',
              i === 0 && 'border-l-0'
            )}
          >
            <span className="text-[#888] font-bold">{idx.symbol}</span>
            <span className="num text-[#c8c8c8]">
              {!Number.isFinite(idx.value) ? '—' : idx.value < 10
                ? idx.value.toFixed(3)
                : idx.value < 1000
                  ? idx.value.toFixed(2)
                  : idx.value.toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
            <span className={clsx('num font-bold', !Number.isFinite(idx.pct) ? 'text-[#444]' : idx.pct >= 0 ? 'text-[#00ff41]' : 'text-[#ff0040]')}>
              {Number.isFinite(idx.pct) ? `${idx.pct >= 0 ? '+' : ''}${idx.pct.toFixed(2)}%` : '—'}
            </span>
          </div>
        ))}
      </div>

      {/* Right: clocks + market status */}
      <div className="hidden min-[1180px]:flex items-center gap-0 shrink-0">
        {CLOCKS.map((c, i) => (
          <div key={c.label} className="flex items-center gap-1 px-2 border-l border-[#1c1c1c] text-[10px]">
            <span className="text-[#555] font-bold">{c.label}</span>
            <span className="num text-[#888]">{times[i] ?? '--:--'}</span>
          </div>
        ))}
        <div className="flex items-center gap-1 px-2 border-l border-[#1c1c1c] text-[10px]">
          <span className={clsx('blink', marketOpen ? 'text-[#00ff41]' : sessionActive ? 'text-[#ffaa00]' : 'text-[#ff0040]')}>●</span>
          <span className={clsx('font-bold', marketOpen ? 'text-[#00ff41]' : sessionActive ? 'text-[#ffaa00]' : 'text-[#555]')}>
            {SESSION_LABELS[session]}
          </span>
        </div>
      </div>
    </div>
  )
}
