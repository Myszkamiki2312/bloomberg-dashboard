'use client'
import useSWR from 'swr'
import { clsx } from 'clsx'
import type { AssetPrice } from '@/types'
import TerminalCard from '@/components/ui/TerminalCard'
import { formatPrice, formatVolume } from '@/lib/utils/formatters'
import { SkeletonBlock } from '@/components/ui/Skeleton'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const OVERVIEW_SYMBOLS = 'BTC:crypto,ETH:crypto,SOL:crypto,AAPL:stock,NVDA:stock,MSFT:stock'

interface IndexRow { symbol: string; name: string; value: number; change: number; pct: number }

export default function MarketOverview() {
  const { data: prices = [] } = useSWR<AssetPrice[]>(
    `/api/prices?symbols=${OVERVIEW_SYMBOLS}`,
    fetcher,
    { refreshInterval: 30000, revalidateOnFocus: false }
  )
  const { data: indices = [] } = useSWR<IndexRow[]>('/api/indices', fetcher, { refreshInterval: 60000, revalidateOnFocus: false })
  const { data: fngData } = useSWR<{ value: number; label: string }>(
    '/api/fng', fetcher, { refreshInterval: 3600000, revalidateOnFocus: false }
  )
  const { data: globalData } = useSWR<{ btcDominance: number; totalMarketCapUsd: number }>(
    '/api/crypto-global', fetcher, { refreshInterval: 300000, revalidateOnFocus: false }
  )

  const btcDom = globalData?.btcDominance ?? 0

  const fg = fngData?.value ?? 0
  const fgLabel = fngData?.label ?? '...'

  return (
    <TerminalCard title="Rynek globalny" className="h-full">
      <div className="overflow-auto h-full">

        {/* Indices table */}
        <div className="border-b border-[#1c1c1c]">
          <div className="px-2 py-1 text-[9px] text-[#444] uppercase tracking-widest bg-[#050505]">
            Indeksy
          </div>
          {indices.length === 0 ? <SkeletonBlock rows={8} cols={2} /> : indices.map(idx => {
            const pos = idx.pct >= 0
            const decimals = idx.value < 10 ? 4 : idx.value < 1000 ? 2 : 0
            return (
              <div key={idx.symbol} className="flex items-center justify-between px-2 py-1 border-b border-[#0f0f0f] hover:bg-[#0f0f0f] text-[10px]">
                <span className="text-[#888]">{idx.symbol}</span>
                <div className="flex items-center gap-3">
                  <span className="num text-[#c8c8c8]">{idx.value.toLocaleString('pl-PL', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</span>
                  <span className={clsx('num font-bold w-14 text-right', pos ? 'text-[#00ff41]' : 'text-[#ff0040]')}>
                    {pos ? '+' : ''}{idx.pct.toFixed(2)}%
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Crypto prices */}
        {prices.filter(p => p.type === 'crypto').length > 0 && (
          <div className="border-b border-[#1c1c1c]">
            <div className="px-2 py-1 text-[9px] text-[#444] uppercase tracking-widest bg-[#050505]">
              Krypto
            </div>
            {prices.filter(p => p.type === 'crypto').map(asset => (
              <AssetRow key={asset.symbol} asset={asset} />
            ))}
          </div>
        )}

        {/* Stock prices */}
        {prices.filter(p => p.type === 'stock').length > 0 && (
          <div className="border-b border-[#1c1c1c]">
            <div className="px-2 py-1 text-[9px] text-[#444] uppercase tracking-widest bg-[#050505]">
              Akcje US
            </div>
            {prices.filter(p => p.type === 'stock').map(asset => (
              <AssetRow key={asset.symbol} asset={asset} />
            ))}
          </div>
        )}

        {/* BTC dominance + total market cap */}
        {btcDom > 0 && (
          <div className="px-2 py-1.5 border-b border-[#1c1c1c]">
            <div className="flex items-center justify-between text-[10px] mb-1">
              <span className="text-[#888]">Dominacja BTC</span>
              <div className="flex items-center gap-2">
                {globalData?.totalMarketCapUsd ? (
                  <span className="text-[#444] text-[9px]">
                    Total: <span className="text-[#666]">{formatVolume(globalData.totalMarketCapUsd)}</span>
                  </span>
                ) : null}
                <span className="num font-bold text-[#ffaa00]">{btcDom.toFixed(1)}%</span>
              </div>
            </div>
            <div className="bar-track">
              <div className="bar-fill-pos" style={{ width: `${btcDom}%`, height: 3 }} />
            </div>
          </div>
        )}

        {/* Fear & Greed */}
        <div className="px-2 py-1.5">
          <div className="flex items-center justify-between text-[10px] mb-1">
            <span className="text-[#888]">Strach & Chciwość</span>
            <span className={clsx('num font-bold', fg > 50 ? 'text-[#00ff41]' : fg < 50 ? 'text-[#ff0040]' : 'text-[#ffaa00]')}>
              {fg > 0 ? fg : '—'} · {fgLabel}
            </span>
          </div>
          {fg > 0 && (
            <div className="bar-track relative">
              <div className="absolute inset-0 flex">
                <div style={{ width: '25%', background: '#ff0040', opacity: 0.25, height: 4 }} />
                <div style={{ width: '25%', background: '#ff6600', opacity: 0.25, height: 4 }} />
                <div style={{ width: '25%', background: '#ffaa00', opacity: 0.25, height: 4 }} />
                <div style={{ width: '25%', background: '#00ff41', opacity: 0.25, height: 4 }} />
              </div>
              <div
                className="absolute top-0 bottom-0 w-1 bg-white"
                style={{ left: `calc(${fg}% - 1px)`, height: 4 }}
              />
            </div>
          )}
          <div className="flex justify-between text-[8px] text-[#333] mt-0.5">
            <span>Strach</span>
            <span>Neutralny</span>
            <span>Chciwość</span>
          </div>
        </div>
      </div>
    </TerminalCard>
  )
}

function AssetRow({ asset }: { asset: AssetPrice }) {
  return (
    <div className="flex items-center justify-between px-2 py-1 border-b border-[#0f0f0f] hover:bg-[#0f0f0f] text-[10px]">
      <div>
        <span className="font-bold text-[#ffaa00]">{asset.symbol}</span>
        {asset.marketCap > 0 && (
          <span className="text-[8px] text-[#444] ml-1">{formatVolume(asset.marketCap)}</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="num text-[#c8c8c8]">{formatPrice(asset.price)}</span>
        <span className={clsx('num font-bold w-14 text-right', asset.changePercent24h >= 0 ? 'text-[#00ff41]' : 'text-[#ff0040]')}>
          {asset.changePercent24h >= 0 ? '+' : ''}{asset.changePercent24h.toFixed(2)}%
        </span>
      </div>
    </div>
  )
}
