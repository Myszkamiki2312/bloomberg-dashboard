import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchStockQuote, fetchStockOHLC } from './finnhub'

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body } as Response
}

describe('fetchStockQuote', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('returns null when no API key is configured', async () => {
    vi.stubEnv('FINNHUB_KEY', '')
    const quote = await fetchStockQuote('AAPL')
    expect(quote).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('builds a quote by merging the quote and profile responses', async () => {
    vi.stubEnv('FINNHUB_KEY', 'test-key')
    ;(fetch as ReturnType<typeof vi.fn>).mockImplementation(async (url: string) => {
      if (url.includes('/quote')) return jsonResponse({ c: 150, d: 2, dp: 1.35, v: 1_000_000 })
      return jsonResponse({ name: 'Apple Inc', marketCapitalization: 3_000_000, currency: 'usd' })
    })
    const quote = await fetchStockQuote('AAPL')
    expect(quote).toMatchObject({
      symbol: 'AAPL', name: 'Apple Inc', price: 150, change24h: 2, changePercent24h: 1.35,
      marketCap: 3_000_000 * 1e6, currency: 'USD', source: 'Finnhub', quality: 'live',
    })
  })

  it('returns null when the quote response is not ok', async () => {
    vi.stubEnv('FINNHUB_KEY', 'test-key')
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse({}, false))
    const quote = await fetchStockQuote('AAPL')
    expect(quote).toBeNull()
  })

  it('returns null when the quote has no current price', async () => {
    vi.stubEnv('FINNHUB_KEY', 'test-key')
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse({ c: 0 }))
    const quote = await fetchStockQuote('AAPL')
    expect(quote).toBeNull()
  })

  it('falls back to defaults when the profile request fails', async () => {
    vi.stubEnv('FINNHUB_KEY', 'test-key')
    ;(fetch as ReturnType<typeof vi.fn>).mockImplementation(async (url: string) => {
      if (url.includes('/quote')) return jsonResponse({ c: 150, d: 2, dp: 1.35, v: 1_000_000 })
      return jsonResponse({}, false)
    })
    const quote = await fetchStockQuote('AAPL')
    expect(quote?.name).toBe('AAPL')
    expect(quote?.marketCap).toBe(0)
    expect(quote?.currency).toBe('USD')
  })
})

describe('fetchStockOHLC', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('returns an empty array when no API key is configured', async () => {
    vi.stubEnv('FINNHUB_KEY', '')
    const bars = await fetchStockOHLC('AAPL')
    expect(bars).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('maps candle arrays into bars', async () => {
    vi.stubEnv('FINNHUB_KEY', 'test-key')
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse({ s: 'ok', t: [1700000000, 1700086400], o: [1, 2], h: [3, 4], l: [0.5, 1], c: [2, 3], v: [10, 20] })
    )
    const bars = await fetchStockOHLC('AAPL')
    expect(bars).toHaveLength(2)
    expect(bars[0]).toMatchObject({ open: 1, high: 3, low: 0.5, close: 2, volume: 10, source: 'Finnhub' })
  })

  it('returns an empty array when status is not "ok"', async () => {
    vi.stubEnv('FINNHUB_KEY', 'test-key')
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse({ s: 'no_data' }))
    const bars = await fetchStockOHLC('AAPL')
    expect(bars).toEqual([])
  })

  it('returns an empty array when the HTTP response is not ok', async () => {
    vi.stubEnv('FINNHUB_KEY', 'test-key')
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse({}, false))
    const bars = await fetchStockOHLC('AAPL')
    expect(bars).toEqual([])
  })

  it('skips a candle with a missing OHLC field', async () => {
    vi.stubEnv('FINNHUB_KEY', 'test-key')
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse({ s: 'ok', t: [1700000000, 1700086400], o: [1, undefined], h: [3, 4], l: [0.5, 1], c: [2, undefined], v: [10, 20] })
    )
    const bars = await fetchStockOHLC('AAPL')
    expect(bars).toHaveLength(1)
  })
})
