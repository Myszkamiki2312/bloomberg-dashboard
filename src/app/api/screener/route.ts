import { NextResponse } from 'next/server'
import { getMockOHLC, getMockPrices } from '@/lib/adapters/mock'
import { calculateRSI, getTrend, calculateVolatility } from '@/lib/utils/rsi'
import type { ScreenerItem } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const prices = getMockPrices()

  const screener: ScreenerItem[] = prices.map(asset => {
    const bars = getMockOHLC(asset.symbol, 60)
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
      type: asset.type,
    }
  })

  return NextResponse.json(screener, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
  })
}
