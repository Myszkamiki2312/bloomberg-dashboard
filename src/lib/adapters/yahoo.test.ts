import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchYahooQuote, fetchYahooOHLC } from './yahoo'

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body } as Response
}

function chartResult(overrides: Record<string, unknown> = {}) {
  return {
    chart: {
      result: [
        {
          meta: {
            regularMarketPrice: 100,
            chartPreviousClose: 90,
            regularMarketVolume: 1000,
            currency: 'usd',
            longName: 'Test Co',
            ...((overrides.meta as object) ?? {}),
          },
          timestamp: [1700000000, 1700086400],
          indicators: { quote: [{ open: [95, 98], high: [101, 102], low: [90, 96], close: [98, 100], volume: [500, 600] }] },
          ...overrides,
        },
      ],
    },
  }
}

describe('fetchYahooQuote', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns a quote built from the base-symbol response', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse(chartResult()))
    const quote = await fetchYahooQuote('PKN.WA')
    expect(quote?.price).toBe(100)
    expect(quote?.change24h).toBe(10) // 100 - 90
    expect(quote?.currency).toBe('USD') // uppercased
    expect(quote?.source).toBe('Yahoo Finance')
  })

  it('returns null when the base symbol already has a dot suffix and fails', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse({ chart: { result: [null] } }))
    const quote = await fetchYahooQuote('BADTICKER.WA')
    expect(quote).toBeNull()
  })

  it('falls back to trying exchange suffixes for a plain symbol', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockImplementation(async (url: string) => {
      if (url.includes('SYM?') || url.includes('/SYM?')) return jsonResponse({ chart: { result: [null] } })
      if (url.includes('SYM.WA')) return jsonResponse(chartResult())
      return jsonResponse({ chart: { result: [null] } })
    })
    const quote = await fetchYahooQuote('SYM')
    expect(quote?.price).toBe(100)
  })

  it('returns null when every suffix attempt fails', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse({ chart: { result: [null] } }))
    const quote = await fetchYahooQuote('NOPE')
    expect(quote).toBeNull()
  })

  it('returns null when fetch rejects with a network error', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network down'))
    const quote = await fetchYahooQuote('PKN.WA')
    expect(quote).toBeNull()
  })

  it('returns null on a non-ok HTTP response', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse({}, false))
    const quote = await fetchYahooQuote('PKN.WA')
    expect(quote).toBeNull()
  })

  it('computes changePercent24h as 0 when previous close is not positive', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse(chartResult({ meta: { regularMarketPrice: 50, chartPreviousClose: 0 } }))
    )
    const quote = await fetchYahooQuote('PKN.WA')
    expect(quote?.changePercent24h).toBe(0)
  })
})

describe('fetchYahooOHLC', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('maps timestamps and OHLCV arrays into bars', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse(chartResult()))
    const bars = await fetchYahooOHLC('PKN.WA', 10)
    expect(bars).toHaveLength(2)
    expect(bars[0]).toMatchObject({ open: 95, high: 101, low: 90, close: 98, volume: 500, source: 'Yahoo Finance' })
  })

  it('filters out bars with a non-positive close/open/high/low', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse(
        chartResult({
          timestamp: [1700000000, 1700086400],
          indicators: { quote: [{ open: [95, 0], high: [101, 0], low: [90, 0], close: [98, 0], volume: [500, 0] }] },
        })
      )
    )
    const bars = await fetchYahooOHLC('PKN.WA', 10)
    expect(bars).toHaveLength(1)
  })

  it('skips a bar whose timestamp is not finite', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse(
        chartResult({
          timestamp: [1700000000, NaN],
          indicators: { quote: [{ open: [95, 98], high: [101, 102], low: [90, 96], close: [98, 100], volume: [500, 600] }] },
        })
      )
    )
    const bars = await fetchYahooOHLC('PKN.WA', 10)
    expect(bars).toHaveLength(1)
  })

  it('returns an empty array when ticker resolution fails entirely', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse({ chart: { result: [null] } }))
    const bars = await fetchYahooOHLC('NOPE', 10)
    expect(bars).toEqual([])
  })

  it('returns an empty array when fetch throws', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('boom'))
    const bars = await fetchYahooOHLC('PKN.WA', 10)
    expect(bars).toEqual([])
  })

  it('picks a wider Yahoo range for a larger day count', async () => {
    const mockFetch = fetch as ReturnType<typeof vi.fn>
    mockFetch.mockResolvedValue(jsonResponse(chartResult()))
    await fetchYahooOHLC('PKN.WA', 200)
    const calledUrl = mockFetch.mock.calls[0][0] as string
    expect(calledUrl).toContain('range=1y')
  })
})
