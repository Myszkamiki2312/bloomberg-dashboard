import { NextRequest, NextResponse } from 'next/server'
import { getOHLC } from '@/lib/adapters'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const symbol = searchParams.get('symbol') ?? 'BTC'
  const type = (searchParams.get('type') === 'stock' ? 'stock' : 'crypto') as 'stock' | 'crypto'
  const days = parseInt(searchParams.get('days') ?? '90', 10)

  try {
    const data = await getOHLC(symbol, type, days)
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    })
  } catch (err) {
    console.error('Chart API error:', err)
    return NextResponse.json([], { status: 200 })
  }
}
