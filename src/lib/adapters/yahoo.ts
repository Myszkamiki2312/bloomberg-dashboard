import type { AssetPrice, OHLCBar } from '@/types'

const BASE = 'https://query1.finance.yahoo.com'

// Yahoo Finance suffixes per exchange — tried automatically when base symbol returns no data
const EXCHANGE_SUFFIXES = ['.WA', '.DE', '.L', '.PA', '.MI', '.MC', '.AS', '.BR', '.LS', '.SW']

async function fetchYahooChartRaw(ticker: string, params: string): Promise<any> {
  const res = await fetch(`${BASE}/v8/finance/chart/${encodeURIComponent(ticker)}?${params}`, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    next: { revalidate: 60 },
    signal: AbortSignal.timeout(6000),
  })
  if (!res.ok) return null
  const json = await res.json()
  return json?.chart?.result?.[0] ?? null
}

// Resolve correct Yahoo ticker — tries base symbol first, then all exchange suffixes in parallel
async function resolveYahooTicker(symbol: string, params: string): Promise<{ result: any; ticker: string } | null> {
  // Try as-is first (works for US stocks and symbols already with suffix e.g. "PKN.WA")
  const base = await fetchYahooChartRaw(symbol, params)
  if (base && (base.meta?.regularMarketPrice ?? 0) > 0) {
    return { result: base, ticker: symbol }
  }

  // Don't try suffixes if symbol already contains a dot (already has an exchange suffix)
  if (symbol.includes('.')) return null

  // Try all exchange suffixes in parallel — first valid response wins
  try {
    return await Promise.any(
      EXCHANGE_SUFFIXES.map(async suffix => {
        const result = await fetchYahooChartRaw(symbol + suffix, params)
        if (result && (result.meta?.regularMarketPrice ?? 0) > 0) {
          return { result, ticker: symbol + suffix }
        }
        throw new Error('no data')
      })
    )
  } catch {
    return null
  }
}

export async function fetchYahooQuote(symbol: string): Promise<AssetPrice | null> {
  try {
    const resolved = await resolveYahooTicker(symbol, 'interval=1d&range=2d')
    if (!resolved) return null

    const { result: meta_result } = resolved
    const meta = meta_result.meta
    const quote = meta_result.indicators?.quote?.[0]
    const closes = quote?.close ?? []

    const current = meta.regularMarketPrice ?? closes[closes.length - 1] ?? 0
    const prev = meta.chartPreviousClose ?? meta.previousClose ?? closes[closes.length - 2] ?? current
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
      source: 'Yahoo Finance',
      quality: 'delayed',
    }
  } catch {
    return null
  }
}

export async function fetchYahooOHLC(symbol: string, days = 90): Promise<OHLCBar[]> {
  try {
    const range = days <= 30 ? '1mo' : days <= 90 ? '3mo' : days <= 180 ? '6mo' : '1y'
    const resolved = await resolveYahooTicker(symbol, `interval=1d&range=${range}`)
    if (!resolved) return []

    const { result } = resolved
    const timestamps: number[] = result.timestamp ?? []
    const quote = result.indicators?.quote?.[0] ?? {}

    return timestamps
      .map((ts, i) => {
        // Guard against NaN/invalid timestamps from Yahoo Finance
        const ms = typeof ts === 'number' && isFinite(ts) ? ts * 1000 : NaN
        if (!isFinite(ms)) return null
        return {
          time: new Date(ms).toISOString().split('T')[0],
          open:   quote.open?.[i]   ?? 0,
          high:   quote.high?.[i]   ?? 0,
          low:    quote.low?.[i]    ?? 0,
          close:  quote.close?.[i]  ?? 0,
          volume: quote.volume?.[i] ?? 0,
          source: 'Yahoo Finance',
          quality: 'delayed' as const,
          lastUpdated: new Date().toISOString(),
        }
      })
      .filter((b): b is NonNullable<typeof b> => b !== null && b.open > 0 && b.high > 0 && b.low > 0 && b.close > 0)
  } catch {
    return []
  }
}
