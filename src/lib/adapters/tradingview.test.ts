import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchTradingViewPrices, fetchTradingViewIndices } from './tradingview'

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as Response
}

function scanRow(ticker: string, overrides: unknown[] = []) {
  return { s: ticker, d: ['name', 'Test Name', 100, 5, 1000, 2_000_000, 'USD', 'streaming', ...overrides].slice(0, 8) }
}

describe('fetchTradingViewPrices', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('resolves a plain stock symbol against NASDAQ/NYSE/AMEX/GPW candidates', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse({ data: [{ s: 'NYSE:AAAA1', d: ['AAAA1', 'Apple Test', 150, 2.5, 500, 1e9, 'USD', 'streaming'] }] })
    )
    const result = await fetchTradingViewPrices([{ symbol: 'AAAA1', type: 'stock' }])
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ symbol: 'AAAA1', name: 'Apple Test', price: 150, changePercent24h: 2.5, currency: 'USD' })
  })

  it('resolves a dotted exchange-suffixed symbol using the mapped exchange', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockImplementation(async (_url, opts) => {
      const body = JSON.parse((opts as RequestInit).body as string)
      expect(body.symbols.tickers).toContain('GPW:PKNBBB2')
      return jsonResponse({ data: [{ s: 'GPW:PKNBBB2', d: ['PKN', 'PKN Test', 80, -1, 300, 5e9, 'PLN', 'delayed'] }] })
    })
    const result = await fetchTradingViewPrices([{ symbol: 'PKNBBB2.WA', type: 'stock' }])
    expect(result[0].currency).toBe('PLN')
  })

  it('builds crypto candidates from Coinbase/Binance/Kraken', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockImplementation(async (_url, opts) => {
      const body = JSON.parse((opts as RequestInit).body as string)
      expect(body.symbols.tickers).toEqual(
        expect.arrayContaining(['COINBASE:BTCCC3USD', 'BINANCE:BTCCC3USDT', 'KRAKEN:BTCCC3USD'])
      )
      return jsonResponse({ data: [{ s: 'BINANCE:BTCCC3USDT', d: ['BTCCC3', 'Bitcoin Test', 50000, 3, 999, 1e12, 'USDT', 'streaming'] }] })
    })
    const result = await fetchTradingViewPrices([{ symbol: 'BTCCC3', type: 'crypto' }])
    expect(result[0].currency).toBe('USD') // USDT normalized to USD
  })

  it('omits a symbol when none of its candidate tickers are found', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse({ data: [] }))
    const result = await fetchTradingViewPrices([{ symbol: 'NOPE4', type: 'stock' }])
    expect(result).toEqual([])
  })

  it('computes absolute change from the percent change and current price', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse({ data: [{ s: 'NASDAQ:CCCC5', d: ['CCCC5', 'C Corp', 110, 10, 1, 1, 'USD', 'streaming'] }] })
    )
    const result = await fetchTradingViewPrices([{ symbol: 'CCCC5', type: 'stock' }])
    // previous = 110 / 1.10 = 100; change = 10
    expect(result[0].change24h).toBeCloseTo(10, 5)
  })

  it('drops a row whose price is zero or negative', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse({ data: [{ s: 'NASDAQ:DDDD6', d: ['DDDD6', 'D Corp', 0, 1, 1, 1, 'USD', 'streaming'] }] })
    )
    const result = await fetchTradingViewPrices([{ symbol: 'DDDD6', type: 'stock' }])
    expect(result).toEqual([])
  })

  it('throws when the scanner HTTP response is not ok', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse({}, false, 500))
    await expect(fetchTradingViewPrices([{ symbol: 'EEEE7', type: 'stock' }])).rejects.toThrow('TradingView scanner 500')
  })

  it('throws when the scanner response has no data array', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse({}))
    await expect(fetchTradingViewPrices([{ symbol: 'FFFF8', type: 'stock' }])).rejects.toThrow('unexpected response format')
  })

  it('returns an empty array without calling fetch for an empty symbol list', async () => {
    const result = await fetchTradingViewPrices([])
    expect(result).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('fetchTradingViewIndices', () => {
  // Each test gets a fresh module instance -- fetchTradingViewIndices always
  // scans the same fixed ticker list, so a shared module would serve the
  // second test's request from the first test's cache entry.
  beforeEach(() => {
    vi.resetModules()
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('maps known index tickers into MarketIndex entries', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse({ data: [{ s: 'SP:SPX', d: ['SPX', 'S&P 500', 5000, 1.2, 0, 0, 'USD', 'streaming'] }] })
    )
    const { fetchTradingViewIndices: freshFetch } = await import('./tradingview')
    const result = await freshFetch()
    const spx = result.find(r => r.symbol === 'SPX')
    expect(spx).toMatchObject({ name: 'S&P 500', value: 5000, pct: 1.2 })
  })

  it('omits indices with no matching scan row', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse({ data: [] }))
    const { fetchTradingViewIndices: freshFetch } = await import('./tradingview')
    const result = await freshFetch()
    expect(result).toEqual([])
  })
})

