import { NextResponse } from 'next/server'
import { getMockCalendar } from '@/lib/adapters/mock'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(getMockCalendar(), {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
  })
}
