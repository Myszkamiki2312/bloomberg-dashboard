'use client'
import { useState } from 'react'
import { clsx } from 'clsx'
import { useStore } from '@/lib/store/useStore'
import { formatPrice } from '@/lib/utils/formatters'
import type { PriceAlert } from '@/types'
import TerminalCard from '@/components/ui/TerminalCard'

export default function PriceAlerts() {
  const { alerts, addAlert, removeAlert } = useStore()
  const [open, setOpen] = useState(false)
  const [symbol, setSymbol] = useState('')
  const [price, setPrice] = useState('')
  const [direction, setDirection] = useState<'above' | 'below'>('above')

  const handleAdd = () => {
    const targetPrice = parseFloat(price)
    if (!symbol.trim() || isNaN(targetPrice)) return
    addAlert({ symbol: symbol.toUpperCase(), targetPrice, direction, active: true })
    setSymbol('')
    setPrice('')
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
          onClick={() => setOpen(!open)}
          className="text-[10px] border border-terminal-green text-terminal-green px-2 py-0.5 hover:bg-terminal-green hover:text-black transition-colors"
        >
          + Alert
        </button>
      }
    >
      <div className="flex flex-col gap-0 overflow-auto">
        {open && (
          <div className="border-b border-terminal-border p-3 flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                value={symbol}
                onChange={e => setSymbol(e.target.value)}
                placeholder="Symbol"
                className="flex-1 bg-black border border-terminal-border px-2 py-1 text-[11px] text-terminal-text outline-none focus:border-terminal-green"
              />
              <input
                value={price}
                onChange={e => setPrice(e.target.value)}
                type="number"
                placeholder="Cena"
                className="flex-1 bg-black border border-terminal-border px-2 py-1 text-[11px] text-terminal-text outline-none focus:border-terminal-green"
              />
            </div>
            <div className="flex gap-2">
              {(['above', 'below'] as const).map(d => (
                <button
                  key={d}
                  onClick={() => setDirection(d)}
                  className={clsx(
                    'flex-1 py-0.5 text-[10px] border transition-colors',
                    direction === d
                      ? d === 'above'
                        ? 'border-terminal-green text-terminal-green'
                        : 'border-terminal-red text-terminal-red'
                      : 'border-terminal-border text-terminal-muted'
                  )}
                >
                  {d === 'above' ? '▲ Powyżej' : '▼ Poniżej'}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={handleAdd} className="flex-1 py-0.5 text-[10px] border border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-black transition-colors">
                Utwórz
              </button>
              <button onClick={() => setOpen(false)} className="flex-1 py-0.5 text-[10px] border border-terminal-border text-terminal-muted hover:border-terminal-red hover:text-terminal-red transition-colors">
                Anuluj
              </button>
            </div>
          </div>
        )}

        {active.length === 0 && triggered.length === 0 && !open && (
          <div className="p-3 text-terminal-muted text-[11px]">Brak alertów. Dodaj pierwszy alert.</div>
        )}

        {active.length > 0 && (
          <div>
            <div className="px-3 py-1 text-[10px] text-terminal-amber uppercase tracking-widest border-b border-terminal-border">
              Aktywne
            </div>
            {active.map(alert => (
              <AlertRow key={alert.id} alert={alert} onRemove={removeAlert} />
            ))}
          </div>
        )}

        {triggered.length > 0 && (
          <div>
            <div className="px-3 py-1 text-[10px] text-terminal-muted uppercase tracking-widest border-b border-terminal-border">
              Wyzwolone
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

function AlertRow({ alert, onRemove }: { alert: PriceAlert; onRemove: (id: string) => void }) {
  return (
    <div className={clsx(
      'flex items-center justify-between px-3 py-2 border-b border-terminal-border text-[11px] group hover:bg-terminal-border transition-colors',
      alert.triggered && 'opacity-60'
    )}>
      <div className="flex items-center gap-2">
        <span className="font-bold text-terminal-amber">{alert.symbol}</span>
        <span className={alert.direction === 'above' ? 'text-terminal-green' : 'text-terminal-red'}>
          {alert.direction === 'above' ? '▲' : '▼'}
        </span>
        <span className="text-terminal-text">{formatPrice(alert.targetPrice)}</span>
        {alert.triggered && (
          <span className="text-terminal-amber text-[9px] border border-terminal-amber px-1">WYZWOLONY</span>
        )}
      </div>
      <button
        onClick={() => onRemove(alert.id)}
        className="text-terminal-muted opacity-0 group-hover:opacity-100 hover:text-terminal-red transition-opacity text-[10px]"
      >
        ✕
      </button>
    </div>
  )
}
