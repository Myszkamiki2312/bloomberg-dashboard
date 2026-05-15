import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const LABELS_PL: Record<string, string> = {
  'Extreme Fear': 'SKRAJNY STRACH',
  'Fear':         'STRACH',
  'Neutral':      'NEUTRALNY',
  'Greed':        'CHCIWOŚĆ',
  'Extreme Greed':'SKRAJNA CHCIWOŚĆ',
}

export async function GET() {
  try {
    const res = await fetch('https://api.alternative.me/fng/', {
      next: { revalidate: 3600 },
    })
    if (!res.ok) throw new Error(`fng ${res.status}`)
    const json = await res.json()
    const entry = json?.data?.[0]
    if (!entry) throw new Error('no data')

    const value = parseInt(entry.value, 10)
    if (isNaN(value)) throw new Error('invalid FNG value')
    const label = LABELS_PL[entry.value_classification] ?? entry.value_classification

    return NextResponse.json({ value, label }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
    })
  } catch {
    return NextResponse.json({ value: 0, label: '—' })
  }
}
