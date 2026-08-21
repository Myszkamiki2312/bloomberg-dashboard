import { NextResponse } from 'next/server'
import { getMockCalendar } from '@/lib/adapters/mock'
import { fetchEconomicCalendar } from '@/lib/adapters/economicCalendar'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const headers = { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600' }

  try {
    const events = await fetchEconomicCalendar()
    if (events.length > 0) return NextResponse.json(events, { headers })
  } catch (error) {
    console.error('Economic calendar error:', error)
  }

  return NextResponse.json(getMockCalendar(), { headers })
}
