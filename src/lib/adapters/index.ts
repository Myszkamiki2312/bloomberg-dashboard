import type { AssetPrice, OHLCBar } from '@/types'
import { fetchCryptoPrices, fetchCryptoOHLC, getCoinId } from './coingecko'
import { fetchStockQuote, fetchStockOHLC } from './finnhub'
import { fetchYahooQuote, fetchYahooOHLC } from './yahoo'
import { getMockPrices, getMockOHLC } from './mock'
import { fetchTradingViewPrices } from './tradingview'

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

export async function getPrices(symbols: { symbol: string; type: 'stock' | 'crypto' }[]): Promise<AssetPrice[]> {
  const mockPrices = getMockPrices()

  if (DEMO_MODE) return mockPrices.filter(p => symbols.some(s => s.symbol === p.symbol))

  const tradingViewPrices = await fetchTradingViewPrices(symbols).catch(() => [])
  const tradingViewSymbols = new Set(tradingViewPrices.map(price => price.symbol))
  const missing = symbols.filter(item => !tradingViewSymbols.has(item.symbol))

  if (missing.length === 0) return tradingViewPrices

  const cryptoSymbols = missing.filter(s => s.type === 'crypto').map(s => s.symbol)
  const stockSymbols = missing.filter(s => s.type === 'stock').map(s => s.symbol)

  const cryptoPromise = cryptoSymbols.length > 0
    ? fetchCryptoPrices(cryptoSymbols).catch(() => mockPrices.filter(p => cryptoSymbols.includes(p.symbol)))
    : Promise.resolve<AssetPrice[]>([])

  const stockPromise = Promise.allSettled(
    stockSymbols.map(async symbol => {
      const price = (await fetchStockQuote(symbol)) ?? (await fetchYahooQuote(symbol))
      return { symbol, price }
    })
  )

  const [cryptoPrices, stockResults] = await Promise.all([cryptoPromise, stockPromise])
  const fallbackResults: AssetPrice[] = [...cryptoPrices]

  for (let i = 0; i < stockResults.length; i++) {
    const res = stockResults[i]
    if (res.status === 'fulfilled' && res.value.price) {
      fallbackResults.push(res.value.price)
    } else {
      const mock = mockPrices.find(p => p.symbol === stockSymbols[i])
      if (mock) fallbackResults.push(mock)
    }
  }

  return symbols.flatMap(item => {
    const price = tradingViewPrices.find(candidate => candidate.symbol === item.symbol)
      ?? fallbackResults.find(candidate => candidate.symbol === item.symbol)
    return price ? [price] : []
  })
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
