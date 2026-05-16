'use client'
import { useState } from 'react'
import { clsx } from 'clsx'
import { useStore } from '@/lib/store/useStore'
import { formatPrice } from '@/lib/utils/formatters'
import type { PriceAlert } from '@/types'
import TerminalCard from '@/components/ui/TerminalCard'

export default function PriceAlerts() {
  const { alerts, addAlert, removeAlert, clearTriggeredAlerts, selectedSymbol, watchlist } = useStore()
  const [open, setOpen] = useState(false)
  const [symbol, setSymbol] = useState('')
  const [price, setPrice] = useState('')
  const [direction, setDirection] = useState<'above' | 'below'>('above')
  const [error, setError] = useState<string | null>(null)

  const handleAdd = () => {
    const targetPrice = parseFloat(price)
    // Sanitize symbol — same rules as the prices API: only A-Z 0-9 . -
    const cleanSymbol = symbol.trim().replace(/[^A-Z0-9.\-]/gi, '').toUpperCase().slice(0, 12)
    if (!cleanSymbol) { setError('Wprowadź symbol'); return }
    if (!isFinite(targetPrice) || targetPrice <= 0) { setError('Podaj prawidłową cenę'); return }
    addAlert({ symbol: cleanSymbol, targetPrice, direction, active: true })
    setSymbol('')
    setPrice('')
    setError(null)
    setOpen(false)
  }

  const active = alerts.filter(a => a.active && !a.triggered)
  const triggered = alerts.filter(a => a.triggered)

  return (
    <TerminalCard
      title="Alerty cenowe"
      badge={active.length > 0 ? `${active.length} AKTYWNE` : undefined}
      badgeColor="amber"
      className="h-full"
      action={
        <button
          onClick={() => { setSymbol(selectedSymbol); setError(null); setOpen(!open) }}
          className="text-[10px] border border-[#00ff41] text-[#00ff41] px-2 py-0.5 hover:bg-[#00ff41] hover:text-black transition-colors"
        >
          + Alert
        </button>
      }
    >
      <div className="flex flex-col gap-0 overflow-auto">
        {open && (
          <div className="border-b border-[#1c1c1c] p-3 flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                value={symbol}
                onChange={e => { setSymbol(e.target.value); setError(null) }}
                placeholder="Symbol"
                className={clsx(
                  'flex-1 bg-black border px-2 py-1 text-[11px] text-[#c8c8c8] outline-none focus:border-[#00ff41]',
                  error && !symbol.trim() ? 'border-[#ff0040]' : 'border-[#1c1c1c]'
                )}
              />
              <input
                value={price}
                onChange={e => { setPrice(e.target.value); setError(null) }}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                type="number"
                placeholder="Cena"
                className={clsx(
                  'flex-1 bg-black border px-2 py-1 text-[11px] text-[#c8c8c8] outline-none focus:border-[#00ff41]',
                  error && symbol.trim() ? 'border-[#ff0040]' : 'border-[#1c1c1c]'
                )}
              />
            </div>
            {error && (
              <div className="text-[10px] text-[#ff0040] flex items-center gap-1">
                <span>✕</span> {error}
              </div>
            )}
            <div className="flex gap-2">
              {(['above', 'below'] as const).map(d => (
                <button
                  key={d}
                  onClick={() => setDirection(d)}
                  className={clsx(
                    'flex-1 py-0.5 text-[10px] border transition-colors',
                    direction === d
                      ? d === 'above'
                        ? 'border-[#00ff41] text-[#00ff41]'
                        : 'border-[#ff0040] text-[#ff0040]'
                      : 'border-[#1c1c1c] text-[#555]'
                  )}
                >
                  {d === 'above' ? '▲ Powyżej' : '▼ Poniżej'}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={handleAdd} className="flex-1 py-0.5 text-[10px] border border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-black transition-colors">
                Utwórz
              </button>
              <button onClick={() => { setOpen(false); setError(null) }} className="flex-1 py-0.5 text-[10px] border border-[#1c1c1c] text-[#555] hover:border-[#ff0040] hover:text-[#ff0040] transition-colors">
                Anuluj
              </button>
            </div>
          </div>
        )}

        {active.length === 0 && triggered.length === 0 && !open && (
          <div className="p-3 text-[#555] text-[11px]">Brak alertów. Dodaj pierwszy alert.</div>
        )}

        {active.length > 0 && (
          <div>
            <div className="px-3 py-1 text-[10px] text-[#ffaa00] uppercase tracking-widest border-b border-[#1c1c1c]">
              Aktywne
            </div>
            {active.map(alert => (
              <AlertRow
                key={alert.id}
                alert={alert}
                onRemove={removeAlert}
                missingFromWatchlist={!watchlist.some(w => w.symbol === alert.symbol)}
              />
            ))}
          </div>
        )}

        {triggered.length > 0 && (
          <div>
            <div className="px-3 py-1 text-[10px] text-[#555] uppercase tracking-widest border-b border-[#1c1c1c] flex items-center justify-between">
              <span>Wyzwolone</span>
              <button
                onClick={clearTriggeredAlerts}
                className="text-[9px] text-[#444] hover:text-[#ff0040] transition-colors"
              >
                wyczyść
              </button>
            </div>
            {triggered.map(alert => (
              <AlertRow key={alert.id} alert={alert} onRemove={removeAlert} />
            ))}
          </div>
        )}
      </div>
    </TerminalCard>
  )
}

function AlertRow({
  alert,
  onRemove,
  missingFromWatchlist = false,
}: {
  alert: PriceAlert
  onRemove: (id: string) => void
  missingFromWatchlist?: boolean
}) {
  return (
    <div className={clsx(
      'flex flex-col px-3 py-2 border-b border-[#1c1c1c] text-[11px] group hover:bg-[#111] transition-colors',
      alert.triggered && 'opacity-60'
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#ffaa00]">{alert.symbol}</span>
          <span className={alert.direction === 'above' ? 'text-[#00ff41]' : 'text-[#ff0040]'}>
            {alert.direction === 'above' ? '▲' : '▼'}
          </span>
          <span className="text-[#c8c8c8]">{formatPrice(alert.targetPrice)}</span>
          {alert.triggered && (
            <span className="text-[#ffaa00] text-[9px] border border-[#ffaa00] px-1">WYZWOLONY</span>
          )}
        </div>
        <button
          onClick={() => onRemove(alert.id)}
          className="text-[#555] opacity-0 group-hover:opacity-100 hover:text-[#ff0040] transition-opacity text-[10px]"
        >
          ✕
        </button>
      </div>
      {missingFromWatchlist && !alert.triggered && (
        <div className="text-[9px] text-[#ff6600] mt-0.5">
          ⚠ Dodaj {alert.symbol} do watchlisty by monitorować
        </div>
      )}
    </div>
  )
}
