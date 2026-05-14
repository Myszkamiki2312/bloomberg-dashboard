'use client'
import useSWR from 'swr'
import { clsx } from 'clsx'
import type { AssetPrice } from '@/types'
import TerminalCard from '@/components/ui/TerminalCard'
import { formatPrice, formatPercent, formatVolume } from '@/lib/utils/formatters'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const OVERVIEW_SYMBOLS = 'BTC:crypto,ETH:crypto,SOL:crypto,AAPL:stock,NVDA:stock,MSFT:stock'

interface IndexRow { label: string; value: string; change: string; pos: boolean }
const MOCK_INDICES: IndexRow[] = [
  { label: 'S&P 500', value: '5 261.72', change: '+0.41%', pos: true  },
  { label: 'NASDAQ',  value: '18 234',   change: '+0.68%', pos: true  },
  { label: 'DJIA',    value: '39 721',   change: '+0.22%', pos: true  },
  { label: 'VIX',     value: '14.23',    change: '-2.60%', pos: false },
  { label: 'USD/PLN', value: '3.9542',   change: '-0.18%', pos: false },
  { label: 'EUR/USD', value: '1.0847',   change: '+0.09%', pos: true  },
]

export default function MarketOverview() {
  const { data: prices = [] } = useSWR<AssetPrice[]>(
    `/api/prices?symbols=${OVERVIEW_SYMBOLS}`,
    fetcher,
    { refreshInterval: 30000 }
  )

  const btc = prices.find(p => p.symbol === 'BTC')
  const cryptoMcap = prices.filter(p => p.type === 'crypto').reduce((s, p) => s + p.marketCap, 0)
  const btcDom = cryptoMcap > 0 && btc ? (btc.marketCap / cryptoMcap) * 100 : 0

  // Fear & greed: mock, stable
  const fg = 65

  return (
    <TerminalCard title="Rynek globalny" className="h-full">
      <div className="overflow-auto h-full">

        {/* Indices table */}
        <div className="border-b border-[#1c1c1c]">
          <div className="px-2 py-1 text-[9px] text-[#444] uppercase tracking-widest bg-[#050505]">
            Indeksy (mock)
          </div>
          {MOCK_INDICES.map(idx => (
            <div key={idx.label} className="flex items-center justify-between px-2 py-1 border-b border-[#0f0f0f] hover:bg-[#0f0f0f] text-[10px]">
              <span className="text-[#888]">{idx.label}</span>
              <div className="flex items-center gap-3">
                <span className="num text-[#c8c8c8]">{idx.value}</span>
                <span className={clsx('num font-bold w-14 text-right', idx.pos ? 'text-[#00ff41]' : 'text-[#ff0040]')}>
                  {idx.change}
                </span>
              </div>
            </div>
          ))}
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

        {/* BTC dominance */}
        {btcDom > 0 && (
          <div className="px-2 py-1.5 border-b border-[#1c1c1c]">
            <div className="flex items-center justify-between text-[10px] mb-1">
              <span className="text-[#888]">Dominacja BTC</span>
              <span className="num font-bold text-[#ffaa00]">{btcDom.toFixed(1)}%</span>
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
            <span className="num font-bold text-[#00ff41]">{fg} · CHCIWOŚĆ</span>
          </div>
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
          <div className="flex justify-between text-[8px] text-[#333] mt-0.5">
            <span>Strach</span>
            <span>Neutralny</span>
            <span>Chciwość</span>
          </div>
          <div className="text-[8px] text-[#333] mt-0.5">(dane mock)</div>
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
