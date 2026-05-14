import type { AssetPrice, OHLCBar } from '@/types'

const BASE = 'https://query1.finance.yahoo.com'

export async function fetchYahooQuote(symbol: string): Promise<AssetPrice | null> {
  try {
    const res = await fetch(
      `${BASE}/v8/finance/chart/${symbol}?interval=1d&range=2d`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        next: { revalidate: 60 },
      }
    )
    if (!res.ok) return null

    const json = await res.json()
    const result = json?.chart?.result?.[0]
    if (!result) return null

    const meta = result.meta
    const quote = result.indicators?.quote?.[0]
    const timestamps = result.timestamp ?? []
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
    const res = await fetch(
      `${BASE}/v8/finance/chart/${symbol}?interval=1d&range=${range}`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        next: { revalidate: 3600 },
      }
    )
    if (!res.ok) return []

    const json = await res.json()
    const result = json?.chart?.result?.[0]
    if (!result) return []

    const timestamps: number[] = result.timestamp ?? []
    const quote = result.indicators?.quote?.[0] ?? {}

    return timestamps
      .map((ts, i) => ({
        time: new Date(ts * 1000).toISOString().split('T')[0],
        open: quote.open?.[i] ?? 0,
        high: quote.high?.[i] ?? 0,
        low: quote.low?.[i] ?? 0,
        close: quote.close?.[i] ?? 0,
        volume: quote.volume?.[i] ?? 0,
      }))
      .filter(b => b.open > 0 && b.high > 0 && b.low > 0 && b.close > 0)
  } catch {
    return []
  }
}
