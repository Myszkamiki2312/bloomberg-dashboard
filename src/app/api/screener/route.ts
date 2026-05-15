import { NextResponse } from 'next/server'
import { getMockOHLC, getMockPrices } from '@/lib/adapters/mock'
import { getPrices } from '@/lib/adapters'
import { calculateRSI, getTrend, calculateVolatility } from '@/lib/utils/rsi'
import type { ScreenerItem } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

const SCREENER_SYMBOLS = [
  { symbol: 'BTC',  type: 'crypto' as const },
  { symbol: 'ETH',  type: 'crypto' as const },
  { symbol: 'SOL',  type: 'crypto' as const },
  { symbol: 'XRP',  type: 'crypto' as const },
  { symbol: 'AAPL', type: 'stock'  as const },
  { symbol: 'NVDA', type: 'stock'  as const },
  { symbol: 'TSLA', type: 'stock'  as const },
  { symbol: 'MSFT', type: 'stock'  as const },
]

export async function GET() {
  // Live mode: fetch real prices; RSI/trend/volatility use mock OHLCV
  // (fetching 60-day OHLCV for each symbol in parallel would exceed free API limits)
  const livePrices = DEMO_MODE
    ? getMockPrices()
    : await getPrices(SCREENER_SYMBOLS).catch(() => getMockPrices())

  const mockPrices = getMockPrices()

  const screener: ScreenerItem[] = SCREENER_SYMBOLS.map(({ symbol, type }) => {
    const live = livePrices.find(p => p.symbol === symbol)
    const mock = mockPrices.find(p => p.symbol === symbol)
    const asset = live ?? mock!

    const bars = getMockOHLC(symbol, 60)
    const closes = bars.map(b => b.close)

    return {
      symbol: asset.symbol,
      name: asset.name,
      price: asset.price,
      change: asset.changePercent24h,
      volume: asset.volume24h,
      rsi: calculateRSI(closes),
      trend: getTrend(closes),
      volatility: calculateVolatility(closes),
      type,
    }
  })

  return NextResponse.json(screener, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
  })
}
