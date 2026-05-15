'use client'
import { useEffect } from 'react'

interface Shortcut {
  key: string
  desc: string
  category: string
}

const SHORTCUTS: Shortcut[] = [
  { category: 'Nawigacja', key: '?', desc: 'Pokaż/ukryj ten ekran' },
  { category: 'Nawigacja', key: 'ESC', desc: 'Zamknij okno / anuluj' },
  { category: 'Nawigacja', key: 'F1–F8', desc: 'Podświetl panel (klik lub Fn+F na Mac)' },
  { category: 'Watchlista', key: 'Klik wiersza', desc: 'Załaduj symbol na wykres' },
  { category: 'Watchlista', key: '+ Dodaj', desc: 'Dodaj nowy symbol' },
  { category: 'Watchlista', key: 'Hover → ✕', desc: 'Usuń symbol' },
  { category: 'Wykres', key: '1M / 3M / 6M', desc: 'Zmień timeframe' },
  { category: 'Wykres', key: 'Scroll', desc: 'Zoom wykresu' },
  { category: 'Wykres', key: 'Drag', desc: 'Przesuń oś czasu' },
  { category: 'Screener', key: 'Klik nagłówka', desc: 'Sortuj kolumnę (▲/▼)' },
  { category: 'Screener', key: 'Filtry', desc: 'Wszystkie / Akcje / Krypto' },
  { category: 'Alerty', key: '+ Alert', desc: 'Nowy alert cenowy' },
  { category: 'Alerty', key: 'Hover → ✕', desc: 'Usuń alert' },
]

const categories = [...new Set(SHORTCUTS.map(s => s.category))]

export default function KeyboardShortcuts({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === '?') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.85)' }}
      onClick={onClose}
    >
      <div
        className="bg-[#0a0a0a] border border-[#2a2a2a] w-[580px] max-h-[80vh] overflow-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1c1c1c] px-4 py-2">
          <span className="text-[11px] font-bold text-[#ffaa00] tracking-widest uppercase">
            Skróty klawiszowe
          </span>
          <button onClick={onClose} className="text-[#555] hover:text-[#ff0040] text-[11px]">
            ✕ ESC
          </button>
        </div>

        <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-0">
          {categories.map(cat => (
            <div key={cat} className="mb-4">
              <div className="text-[9px] font-bold text-[#666] uppercase tracking-widest mb-2 pb-1 border-b border-[#1c1c1c]">
                {cat}
              </div>
              {SHORTCUTS.filter(s => s.category === cat).map(s => (
                <div key={s.key} className="flex items-center justify-between py-0.5 gap-4">
                  <span className="kbd shrink-0">{s.key}</span>
                  <span className="text-[10px] text-[#888] text-right">{s.desc}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="border-t border-[#1c1c1c] px-4 py-2 text-[9px] text-[#444]">
          Dane: CoinGecko · Yahoo Finance · Finnhub · WSJ/Yahoo RSS · Alternative.me (Fear&amp;Greed) · mock gdy brak kluczy API
        </div>
      </div>
    </div>
  )
}
