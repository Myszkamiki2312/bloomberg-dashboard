'use client'
import { useState } from 'react'
import useSWR from 'swr'
import { clsx } from 'clsx'
import type { ScreenerItem } from '@/types'
import TerminalCard from '@/components/ui/TerminalCard'
import { formatPrice, formatPercent, formatVolume } from '@/lib/utils/formatters'
import { useStore } from '@/lib/store/useStore'

const fetcher = (url: string) => fetch(url).then(r => r.json())

type SortKey = keyof Pick<ScreenerItem, 'symbol' | 'price' | 'change' | 'volume' | 'rsi' | 'volatility'>

const RSI_COLOR = (rsi: number) =>
  rsi > 70 ? 'text-[#ff0040] font-bold' : rsi < 30 ? 'text-[#00ff41] font-bold' : 'text-[#888]'

const RSI_BAR_COLOR = (rsi: number) =>
  rsi > 70 ? '#ff0040' : rsi < 30 ? '#00ff41' : '#555'

const TREND_MAP = {
  bullish: { icon: '▲', label: 'WZROST', color: 'text-[#00ff41]' },
  bearish: { icon: '▼', label: 'SPADEK', color: 'text-[#ff0040]' },
  neutral: { icon: '◆', label: 'BOCZNY', color: 'text-[#888]' },
}

export default function MarketScreener() {
  const [sort, setSort] = useState<SortKey>('volume')
  const [dir, setDir] = useState<'asc' | 'desc'>('desc')
  const [filter, setFilter] = useState<'all' | 'stock' | 'crypto'>('all')
  const { setSelectedSymbol, selectedSymbol } = useStore(s => ({ setSelectedSymbol: s.setSelectedSymbol, selectedSymbol: s.selectedSymbol }))

  const { data = [], isLoading, error } = useSWR<ScreenerItem[]>('/api/screener', fetcher, {
    refreshInterval: 60000,
    revalidateOnFocus: false,
  })

  const handleSort = (key: SortKey) => {
    if (sort === key) setDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSort(key); setDir('desc') }
  }

  const sorted = [...data]
    .filter(item => filter === 'all' || item.type === filter)
    .sort((a, b) => {
      const av = a[sort] as number | string
      const bv = b[sort] as number | string
      const cmp = typeof av === 'number' ? av - (bv as number) : (av as string).localeCompare(bv as string)
      return dir === 'asc' ? cmp : -cmp
    })

  const Th = ({ k, label, right = true }: { k: SortKey; label: string; right?: boolean }) => (
    <th className={clsx('px-2 py-1 text-[9px] font-bold uppercase tracking-widest cursor-pointer select-none transition-colors', right ? 'text-right' : 'text-left', sort === k ? 'text-[#ffaa00]' : 'text-[#444] hover:text-[#888]')}
        onClick={() => handleSort(k)}>
      {label}{sort === k ? (dir === 'desc' ? ' ▼' : ' ▲') : ''}
    </th>
  )

  return (
    <TerminalCard
      title="Screener rynku"
      className="h-full"
      action={
        <div className="flex gap-px">
          {(['all', 'stock', 'crypto'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={clsx('px-2 py-px text-[9px] border transition-colors',
                filter === f ? 'border-[#ffaa00] text-[#ffaa00]' : 'border-[#1c1c1c] text-[#444] hover:text-[#888]'
              )}>
              {f === 'all' ? 'WSZ.' : f === 'stock' ? 'AKC.' : 'KRY.'}
            </button>
          ))}
        </div>
      }
    >
      <div className="overflow-auto h-full">
        <table className="w-full border-collapse text-[10px]">
          <thead className="sticky top-0 bg-[#050505] border-b border-[#1c1c1c]">
            <tr>
              <Th k="symbol" label="Symbol" right={false} />
              <Th k="price"  label="Cena" />
              <Th k="change" label="Zm.24h%" />
              <Th k="volume" label="Wolumen" />
              <Th k="rsi"    label="RSI14" />
              <th className="px-2 py-1 text-[9px] text-[#444] uppercase tracking-widest text-center">Trend</th>
              <Th k="volatility" label="Vol.%" />
            </tr>
          </thead>
          <tbody>
            {isLoading && !sorted.length ? (
              <tr>
                <td colSpan={7} className="px-2 py-3 text-center text-[#444] text-[10px]">
                  <span className="blink text-[#00ff41]">█</span> Ładowanie...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={7} className="px-2 py-3 text-center text-[10px]">
                  <span className="text-[#ff0040]">⚠ Błąd ładowania danych screenerа</span>
                </td>
              </tr>
            ) : !sorted.length ? (
              <tr>
                <td colSpan={7} className="px-2 py-3 text-center text-[#444] text-[10px]">
                  Brak danych dla wybranego filtra
                </td>
              </tr>
            ) : sorted.map(item => {
              const trend = TREND_MAP[item.trend] ?? TREND_MAP.neutral
              const isSelected = item.symbol === selectedSymbol
              return (
                <tr key={item.symbol}
                    onClick={() => setSelectedSymbol(item.symbol, item.type)}
                    className={clsx('border-b border-[#0d0d0d] cursor-pointer tr-hover', isSelected ? 'bg-[#0d1a0d]' : 'hover:bg-[#0f0f0f]')}>
                  <td className="px-2 py-1">
                    <div className="flex items-center gap-1">
                      {isSelected && <span className="text-[#00ff41] text-[10px] shrink-0">▶</span>}
                      <span className={clsx('text-[8px] border px-0.5 shrink-0',
                        item.type === 'crypto' ? 'text-[#00aaaa] border-[#005555]' : 'text-[#0077cc] border-[#003366]'
                      )}>
                        {item.type === 'crypto' ? 'C' : 'S'}
                      </span>
                      <span className="font-bold text-[#ffaa00]">{item.symbol}</span>
                    </div>
                  </td>
                  <td className="px-2 py-1 text-right num text-[#c8c8c8]">
                    {formatPrice(item.price)}
                  </td>
                  <td className={clsx('px-2 py-1 text-right num font-bold', item.change >= 0 ? 'text-[#00ff41]' : 'text-[#ff0040]')}>
                    {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}%
                  </td>
                  <td className="px-2 py-1 text-right text-[#666] num">
                    {formatVolume(item.volume)}
                  </td>
                  <td className="px-2 py-1 text-right">
                    <div className={clsx('num', RSI_COLOR(item.rsi))}>
                      {item.rsi}
                      {item.rsi > 70 && <span className="text-[8px] ml-0.5" title="Wykupiony">OW</span>}
                      {item.rsi < 30 && <span className="text-[8px] ml-0.5" title="Wyprzedany">WS</span>}
                    </div>
                    {/* RSI mini bar */}
                    <div className="bar-track w-full mt-0.5">
                      <div style={{ width: `${item.rsi}%`, background: RSI_BAR_COLOR(item.rsi), height: 2 }} />
                    </div>
                  </td>
                  <td className={clsx('px-2 py-1 text-center text-[10px] font-bold', trend.color)}>
                    {trend.icon} {trend.label}
                  </td>
                  <td className="px-2 py-1 text-right text-[#666] num">
                    {item.volatility}%
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </TerminalCard>
  )
}
