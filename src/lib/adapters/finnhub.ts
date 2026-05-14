import type { AssetPrice, OHLCBar } from '@/types'

const BASE = 'https://finnhub.io/api/v1'

function getKey(): string | undefined {
  return process.env.FINNHUB_KEY
}

export async function fetchStockQuote(symbol: string): Promise<AssetPrice | null> {
  const key = getKey()
  if (!key) return null

  const [quoteRes, profileRes] = await Promise.all([
    fetch(`${BASE}/quote?symbol=${symbol}&token=${key}`, { next: { revalidate: 60 } }),
    fetch(`${BASE}/stock/profile2?symbol=${symbol}&token=${key}`, { next: { revalidate: 3600 } }),
  ])

  if (!quoteRes.ok) return null
  const quote = await quoteRes.json()
  const profile = profileRes.ok ? await profileRes.json() : {}

  if (!quote.c) return null

  return {
    symbol,
    name: profile.name ?? symbol,
    price: quote.c,
    change24h: quote.d ?? 0,
    changePercent24h: quote.dp ?? 0,
    volume24h: 0,
    marketCap: profile.marketCapitalization ? profile.marketCapitalization * 1e6 : 0,
    type: 'stock',
    lastUpdated: new Date().toISOString(),
  }
}

export async function fetchStockOHLC(symbol: string, days = 90): Promise<OHLCBar[]> {
  const key = getKey()
  if (!key) return []

  const to = Math.floor(Date.now() / 1000)
  const from = to - days * 86400

  const res = await fetch(
    `${BASE}/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${to}&token=${key}`,
    { next: { revalidate: 3600 } }
  )
  if (!res.ok) return []

  const data = await res.json()
  if (data.s !== 'ok' || !data.t) return []

  return (data.t as number[]).reduce<OHLCBar[]>((acc, ts, i) => {
    const open  = data.o?.[i] as number | undefined
    const high  = data.h?.[i] as number | undefined
    const low   = data.l?.[i] as number | undefined
    const close = data.c?.[i] as number | undefined
    if (open != null && high != null && low != null && close != null) {
      acc.push({
        time: new Date(ts * 1000).toISOString().split('T')[0],
        open, high, low, close,
        volume: data.v?.[i] as number | undefined,
      })
    }
    return acc
  }, [])
}
