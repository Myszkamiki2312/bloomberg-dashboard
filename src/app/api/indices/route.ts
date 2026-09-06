import { NextResponse } from 'next/server'
import type { MarketIndex } from '@/types'
import { fetchTradingViewIndices } from '@/lib/adapters/tradingview'
import { INDICES, fetchQuote, resolveIndexValue } from '@/lib/adapters/indicesResolver'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const [tradingViewIndices, results] = await Promise.all([
    fetchTradingViewIndices().catch(() => []),
    Promise.allSettled(INDICES.map(idx => fetchQuote(idx.ticker))),
  ])
  const tradingViewMap = new Map(tradingViewIndices.map(index => [index.symbol, index]))
  const lastUpdated = new Date().toISOString()

  const output: MarketIndex[] = INDICES.map((idx, i) =>
    resolveIndexValue(idx, tradingViewMap.get(idx.label), results[i], lastUpdated)
  )

  const demoCount = output.filter(o => o.quality === 'demo').length
  if (demoCount > 0) {
    console.warn(
      `[api/indices] ${demoCount}/${output.length} indices fell back to demo data -- ` +
        `TradingView and/or Yahoo may be degraded. Symbols: ` +
        output.filter(o => o.quality === 'demo').map(o => o.symbol).join(', ')
    )
  }

  return NextResponse.json(output, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
  })
}
