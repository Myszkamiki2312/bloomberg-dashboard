import type { MarketIndex } from '@/types'

export const INDICES = [
  { ticker: '^GSPC',    label: 'SPX',    name: 'S&P 500'  },
  { ticker: '^IXIC',    label: 'NDX',    name: 'NASDAQ'   },
  { ticker: '^DJI',     label: 'DJI',    name: 'DJIA'     },
  { ticker: '^VIX',     label: 'VIX',    name: 'VIX'      },
  { ticker: 'USDPLN=X', label: 'USDPLN', name: 'USD/PLN'  },
  { ticker: 'EURPLN=X', label: 'EURPLN', name: 'EUR/PLN'  },
  { ticker: 'EURUSD=X', label: 'EURUSD', name: 'EUR/USD'  },
  { ticker: 'GC=F',     label: 'GOLD',   name: 'GOLD'     },
  { ticker: 'CL=F',     label: 'OIL',    name: 'WTI/bbl'  },
]

export async function fetchQuote(ticker: string): Promise<{ price: number; prev: number; name: string } | null> {
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
  '^GSPC':    { value: 5840.3,  change:  18.4,  pct:  0.32 },
  '^IXIC':    { value: 18950.6, change:  75.2,  pct:  0.40 },
  '^DJI':     { value: 43250.8, change:  89.5,  pct:  0.21 },
  '^VIX':     { value: 18.40,   change:  -0.64, pct: -3.36 },
  'USDPLN=X': { value: 3.7850,  change:  -0.011,pct: -0.29 },
  'EURPLN=X': { value: 4.3100,  change:   0.008,pct:  0.19 },
  'EURUSD=X': { value: 1.1320,  change:   0.003,pct:  0.27 },
  'GC=F':     { value: 3320.0,  change:  12.4,  pct:  0.37 },
  'CL=F':     { value: 73.50,   change:  -0.82, pct: -1.10 },
}

export type IndexDef = (typeof INDICES)[number]
export type QuoteResult = PromiseSettledResult<Awaited<ReturnType<typeof fetchQuote>>>

// Pure -- no network, no Date.now() -- so it's cheap to unit test the
// TradingView -> Yahoo -> demo priority without mocking fetch.
export function resolveIndexValue(
  idx: IndexDef,
  tradingView: MarketIndex | undefined,
  yahooResult: QuoteResult,
  lastUpdated: string
): MarketIndex {
  if (tradingView) return tradingView

  if (yahooResult.status === 'fulfilled' && yahooResult.value) {
    const { price, prev, name } = yahooResult.value
    const change = price - prev
    const pct = prev > 0 ? (change / prev) * 100 : 0
    return {
      symbol: idx.label,
      name: idx.name || name,
      value: price,
      change,
      pct,
      source: 'Yahoo Finance',
      quality: 'delayed',
      lastUpdated,
    }
  }

  const fb = FALLBACK[idx.ticker] ?? { value: 0, change: 0, pct: 0 }
  return {
    symbol: idx.label,
    name: idx.name,
    value: fb.value,
    change: fb.change,
    pct: fb.pct,
    source: 'Dane demonstracyjne',
    quality: 'demo',
    lastUpdated,
  }
}
