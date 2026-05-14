'use client'
import { useState, useRef, useEffect } from 'react'
import useSWR from 'swr'
import { clsx } from 'clsx'
import { useStore } from '@/lib/store/useStore'
import { formatPrice, formatPercent, formatVolume } from '@/lib/utils/formatters'
import type { AssetPrice } from '@/types'
import TerminalCard from '@/components/ui/TerminalCard'
import { SkeletonBlock } from '@/components/ui/Skeleton'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function Watchlist() {
  const { watchlist, selectedSymbol, setSelectedSymbol, removeFromWatchlist, checkAlerts } = useStore()
  const symbolsParam = watchlist.map(w => `${w.symbol}:${w.type}`).join(',')

  const prevPrices = useRef<Record<string, number>>({})
  const [flashMap, setFlashMap] = useState<Record<string, 'up' | 'down' | null>>({})
  const flashTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clear pending flash timer on unmount to avoid setState on unmounted component
  useEffect(() => () => { if (flashTimeout.current) clearTimeout(flashTimeout.current) }, [])

  const { data: prices = [], isLoading: pricesLoading, error: pricesError } = useSWR<AssetPrice[]>(
    watchlist.length ? `/api/prices?symbols=${symbolsParam}` : null,
    fetcher,
    {
      refreshInterval: 30000,
      onSuccess: data => {
        const newFlash: Record<string, 'up' | 'down' | null> = {}
        const priceMap: Record<string, number> = {}
        data.forEach(p => {
          const prev = prevPrices.current[p.symbol]
          if (prev !== undefined) {
            newFlash[p.symbol] = p.price > prev ? 'up' : p.price < prev ? 'down' : null
          }
          prevPrices.current[p.symbol] = p.price
          priceMap[p.symbol] = p.price
        })
        setFlashMap(newFlash)
        checkAlerts(priceMap)
        if (flashTimeout.current) clearTimeout(flashTimeout.current)
        flashTimeout.current = setTimeout(() => setFlashMap({}), 800)
      },
    }
  )

  const priceMap = Object.fromEntries(prices.map(p => [p.symbol, p]))
  const maxVol = Math.max(...prices.map(p => p.volume24h), 1)

  return (
    <TerminalCard
      title="Watchlista"
      badge="LIVE"
      badgeColor="green"
      className="h-full"
    >
      {pricesError ? (
        <div className="flex flex-col items-center justify-center gap-2 p-4 text-[10px]">
          <span className="text-[#ff0040]">⚠ Błąd ładowania cen</span>
          <span className="text-[#444]">{pricesError.message ?? 'Sprawdź połączenie lub klucze API'}</span>
        </div>
      ) : (pricesLoading && prices.length === 0) ? <SkeletonBlock rows={8} cols={3} /> : (
      <>
      {/* Column headers */}
      <div className="grid border-b border-[#1c1c1c] px-2 py-1 text-[9px] text-[#444] uppercase tracking-widest bg-[#050505]"
           style={{ gridTemplateColumns: '1fr 80px 52px' }}>
        <span>Symbol</span>
        <span className="text-right">Cena</span>
        <span className="text-right">24h%</span>
      </div>

      <div className="flex flex-col">
        {watchlist.map(entry => {
          const p = priceMap[entry.symbol]
          const isSelected = selectedSymbol === entry.symbol
          const flash = flashMap[entry.symbol]
          const volPct = p ? (p.volume24h / maxVol) * 100 : 0

          return (
            <div key={entry.symbol}>
              <div
                onClick={() => setSelectedSymbol(entry.symbol, entry.type)}
                className={clsx(
                  'grid px-2 py-1 cursor-pointer border-b border-[#111] text-[11px] transition-colors group relative',
                  flash === 'up' ? 'flash-up' : flash === 'down' ? 'flash-down' : '',
                  isSelected ? 'bg-[#0d1a0d]' : 'hover:bg-[#0f0f0f]',
                )}
                style={{ gridTemplateColumns: '1fr 80px 52px' }}
              >
                {/* Symbol + type badge */}
                <div className="flex items-center gap-1.5 min-w-0">
                  {isSelected && <span className="text-[#00ff41] text-[10px] shrink-0">▶</span>}
                  <span className={clsx(
                    'text-[8px] font-bold border px-0.5 shrink-0',
                    entry.type === 'crypto' ? 'text-[#00aaaa] border-[#005555]' : 'text-[#0077cc] border-[#003366]'
                  )}>
                    {entry.type === 'crypto' ? 'C' : 'S'}
                  </span>
                  <div className="min-w-0">
                    <div className="font-bold text-[#ffaa00] truncate">{entry.symbol}</div>
                    <div className="text-[9px] text-[#444] truncate">{entry.name}</div>
                  </div>
                </div>

                {/* Price */}
                <div className="text-right">
                  <div className={clsx('num font-bold', flash === 'up' ? 'text-[#00ff41]' : flash === 'down' ? 'text-[#ff0040]' : 'text-[#c8c8c8]')}>
                    {p ? formatPrice(p.price) : '—'}
                  </div>
                  {p && (
                    <div className="text-[9px] text-[#444] num">{formatVolume(p.volume24h)}</div>
                  )}
                </div>

                {/* Change % */}
                <div className="text-right flex flex-col items-end">
                  {p ? (
                    <>
                      <span className={clsx('num font-bold', p.changePercent24h >= 0 ? 'text-[#00ff41]' : 'text-[#ff0040]')}>
                        {p.changePercent24h >= 0 ? '+' : ''}{p.changePercent24h.toFixed(2)}%
                      </span>
                      <button
                        onClick={e => { e.stopPropagation(); removeFromWatchlist(entry.symbol) }}
                        className="text-[8px] text-[#333] opacity-0 group-hover:opacity-100 hover:text-[#ff0040] transition-opacity"
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <span className="text-[#333]">—</span>
                  )}
                </div>
              </div>
              {/* Volume bar */}
              {p && (
                <div className="bar-track mx-2 mb-px">
                  <div
                    className={p.changePercent24h >= 0 ? 'bar-fill-pos' : 'bar-fill-neg'}
                    style={{ width: `${volPct}%` }}
                  />
                </div>
              )}
            </div>
          )
        })}

        <AddSymbol />
      </div>
      </>
      )}
    </TerminalCard>
  )
}

