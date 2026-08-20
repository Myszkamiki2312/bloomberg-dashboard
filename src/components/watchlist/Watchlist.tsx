'use client'
import { useState, useRef, useEffect } from 'react'
import useSWR from 'swr'
import { clsx } from 'clsx'
import { useStore } from '@/lib/store/useStore'
import { formatPrice, formatVolume } from '@/lib/utils/formatters'
import type { AssetPrice, WatchlistEntry } from '@/types'
import TerminalCard from '@/components/ui/TerminalCard'
import { SkeletonBlock } from '@/components/ui/Skeleton'

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

function fmtPnl(val: number): string {
  if (!isFinite(val)) return '—'
  const abs = Math.abs(val)
  if (abs >= 1000) return `${(val / 1000).toFixed(1)}k`
  return val.toFixed(2)
}

export default function Watchlist() {
  const { watchlist, selectedSymbol, setSelectedSymbol, removeFromWatchlist, checkAlerts } = useStore()
  const symbolsParam = watchlist.map(w => `${w.symbol}:${w.type}`).join(',')

  const prevPrices = useRef<Record<string, number>>({})
  const [flashMap, setFlashMap] = useState<Record<string, 'up' | 'down' | null>>({})
  const flashTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [editingSymbol, setEditingSymbol] = useState<string | null>(null)

  useEffect(() => () => { if (flashTimeout.current) clearTimeout(flashTimeout.current) }, [])

  const { data: prices = [], isLoading: pricesLoading, error: pricesError } = useSWR<AssetPrice[]>(
    watchlist.length ? `/api/prices?symbols=${symbolsParam}` : null,
    fetcher,
    {
      refreshInterval: 30000,
      revalidateOnFocus: false,
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
  const hasDemoPrices = prices.some(price => price.quality === 'demo')
  const hasDelayedPrices = prices.some(price => price.quality === 'delayed')
  const qualityBadge = prices.length === 0 ? 'ŁADOWANIE' : hasDemoPrices ? 'CZĘŚĆ DEMO' : hasDelayedPrices ? 'OPÓŹN.' : 'LIVE'
  const qualityColor = prices.length === 0 ? 'muted' : hasDemoPrices || hasDelayedPrices ? 'amber' : 'green'
  const maxVol = Math.max(...prices.map(p => isFinite(p.volume24h) ? p.volume24h : 0), 1)

  // Portfolio totals — wait for all position prices before computing P&L
  // (avoids showing large fake loss while prices are still loading)
  const portfolioEntries = watchlist.filter(w => w.quantity && w.quantity > 0 && w.avgPrice && w.avgPrice > 0)
  const portfolioPricesLoaded = portfolioEntries.length > 0 && portfolioEntries.every(w => priceMap[w.symbol] !== undefined)
  const totalValue  = portfolioPricesLoaded ? portfolioEntries.reduce((sum, w) => {
    const p = priceMap[w.symbol]
    return sum + (p ? p.price * w.quantity! : 0)
  }, 0) : 0
  const totalCost   = portfolioEntries.reduce((sum, w) => sum + w.avgPrice! * w.quantity!, 0)
  const totalPnl    = totalValue - totalCost
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0
  const hasPortfolio = portfolioEntries.length > 0

  return (
    <TerminalCard
      title="Watchlista"
      badge={qualityBadge}
      badgeColor={qualityColor}
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
          const hasPos = !!(entry.quantity && entry.quantity > 0 && entry.avgPrice && entry.avgPrice > 0)
          const pnl    = hasPos && p ? (p.price - entry.avgPrice!) * entry.quantity! : null
          // Only compute pnlPct when price is loaded — p?.price ?? 0 would show -100% while loading
          const pnlPct = hasPos && p && entry.avgPrice! > 0 ? (p.price - entry.avgPrice!) / entry.avgPrice! * 100 : null

          return (
            <div key={entry.symbol}>
              <div
                onClick={() => {
                  setSelectedSymbol(entry.symbol, entry.type)
                  // Close editor if another row is clicked
                  if (editingSymbol && editingSymbol !== entry.symbol) setEditingSymbol(null)
                }}
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
                    <div className="text-[9px] text-[#444] truncate">
                      {p?.name && p.name !== entry.symbol ? p.name : entry.name}
                    </div>
                  </div>
                </div>

                {/* Price */}
                <div className="text-right">
                  <div className={clsx('num font-bold', flash === 'up' ? 'text-[#00ff41]' : flash === 'down' ? 'text-[#ff0040]' : 'text-[#c8c8c8]')}>
                    {p ? formatPrice(p.price) : '—'}
                  </div>
                  {hasPos && pnl !== null ? (
                    <div className={clsx('text-[9px] num font-bold', pnl >= 0 ? 'text-[#00ff41]' : 'text-[#ff0040]')}>
                      {pnl >= 0 ? '+' : ''}{fmtPnl(pnl)}
                    </div>
                  ) : p ? (
                    <div className="text-[9px] text-[#444] num">{formatVolume(p.volume24h)}</div>
                  ) : null}
                </div>

                {/* Change % / P&L% + actions */}
                <div className="text-right flex flex-col items-end gap-0.5">
                  {hasPos && pnlPct !== null ? (
                    <span className={clsx('num font-bold', pnlPct >= 0 ? 'text-[#00ff41]' : 'text-[#ff0040]')}>
                      {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%
                    </span>
                  ) : (
                    <span className={clsx('num font-bold', p && p.changePercent24h >= 0 ? 'text-[#00ff41]' : 'text-[#ff0040]')}>
                      {p ? `${p.changePercent24h >= 0 ? '+' : ''}${p.changePercent24h.toFixed(2)}%` : '—'}
                    </span>
                  )}
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                    <button
                      onClick={e => { e.stopPropagation(); setEditingSymbol(s => s === entry.symbol ? null : entry.symbol) }}
                      title="Ustaw pozycję"
                      aria-label={`Ustaw pozycję ${entry.symbol}`}
                      className="text-[10px] text-[#555] hover:text-[#ffaa00] transition-colors leading-none px-0.5"
                    >
                      ✎
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); removeFromWatchlist(entry.symbol) }}
                      title={`Usuń ${entry.symbol}`}
                      aria-label={`Usuń ${entry.symbol}`}
                      className="text-[10px] text-[#333] hover:text-[#ff0040] transition-colors leading-none px-0.5"
                    >
                      ✕
                    </button>
                  </div>
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

              {/* Inline position editor */}
              {editingSymbol === entry.symbol && (
                <PositionEditor
                  entry={entry}
                  currentPrice={p?.price}
                  onClose={() => setEditingSymbol(null)}
                />
              )}
            </div>
          )
        })}

        <AddSymbol />
      </div>

      {/* Portfolio summary — only shown once all prices loaded to avoid fake P&L on mount */}
      {hasPortfolio && totalCost > 0 && portfolioPricesLoaded && (
        <div className="border-t border-[#1c1c1c] px-2 py-2 bg-[#050505] mt-auto">
          <div className="flex items-center justify-between text-[10px] mb-1">
            <span className="text-[#555] uppercase tracking-widest text-[9px]">Portfel</span>
            <span className="num text-[#c8c8c8] font-bold">{formatPrice(totalValue)}</span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-[#555]">Koszt: <span className="text-[#666] num">{formatPrice(totalCost)}</span></span>
            <span className={clsx('num font-bold', totalPnl >= 0 ? 'text-[#00ff41]' : 'text-[#ff0040]')}>
              {totalPnl >= 0 ? '+' : ''}{fmtPnl(totalPnl)} ({totalPnlPct >= 0 ? '+' : ''}{totalPnlPct.toFixed(2)}%)
            </span>
          </div>
          <div className="bar-track mt-1">
            <div
              className={totalPnl >= 0 ? 'bar-fill-pos' : 'bar-fill-neg'}
              style={{ width: `${Math.min(Math.abs(totalPnlPct) * 2, 100)}%` }}
            />
          </div>
        </div>
      )}
      </>
      )}
    </TerminalCard>
  )
}

