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
        signal: AbortSignal.timeout(6000),
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
  '^GSPC':    { value: 7433.3,  change:  36.8,  pct:  0.50 },
  '^IXIC':    { value: 26331.1, change: 152.6,  pct:  0.58 },
  '^DJI':     { value: 49614.6, change: 109.2,  pct:  0.22 },
  '^VIX':     { value: 18.40,   change:  -0.64, pct: -3.36 },
  'USDPLN=X': { value: 3.6527,  change:  -0.009,pct: -0.25 },
  'EURUSD=X': { value: 1.1632,  change:   0.004,pct:  0.34 },
  'GC=F':     { value: 4540.4,  change:  19.8,  pct:  0.44 },
  'CL=F':     { value: 100.78,  change:  -1.14, pct: -1.12 },
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
    const fb = FALLBACK[idx.ticker] ?? { value: 0, change: 0, pct: 0 }
    return { symbol: idx.label, name: idx.name, value: fb.value, change: fb.change, pct: fb.pct }
  })

  return NextResponse.json(output, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
  })
}
