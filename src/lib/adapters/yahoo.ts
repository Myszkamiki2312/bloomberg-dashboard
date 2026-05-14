import type { AssetPrice, OHLCBar } from '@/types'

const BASE = 'https://query1.finance.yahoo.com'

// Yahoo Finance suffixes per exchange — tried automatically when base symbol returns no data
const EXCHANGE_SUFFIXES = ['.WA', '.DE', '.L', '.PA', '.MI', '.MC', '.AS', '.BR', '.LS', '.SW']

async function fetchYahooChartRaw(ticker: string, params: string): Promise<any> {
  const res = await fetch(`${BASE}/v8/finance/chart/${ticker}?${params}`, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    next: { revalidate: 60 },
  })
  if (!res.ok) return null
  const json = await res.json()
  return json?.chart?.result?.[0] ?? null
}

// Resolve correct Yahoo ticker — tries base symbol, then common exchange suffixes
async function resolveYahooTicker(symbol: string, params: string): Promise<{ result: any; ticker: string } | null> {
  // Try as-is first (works for US stocks and symbols already with suffix e.g. "PKN.WA")
  const base = await fetchYahooChartRaw(symbol, params)
  if (base && (base.meta?.regularMarketPrice ?? 0) > 0) {
    return { result: base, ticker: symbol }
  }

  // Try exchange suffixes — stop at first hit
  for (const suffix of EXCHANGE_SUFFIXES) {
    if (symbol.includes('.')) break // already has suffix, don't double-append
    const result = await fetchYahooChartRaw(symbol + suffix, params)
    if (result && (result.meta?.regularMarketPrice ?? 0) > 0) {
      return { result, ticker: symbol + suffix }
    }
  }

  return null
}

export async function fetchYahooQuote(symbol: string): Promise<AssetPrice | null> {
  try {
    const resolved = await resolveYahooTicker(symbol, 'interval=1d&range=2d')
    if (!resolved) return null

    const { result: meta_result, ticker } = resolved
    const meta = meta_result.meta
    const quote = meta_result.indicators?.quote?.[0]
    const closes = quote?.close ?? []

    const current = meta.regularMarketPrice ?? closes[closes.length - 1] ?? 0
    const prev = meta.previousClose ?? closes[closes.length - 2] ?? current
    const change = current - prev
    const changePct = prev > 0 ? (change / prev) * 100 : 0

    return {
      symbol,
      name: meta.longName ?? meta.shortName ?? symbol,
      price: current,
      change24h: change,
      changePercent24h: changePct,
      volume24h: meta.regularMarketVolume ?? 0,
      marketCap: 0,
      type: 'stock',
      lastUpdated: new Date().toISOString(),
    }
  } catch {
    return null
  }
}

export async function fetchYahooOHLC(symbol: string, days = 90): Promise<OHLCBar[]> {
  try {
    const range = days <= 30 ? '1mo' : days <= 90 ? '3mo' : '6mo'
    const resolved = await resolveYahooTicker(symbol, `interval=1d&range=${range}`)
    if (!resolved) return []

    const { result } = resolved
    const timestamps: number[] = result.timestamp ?? []
    const quote = result.indicators?.quote?.[0] ?? {}

    return timestamps
      .map((ts, i) => ({
        time: new Date(ts * 1000).toISOString().split('T')[0],
        open:   quote.open?.[i]   ?? 0,
        high:   quote.high?.[i]   ?? 0,
        low:    quote.low?.[i]    ?? 0,
        close:  quote.close?.[i]  ?? 0,
        volume: quote.volume?.[i] ?? 0,
      }))
      .filter(b => b.open > 0 && b.high > 0 && b.low > 0 && b.close > 0)
  } catch {
    return []
  }
}
