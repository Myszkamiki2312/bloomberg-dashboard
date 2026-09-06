import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { AssetPrice, OHLCBar } from '@/types'

vi.mock('./coingecko', () => ({
  fetchCryptoPrices: vi.fn(),
  fetchCryptoOHLC: vi.fn(),
  getCoinId: vi.fn(),
}))
vi.mock('./finnhub', () => ({
  fetchStockQuote: vi.fn(),
  fetchStockOHLC: vi.fn(),
}))
vi.mock('./yahoo', () => ({
  fetchYahooQuote: vi.fn(),
  fetchYahooOHLC: vi.fn(),
}))
vi.mock('./mock', () => ({
  getMockPrices: vi.fn(),
  getMockOHLC: vi.fn(),
}))
vi.mock('./tradingview', () => ({
  fetchTradingViewPrices: vi.fn(),
}))

import { fetchCryptoPrices, fetchCryptoOHLC, getCoinId } from './coingecko'
import { fetchStockQuote, fetchStockOHLC } from './finnhub'
import { fetchYahooQuote, fetchYahooOHLC } from './yahoo'
import { getMockPrices, getMockOHLC } from './mock'
import { fetchTradingViewPrices } from './tradingview'
import { getPrices, getOHLC } from './index'

const price = (symbol: string, overrides: Partial<AssetPrice> = {}): AssetPrice => ({
  symbol, name: symbol, price: 1, change24h: 0, changePercent24h: 0, volume24h: 0,
  marketCap: 0, type: 'stock', currency: 'USD', lastUpdated: '', ...overrides,
})

const bar = (time: string): OHLCBar => ({ time, open: 1, high: 1, low: 1, close: 1 })

const MOCK_PRICES: AssetPrice[] = [price('AAPL'), price('BTC', { type: 'crypto' })]

describe('getPrices', () => {
  beforeEach(() => {
    vi.mocked(getMockPrices).mockReturnValue(MOCK_PRICES)
    vi.mocked(fetchTradingViewPrices).mockResolvedValue([])
    vi.mocked(fetchCryptoPrices).mockResolvedValue([])
    vi.mocked(fetchStockQuote).mockResolvedValue(null)
    vi.mocked(fetchYahooQuote).mockResolvedValue(null)
  })
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns tradingview prices directly when they cover every requested symbol', async () => {
    vi.mocked(fetchTradingViewPrices).mockResolvedValue([price('AAPL', { price: 200 })])
    const result = await getPrices([{ symbol: 'AAPL', type: 'stock' }])
    expect(result).toEqual([price('AAPL', { price: 200 })])
    expect(fetchStockQuote).not.toHaveBeenCalled()
  })

  it('treats a tradingview rejection as no coverage and falls through', async () => {
    vi.mocked(fetchTradingViewPrices).mockRejectedValue(new Error('down'))
    vi.mocked(fetchStockQuote).mockResolvedValue(price('AAPL', { price: 150 }))
    const result = await getPrices([{ symbol: 'AAPL', type: 'stock' }])
    expect(result).toEqual([price('AAPL', { price: 150 })])
  })

  it('fills a missing crypto symbol from CoinGecko', async () => {
    vi.mocked(fetchCryptoPrices).mockResolvedValue([price('BTC', { type: 'crypto', price: 50000 })])
    const result = await getPrices([{ symbol: 'BTC', type: 'crypto' }])
    expect(result).toEqual([price('BTC', { type: 'crypto', price: 50000 })])
  })

  it('falls back to demo data when CoinGecko rejects', async () => {
    vi.mocked(fetchCryptoPrices).mockRejectedValue(new Error('rate limited'))
    const result = await getPrices([{ symbol: 'BTC', type: 'crypto' }])
    expect(result).toEqual([price('BTC', { type: 'crypto' })]) // the mock entry
  })

  it('fills a missing stock symbol from Finnhub first', async () => {
    vi.mocked(fetchStockQuote).mockResolvedValue(price('AAPL', { price: 199, source: 'Finnhub' }))
    const result = await getPrices([{ symbol: 'AAPL', type: 'stock' }])
    expect(result[0].source).toBe('Finnhub')
    expect(fetchYahooQuote).not.toHaveBeenCalled()
  })

  it('falls back to Yahoo when Finnhub has no quote', async () => {
    vi.mocked(fetchStockQuote).mockResolvedValue(null)
    vi.mocked(fetchYahooQuote).mockResolvedValue(price('AAPL', { price: 198, source: 'Yahoo Finance' }))
    const result = await getPrices([{ symbol: 'AAPL', type: 'stock' }])
    expect(result[0].source).toBe('Yahoo Finance')
  })

  it('falls back to demo data when both Finnhub and Yahoo have nothing', async () => {
    const result = await getPrices([{ symbol: 'AAPL', type: 'stock' }])
    expect(result).toEqual([price('AAPL')]) // the mock entry
  })

  it('drops a symbol with no data from any source', async () => {
    vi.mocked(getMockPrices).mockReturnValue([]) // no mock fallback either
    const result = await getPrices([{ symbol: 'UNKNOWN', type: 'stock' }])
    expect(result).toEqual([])
  })

  it('preserves the caller-requested symbol order across mixed sources', async () => {
    vi.mocked(fetchTradingViewPrices).mockResolvedValue([price('BTC', { type: 'crypto' })])
    vi.mocked(fetchStockQuote).mockResolvedValue(price('AAPL'))
    const result = await getPrices([{ symbol: 'AAPL', type: 'stock' }, { symbol: 'BTC', type: 'crypto' }])
    expect(result.map(r => r.symbol)).toEqual(['AAPL', 'BTC'])
  })
})

