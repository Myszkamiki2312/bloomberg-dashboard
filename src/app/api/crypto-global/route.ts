import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface CryptoGlobal {
  btcDominance: number
  totalMarketCapUsd: number
  totalVolume24hUsd: number
}

export async function GET() {
  try {
    const key = process.env.COINGECKO_API_KEY
    const res = await fetch('https://api.coingecko.com/api/v3/global', {
      headers: key ? { 'x-cg-demo-api-key': key } : {},
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) throw new Error(`CoinGecko global ${res.status}`)
    const json = await res.json()
    const d = json?.data
    if (!d) throw new Error('no data')

    return NextResponse.json({
      btcDominance: d.market_cap_percentage?.btc ?? 0,
      totalMarketCapUsd: d.total_market_cap?.usd ?? 0,
      totalVolume24hUsd: d.total_volume?.usd ?? 0,
    } satisfies CryptoGlobal, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    })
  } catch {
    return NextResponse.json({ btcDominance: 0, totalMarketCapUsd: 0, totalVolume24hUsd: 0 })
  }
}