function PositionEditor({
  entry,
  currentPrice,
  onClose,
}: {
  entry: WatchlistEntry
  currentPrice?: number
  onClose: () => void
}) {
  const updateWatchlistEntry = useStore(s => s.updateWatchlistEntry)
  const [qty, setQty]   = useState(entry.quantity?.toString() ?? '')
  const [avg, setAvg]   = useState(entry.avgPrice?.toString() ?? (currentPrice?.toString() ?? ''))

  const handleSave = () => {
    const quantity = parseFloat(qty)
    const avgPrice = parseFloat(avg)
    // Reject NaN, Infinity, negative quantities, and non-positive prices
    if (!isFinite(quantity) || quantity < 0) return
    if (!isFinite(avgPrice) || avgPrice <= 0) return
    updateWatchlistEntry(entry.symbol, { quantity, avgPrice })
    onClose()
  }

  const handleClear = () => {
    updateWatchlistEntry(entry.symbol, { quantity: 0, avgPrice: 0 })
    onClose()
  }

  return (
    <div className="mx-2 mb-1 border border-[#1c1c1c] bg-[#050505] p-2 flex flex-col gap-1.5">
      <div className="text-[9px] text-[#ffaa00] uppercase tracking-widest">
        Pozycja — {entry.symbol}
      </div>
      <div className="flex gap-1.5">
        <div className="flex-1">
          <div className="text-[9px] text-[#555] mb-0.5">Ilość</div>
          <input
            value={qty}
            onChange={e => setQty(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            type="number"
            min="0"
            step="any"
            placeholder="0"
            className="w-full bg-black border border-[#2a2a2a] focus:border-[#ffaa00] px-1.5 py-0.5 text-[10px] text-[#c8c8c8] outline-none"
            autoFocus
          />
        </div>
        <div className="flex-1">
          <div className="text-[9px] text-[#555] mb-0.5">Śr. cena</div>
          <input
            value={avg}
            onChange={e => setAvg(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            type="number"
            min="0"
            step="any"
            placeholder="0"
            className="w-full bg-black border border-[#2a2a2a] focus:border-[#ffaa00] px-1.5 py-0.5 text-[10px] text-[#c8c8c8] outline-none"
          />
        </div>
      </div>
      {qty && avg && isFinite(parseFloat(qty)) && isFinite(parseFloat(avg)) && currentPrice && (
        <div className="text-[9px] text-[#555]">
          Wartość: <span className="text-[#c8c8c8] num">{formatPrice(parseFloat(qty) * currentPrice)}</span>
          {' · '}
          P&L:{' '}
          <span className={clsx('num font-bold', (currentPrice - parseFloat(avg)) >= 0 ? 'text-[#00ff41]' : 'text-[#ff0040]')}>
            {fmtPnl((currentPrice - parseFloat(avg)) * parseFloat(qty))}
          </span>
        </div>
      )}
      <div className="flex gap-1">
        <button onClick={handleSave} className="flex-1 py-0.5 text-[10px] border border-[#ffaa00] text-[#ffaa00] hover:bg-[#ffaa00] hover:text-black transition-colors">
          ZAPISZ
        </button>
        <button onClick={handleClear} className="py-0.5 px-2 text-[10px] border border-[#333] text-[#555] hover:border-[#ff0040] hover:text-[#ff0040] transition-colors">
          WYCZYŚĆ
        </button>
        <button onClick={onClose} className="py-0.5 px-2 text-[10px] border border-[#222] text-[#444] hover:border-[#555] transition-colors">
          ✕
        </button>
      </div>
    </div>
  )
}

function AddSymbol() {
  const { addToWatchlist, watchlist } = useStore(s => ({ addToWatchlist: s.addToWatchlist, watchlist: s.watchlist }))
  const [open, setOpen] = useState(false)
  const [symbol, setSymbol] = useState('')
  const [type, setType] = useState<'stock' | 'crypto'>('stock')
  const [error, setError] = useState<string | null>(null)

  const handleAdd = () => {
    // Sanitize: only A-Z 0-9 . - (same rules as the prices API)
    const upper = symbol.trim().replace(/[^A-Z0-9.\-]/gi, '').toUpperCase().slice(0, 12)
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