describe('tradingview scan caching behavior', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('serves a second call within the fresh window from cache without refetching', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse({ data: [scanRow('NASDAQ:CACHE1')] })
    )
    await fetchTradingViewPrices([{ symbol: 'CACHE1', type: 'stock' }])
    await fetchTradingViewPrices([{ symbol: 'CACHE1', type: 'stock' }])
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('refetches once the fresh window has elapsed', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse({ data: [scanRow('NASDAQ:CACHE2')] })
    )
    await fetchTradingViewPrices([{ symbol: 'CACHE2', type: 'stock' }])
    vi.setSystemTime(26_000) // past the 25s fresh window
    await fetchTradingViewPrices([{ symbol: 'CACHE2', type: 'stock' }])
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('deduplicates concurrent in-flight requests for the same ticker set', async () => {
    let resolveFetch!: (v: Response) => void
    ;(fetch as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise<Response>(resolve => { resolveFetch = resolve })
    )
    const p1 = fetchTradingViewPrices([{ symbol: 'CACHE3', type: 'stock' }])
    const p2 = fetchTradingViewPrices([{ symbol: 'CACHE3', type: 'stock' }])
    resolveFetch(jsonResponse({ data: [scanRow('NASDAQ:CACHE3')] }))
    await Promise.all([p1, p2])
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('falls back to stale cache when a refresh request fails', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      jsonResponse({ data: [scanRow('NASDAQ:CACHE4')] })
    )
    const first = await fetchTradingViewPrices([{ symbol: 'CACHE4', type: 'stock' }])

    vi.setSystemTime(26_000) // stale but not yet expired (5 min)
    ;(fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('network blip'))
    const second = await fetchTradingViewPrices([{ symbol: 'CACHE4', type: 'stock' }])

    // lastUpdated is stamped fresh on every call, so compare everything else
    expect({ ...second[0], lastUpdated: null }).toEqual({ ...first[0], lastUpdated: null })
  })

  it('throws once the stale window has also expired and the refresh fails', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      jsonResponse({ data: [scanRow('NASDAQ:CACHE5')] })
    )
    await fetchTradingViewPrices([{ symbol: 'CACHE5', type: 'stock' }])

    vi.setSystemTime(6 * 60_000) // past the 5-minute stale window
    ;(fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('still down'))
    await expect(fetchTradingViewPrices([{ symbol: 'CACHE5', type: 'stock' }])).rejects.toThrow('still down')
  })
})

describe('tradingview scan when disabled via env flag', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('returns an empty array without calling fetch', async () => {
    vi.stubGlobal('fetch', vi.fn())
    vi.stubEnv('TRADINGVIEW_UNOFFICIAL_ENABLED', 'false')
    vi.resetModules()
    const { fetchTradingViewPrices: fetchDisabled } = await import('./tradingview')
    const result = await fetchDisabled([{ symbol: 'ANY', type: 'stock' }])
    expect(result).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })
})
