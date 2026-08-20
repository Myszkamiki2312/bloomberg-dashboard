import { NextResponse } from 'next/server'
import { getMockOHLC, getMockPrices } from '@/lib/adapters/mock'
import { getPrices } from '@/lib/adapters'
import { fetchCryptoOHLC } from '@/lib/adapters/coingecko'
import { fetchYahooOHLC } from '@/lib/adapters/yahoo'
import { calculateRSI, getTrend, calculateVolatility } from '@/lib/utils/rsi'
import type { DataQuality, OHLCBar, ScreenerItem } from '@/types'

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

interface CloseSeries {
  closes: number[]
  quality: DataQuality
  source: string
}

function toCloseSeries(bars: OHLCBar[]): CloseSeries {
  return {
    closes: bars.map(bar => bar.close),
    quality: bars[0]?.quality ?? 'demo',
    source: bars[0]?.source ?? 'Dane demonstracyjne',
  }
}

async function getRealOHLC(symbol: string, type: 'crypto' | 'stock'): Promise<CloseSeries> {
  if (DEMO_MODE) return toCloseSeries(getMockOHLC(symbol, 60))
  if (type === 'crypto') {
    try {
      const bars = await fetchCryptoOHLC(symbol, 30)
      if (bars.length >= 15) return toCloseSeries(bars)
    } catch {}
  } else {
    try {
      const bars = await fetchYahooOHLC(symbol, 90)
      if (bars.length >= 15) return toCloseSeries(bars)
    } catch {}
  }
  return toCloseSeries(getMockOHLC(symbol, 60))
}

export async function GET() {
  const livePrices = DEMO_MODE
    ? getMockPrices()
    : await getPrices(SCREENER_SYMBOLS).catch(() => getMockPrices())

  const mockPrices = getMockPrices()

  // Fetch OHLCV in parallel — both crypto and stocks use real data
  const ohlcvResults = await Promise.allSettled(
    SCREENER_SYMBOLS.map(({ symbol, type }) => getRealOHLC(symbol, type))
  )

  const screener = SCREENER_SYMBOLS.map(({ symbol, type }, i) => {
    const live = livePrices.find(p => p.symbol === symbol)
    const mock = mockPrices.find(p => p.symbol === symbol)
    const asset = live ?? mock
    if (!asset) return null

    const series = ohlcvResults[i].status === 'fulfilled'
      ? ohlcvResults[i].value
      : toCloseSeries(getMockOHLC(symbol, 60))
    const quality: DataQuality = asset.quality === 'demo' || series.quality === 'demo'
      ? 'demo'
      : asset.quality === 'delayed' || series.quality === 'delayed'
        ? 'delayed'
        : 'live'

    return {
      symbol: asset.symbol,
      name: asset.name,
      price: asset.price,
      change: asset.changePercent24h,
      volume: asset.volume24h,
      rsi: calculateRSI(series.closes),
      trend: getTrend(series.closes),
      volatility: calculateVolatility(series.closes),
      type,
      quality,
      source: `Cena: ${asset.source ?? 'nieznane'} · historia: ${series.source}`,
    }
  })

  return NextResponse.json(screener.filter(Boolean) as ScreenerItem[], {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  })
}