function AddSymbol() {
  const { addToWatchlist, watchlist } = useStore(s => ({ addToWatchlist: s.addToWatchlist, watchlist: s.watchlist }))
  const [open, setOpen] = useState(false)
  const [symbol, setSymbol] = useState('')
  const [type, setType] = useState<'stock' | 'crypto'>('stock')
  const [error, setError] = useState<string | null>(null)

  const handleAdd = () => {
    const upper = symbol.trim().toUpperCase()
    if (!upper) return
    if (watchlist.some(w => w.symbol === upper)) {
      setError(`${upper} już na liście`)
      return
    }
    addToWatchlist({ symbol: upper, name: upper, type })
    setSymbol('')
    setOpen(false)
    setError(null)
  }

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      className="mx-2 my-1.5 border border-dashed border-[#222] text-[#444] text-[10px] py-1 hover:border-[#00ff41] hover:text-[#00ff41] transition-colors tracking-wider"
    >
      + DODAJ SYMBOL
    </button>
  )

  return (
    <div className="m-2 border border-[#1c1c1c] p-2 flex flex-col gap-1.5 bg-[#050505]">
      <input
        value={symbol}
        onChange={e => { setSymbol(e.target.value); setError(null) }}
        onKeyDown={e => e.key === 'Enter' && handleAdd()}
        placeholder="Symbol (AAPL, BTC…)"
        className={clsx(
          'bg-black border px-2 py-1 text-[11px] text-[#c8c8c8] outline-none w-full',
          error ? 'border-[#ff0040]' : 'border-[#2a2a2a] focus:border-[#00ff41]'
        )}
        autoFocus
      />
      {error && (
        <div className="text-[10px] text-[#ff0040] flex items-center gap-1">
          <span>✕</span> {error}
        </div>
      )}
      <div className="flex gap-1">
        {(['stock', 'crypto'] as const).map(t => (
          <button key={t} onClick={() => setType(t)}
            className={clsx('flex-1 py-0.5 text-[10px] border transition-colors',
              type === t
                ? t === 'stock' ? 'border-[#0077cc] text-[#0077cc]' : 'border-[#00aaaa] text-[#00aaaa]'
                : 'border-[#222] text-[#444]'
            )}>
            {t === 'stock' ? 'AKCJA' : 'KRYPTO'}
          </button>
        ))}
      </div>
      <div className="flex gap-1">
        <button onClick={handleAdd} className="flex-1 py-0.5 text-[10px] border border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-black transition-colors">DODAJ</button>
        <button onClick={() => { setOpen(false); setError(null) }} className="flex-1 py-0.5 text-[10px] border border-[#222] text-[#444] hover:border-[#ff0040] hover:text-[#ff0040] transition-colors">ANULUJ</button>
      </div>
    </div>
  )
}