describe('getOHLC', () => {
  beforeEach(() => {
    vi.mocked(getMockOHLC).mockReturnValue([bar('mock')])
    vi.mocked(getCoinId).mockReturnValue('bitcoin')
    vi.mocked(fetchCryptoOHLC).mockResolvedValue([])
    vi.mocked(fetchStockOHLC).mockResolvedValue([])
    vi.mocked(fetchYahooOHLC).mockResolvedValue([])
  })
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('goes straight to mock data for an unknown crypto symbol', async () => {
    vi.mocked(getCoinId).mockReturnValue(undefined)
    const bars = await getOHLC('NOTACOIN', 'crypto')
    expect(bars).toEqual([bar('mock')])
    expect(fetchCryptoOHLC).not.toHaveBeenCalled()
  })

  it('returns live CoinGecko OHLC for a known coin', async () => {
    vi.mocked(fetchCryptoOHLC).mockResolvedValue([bar('2026-01-01')])
    const bars = await getOHLC('BTC', 'crypto', 500)
    expect(bars).toEqual([bar('2026-01-01')])
    expect(fetchCryptoOHLC).toHaveBeenCalledWith('BTC', 365) // clamped to 365
  })

  it('falls back to mock when CoinGecko OHLC throws', async () => {
    vi.mocked(fetchCryptoOHLC).mockRejectedValue(new Error('boom'))
    const bars = await getOHLC('BTC', 'crypto')
    expect(bars).toEqual([bar('mock')])
  })

  it('falls back to mock when CoinGecko OHLC returns an empty array', async () => {
    vi.mocked(fetchCryptoOHLC).mockResolvedValue([])
    const bars = await getOHLC('BTC', 'crypto')
    expect(bars).toEqual([bar('mock')])
  })

  it('returns Finnhub OHLC for a stock when available', async () => {
    vi.mocked(fetchStockOHLC).mockResolvedValue([bar('2026-02-01')])
    const bars = await getOHLC('AAPL', 'stock')
    expect(bars).toEqual([bar('2026-02-01')])
    expect(fetchYahooOHLC).not.toHaveBeenCalled()
  })

  it('falls back to Yahoo OHLC when Finnhub returns nothing', async () => {
    vi.mocked(fetchYahooOHLC).mockResolvedValue([bar('2026-03-01')])
    const bars = await getOHLC('AAPL', 'stock')
    expect(bars).toEqual([bar('2026-03-01')])
  })

  it('falls back to mock when both stock sources return nothing', async () => {
    const bars = await getOHLC('AAPL', 'stock')
    expect(bars).toEqual([bar('mock')])
  })

  it('falls back to mock when a stock source throws', async () => {
    vi.mocked(fetchStockOHLC).mockRejectedValue(new Error('boom'))
    const bars = await getOHLC('AAPL', 'stock')
    expect(bars).toEqual([bar('mock')])
  })
})

describe('getPrices / getOHLC in demo mode', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('getPrices returns only the requested symbols from mock data, ignoring live adapters', async () => {
    vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', 'true')
    vi.resetModules()
    vi.mocked(getMockPrices).mockReturnValue(MOCK_PRICES)
    const { getPrices: freshGetPrices } = await import('./index')
    const result = await freshGetPrices([{ symbol: 'AAPL', type: 'stock' }])
    expect(result).toEqual([price('AAPL')])
    expect(fetchTradingViewPrices).not.toHaveBeenCalled()
  })

  it('getOHLC returns mock data directly, ignoring live adapters', async () => {
    vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', 'true')
    vi.resetModules()
    vi.mocked(getMockOHLC).mockReturnValue([bar('mock')])
    const { getOHLC: freshGetOHLC } = await import('./index')
    const bars = await freshGetOHLC('AAPL', 'stock')
    expect(bars).toEqual([bar('mock')])
    expect(fetchStockOHLC).not.toHaveBeenCalled()
  })
})
