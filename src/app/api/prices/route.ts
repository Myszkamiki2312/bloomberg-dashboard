import { NextRequest, NextResponse } from 'next/server'
import { getPrices } from '@/lib/adapters'
import { getMockPrices } from '@/lib/adapters/mock'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const symbolsParam = searchParams.get('symbols')

  if (!symbolsParam) {
    return NextResponse.json(getMockPrices())
  }

  const symbols = symbolsParam.split(',').map(s => {
    const [symbol, type] = s.split(':')
    return { symbol, type: (type ?? 'crypto') as 'stock' | 'crypto' }
  })

  try {
    const prices = await getPrices(symbols)
    return NextResponse.json(prices, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
    })
  } catch (err) {
    console.error('Prices API error:', err)
    return NextResponse.json(
      getMockPrices().filter(p => symbols.some(s => s.symbol === p.symbol)),
      { status: 200 }
    )
  }
}
