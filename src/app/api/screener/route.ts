import { NextResponse } from 'next/server'
import { getMockOHLC, getMockPrices } from '@/lib/adapters/mock'
import { getPrices } from '@/lib/adapters'
import { fetchCryptoOHLC } from '@/lib/adapters/coingecko'
import { fetchYahooOHLC } from '@/lib/adapters/yahoo'
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

async function getRealOHLC(symbol: string, type: 'crypto' | 'stock'): Promise<number[]> {
  if (DEMO_MODE) return getMockOHLC(symbol, 60).map(b => b.close)
  if (type === 'crypto') {
    try {
      const bars = await fetchCryptoOHLC(symbol, 30)
      if (bars.length >= 15) return bars.map(b => b.close)
    } catch {}
  } else {
    try {
      const bars = await fetchYahooOHLC(symbol, 90)
      if (bars.length >= 15) return bars.map(b => b.close)
    } catch {}
  }
  return getMockOHLC(symbol, 60).map(b => b.close)
}

export async function GET() {
  const livePrices = DEMO_MODE
    ? getMockPrices()
    : await getPrices(SCREENER_SYMBOLS).catch(() => getMockPrices())

  const mockPrices = getMockPrices()

  // Fetch OHLCV in parallel — crypto gets real data, stocks use mock
  const ohlcvResults = await Promise.allSettled(
    SCREENER_SYMBOLS.map(({ symbol, type }) => getRealOHLC(symbol, type))
  )

  const screener: ScreenerItem[] = SCREENER_SYMBOLS.map(({ symbol, type }, i) => {
    const live = livePrices.find(p => p.symbol === symbol)
    const mock = mockPrices.find(p => p.symbol === symbol)
    const asset = live ?? mock!

    const closes = ohlcvResults[i].status === 'fulfilled'
      ? ohlcvResults[i].value
      : getMockOHLC(symbol, 60).map(b => b.close)

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
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  })
}
