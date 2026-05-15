import type { AssetPrice, OHLCBar } from '@/types'
import { fetchCryptoPrices, fetchCryptoOHLC, getCoinId } from './coingecko'
import { fetchStockQuote, fetchStockOHLC } from './finnhub'
import { fetchYahooQuote, fetchYahooOHLC } from './yahoo'
import { getMockPrices, getMockOHLC } from './mock'

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

export async function getPrices(symbols: { symbol: string; type: 'stock' | 'crypto' }[]): Promise<AssetPrice[]> {
  const mockPrices = getMockPrices()

  if (DEMO_MODE) return mockPrices.filter(p => symbols.some(s => s.symbol === p.symbol))

  const cryptoSymbols = symbols.filter(s => s.type === 'crypto').map(s => s.symbol)
  const stockSymbols = symbols.filter(s => s.type === 'stock').map(s => s.symbol)

  const results: AssetPrice[] = []

  if (cryptoSymbols.length > 0) {
    try {
      const prices = await fetchCryptoPrices(cryptoSymbols)
      results.push(...prices)
    } catch {
      results.push(...mockPrices.filter(p => cryptoSymbols.includes(p.symbol)))
    }
  }

  // Fetch all stock quotes in parallel — sequential loop was causing
  // N × 6 s worst-case latency (one timeout per symbol)
  const stockResults = await Promise.allSettled(
    stockSymbols.map(async symbol => {
      const price = (await fetchStockQuote(symbol)) ?? (await fetchYahooQuote(symbol))
      return { symbol, price }
    })
  )

  for (let i = 0; i < stockResults.length; i++) {
    const res = stockResults[i]
    if (res.status === 'fulfilled' && res.value.price) {
      results.push(res.value.price)
    } else {
      const mock = mockPrices.find(p => p.symbol === stockSymbols[i])
      if (mock) results.push(mock)
    }
  }

  return results
}

export async function getOHLC(symbol: string, type: 'stock' | 'crypto', days = 90): Promise<OHLCBar[]> {
  if (DEMO_MODE) return getMockOHLC(symbol, days)

  try {
    if (type === 'crypto') {
      // Unknown crypto (not in COIN_IDS) → skip stock APIs, go straight to mock
      if (!getCoinId(symbol)) return getMockOHLC(symbol, days)
      const data = await fetchCryptoOHLC(symbol, Math.min(days, 365))
      if (data.length > 0) return data
    } else {
      const data = await fetchStockOHLC(symbol, days)
      if (data.length > 0) return data

      const yahooData = await fetchYahooOHLC(symbol, days)
      if (yahooData.length > 0) return yahooData
    }
  } catch {
    // fall through
  }

  return getMockOHLC(symbol, days)
}
