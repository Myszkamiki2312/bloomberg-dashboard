import { NextRequest, NextResponse } from 'next/server'
import { getOHLC } from '@/lib/adapters'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const symbol = (searchParams.get('symbol') ?? 'BTC').replace(/[^A-Z0-9.\-]/gi, '').toUpperCase().slice(0, 12) || 'BTC'
  const type = (searchParams.get('type') === 'stock' ? 'stock' : 'crypto') as 'stock' | 'crypto'
  const daysRaw = parseInt(searchParams.get('days') ?? '90', 10)
  const days = isNaN(daysRaw) ? 90 : Math.max(7, Math.min(365, daysRaw))

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
