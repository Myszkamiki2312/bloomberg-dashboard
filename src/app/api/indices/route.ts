import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface IndexQuote {
  symbol: string
  name: string
  value: number
  change: number
  pct: number
}

const INDICES = [
  { ticker: '^GSPC',    label: 'SPX',    name: 'S&P 500'  },
  { ticker: '^IXIC',    label: 'NDX',    name: 'NASDAQ'   },
  { ticker: '^DJI',     label: 'DJI',    name: 'DJIA'     },
  { ticker: '^VIX',     label: 'VIX',    name: 'VIX'      },
  { ticker: 'USDPLN=X', label: 'USDPLN', name: 'USD/PLN'  },
  { ticker: 'EURUSD=X', label: 'EURUSD', name: 'EUR/USD'  },
  { ticker: 'GC=F',     label: 'GOLD',   name: 'GOLD'     },
  { ticker: 'CL=F',     label: 'OIL',    name: 'WTI/bbl'  },
]

async function fetchQuote(ticker: string): Promise<{ price: number; prev: number; name: string } | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=2d`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        next: { revalidate: 60 },
      }
    )
    if (!res.ok) return null
    const json = await res.json()
    const meta = json?.chart?.result?.[0]?.meta
    if (!meta?.regularMarketPrice) return null
    return {
      price: meta.regularMarketPrice,
      prev:  meta.chartPreviousClose ?? meta.regularMarketPrice,
      name:  meta.shortName ?? meta.longName ?? ticker,
    }
  } catch {
    return null
  }
}

const FALLBACK: Record<string, { value: number; change: number; pct: number }> = {
  '^GSPC':    { value: 5261.72, change: 21.34,  pct:  0.41 },
  '^IXIC':    { value: 18234.3, change: 122.40, pct:  0.68 },
  '^DJI':     { value: 39721.4, change: 88.21,  pct:  0.22 },
  '^VIX':     { value: 14.23,   change: -0.38,  pct: -2.60 },
  'USDPLN=X': { value: 3.9542,  change: -0.007, pct: -0.18 },
  'EURUSD=X': { value: 1.0847,  change:  0.001, pct:  0.09 },
  'GC=F':     { value: 2342.8,  change:  7.40,  pct:  0.32 },
  'CL=F':     { value: 79.24,   change: -0.58,  pct: -0.73 },
}

export async function GET() {
  const results = await Promise.allSettled(INDICES.map(idx => fetchQuote(idx.ticker)))

  const output: IndexQuote[] = INDICES.map((idx, i) => {
    const r = results[i]
    if (r.status === 'fulfilled' && r.value) {
      const { price, prev, name } = r.value
      const change = price - prev
      const pct = prev > 0 ? (change / prev) * 100 : 0
      return { symbol: idx.label, name: idx.name || name, value: price, change, pct }
    }
    const fb = FALLBACK[idx.ticker]
    return { symbol: idx.label, name: idx.name, value: fb.value, change: fb.change, pct: fb.pct }
  })

  return NextResponse.json(output, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
  })
}
