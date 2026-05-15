'use client'
import useSWR from 'swr'
import { clsx } from 'clsx'
import { formatPrice, formatPercent } from '@/lib/utils/formatters'
import type { AssetPrice } from '@/types'
import { useStore } from '@/lib/store/useStore'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function Ticker() {
  const watchlist = useStore(s => s.watchlist)
  const symbolsParam = watchlist.map(w => `${w.symbol}:${w.type}`).join(',')

  const { data: prices = [] } = useSWR<AssetPrice[]>(
    watchlist.length ? `/api/prices?symbols=${symbolsParam}` : null,
    fetcher,
    { refreshInterval: 30000, revalidateOnFocus: false }
  )

  if (!prices.length) return (
    <div className="bg-black border-b border-[#1c1c1c] shrink-0 flex items-center px-3 text-[10px] text-[#444]" style={{ height: 22 }}>
      <span className="blink text-[#00ff41] mr-2">█</span> Wczytywanie danych rynkowych...
    </div>
  )

  // Duplicate for seamless loop
  const items = [...prices, ...prices]

  return (
    <div
      className="bg-black border-b border-[#1c1c1c] shrink-0 overflow-hidden relative"
      style={{ height: 22 }}
    >
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-8 z-10 pointer-events-none"
           style={{ background: 'linear-gradient(to right, #080808, transparent)' }} />
      <div className="absolute right-0 top-0 bottom-0 w-8 z-10 pointer-events-none"
           style={{ background: 'linear-gradient(to left, #080808, transparent)' }} />

      <div className="ticker-inner h-full items-center gap-0 text-[10px]" style={{ animationDuration: '30s' }}>
        {items.map((p, i) => (
          <span key={`${p.symbol}-${i}`} className="flex items-center shrink-0">
            <span className="px-3 border-r border-[#1c1c1c] flex items-center gap-2">
              <span className={clsx(
                'font-bold text-[9px] border px-0.5',
                p.type === 'crypto' ? 'text-[#00cccc] border-[#00cccc]' : 'text-[#0099ff] border-[#0099ff]'
              )}>
                {p.type === 'crypto' ? 'C' : 'S'}
              </span>
              <span className="font-bold text-[#ffaa00]">{p.symbol}</span>
              <span className="num text-[#c8c8c8]">{formatPrice(p.price)}</span>
              <span className={clsx('num font-bold', p.changePercent24h >= 0 ? 'text-[#00ff41]' : 'text-[#ff0040]')}>
                {p.changePercent24h >= 0 ? '▲' : '▼'} {Math.abs(p.changePercent24h).toFixed(2)}%
              </span>
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}
