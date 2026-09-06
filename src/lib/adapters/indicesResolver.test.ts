import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { resolveIndexValue, fetchQuote, INDICES } from './indicesResolver'
import type { MarketIndex } from '@/types'

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body } as Response
}

const IDX = { ticker: '^GSPC', label: 'SPX', name: 'S&P 500' }
const NOW = '2026-01-01T00:00:00.000Z'

describe('resolveIndexValue', () => {
  it('prefers TradingView when available', () => {
    const tradingView: MarketIndex = {
      symbol: 'SPX',
      name: 'S&P 500',
      value: 100,
      change: 1,
      pct: 1,
      source: 'TradingView',
      quality: 'delayed',
      lastUpdated: NOW,
    }
    const result = resolveIndexValue(IDX, tradingView, { status: 'rejected', reason: 'unused' }, NOW)
    expect(result).toBe(tradingView)
  })

  it('falls back to Yahoo when TradingView is unavailable', () => {
    const result = resolveIndexValue(
      IDX,
      undefined,
      { status: 'fulfilled', value: { price: 200, prev: 100, name: 'S&P 500 Yahoo' } },
      NOW
    )
    expect(result.source).toBe('Yahoo Finance')
    expect(result.quality).toBe('delayed')
    expect(result.value).toBe(200)
    expect(result.pct).toBeCloseTo(100) // (200-100)/100 * 100
  })

  it('falls back to demo data when both TradingView and Yahoo fail', () => {
    const result = resolveIndexValue(IDX, undefined, { status: 'rejected', reason: 'network error' }, NOW)
    expect(result.source).toBe('Dane demonstracyjne')
    expect(result.quality).toBe('demo')
  })

  it('falls back to demo data when Yahoo resolves but with no value', () => {
    const result = resolveIndexValue(IDX, undefined, { status: 'fulfilled', value: null }, NOW)
    expect(result.quality).toBe('demo')
  })

  it('prefers the static index name over the Yahoo-reported name', () => {
    const result = resolveIndexValue(
      IDX,
      undefined,
      { status: 'fulfilled', value: { price: 200, prev: 100, name: 'Different Name' } },
      NOW
    )
    expect(result.name).toBe('S&P 500')
  })

  it('falls back to the Yahoo name when the static index has no name', () => {
    const result = resolveIndexValue(
      { ...IDX, name: '' },
      undefined,
      { status: 'fulfilled', value: { price: 200, prev: 100, name: 'Yahoo Name' } },
      NOW
    )
    expect(result.name).toBe('Yahoo Name')
  })

  it('reports pct as 0 when the previous close is not positive', () => {
    const result = resolveIndexValue(
      IDX,
      undefined,
      { status: 'fulfilled', value: { price: 200, prev: 0, name: 'S&P 500' } },
      NOW
    )
    expect(result.pct).toBe(0)
  })

  it('uses a zeroed fallback for a ticker with no known demo value', () => {
    const result = resolveIndexValue(
      { ticker: 'UNKNOWN=X', label: 'UNK', name: 'Unknown' },
      undefined,
      { status: 'rejected', reason: 'x' },
      NOW
    )
    expect(result).toMatchObject({ value: 0, change: 0, pct: 0, quality: 'demo' })
  })

  it('stamps the passed-in lastUpdated on both the Yahoo and demo paths', () => {
    const yahoo = resolveIndexValue(IDX, undefined, { status: 'fulfilled', value: { price: 1, prev: 1, name: 'x' } }, NOW)
    const demo = resolveIndexValue(IDX, undefined, { status: 'rejected', reason: 'x' }, NOW)
    expect(yahoo.lastUpdated).toBe(NOW)
    expect(demo.lastUpdated).toBe(NOW)
  })
})

describe('INDICES', () => {
  it('has a unique label and ticker per entry', () => {
    expect(new Set(INDICES.map(i => i.label)).size).toBe(INDICES.length)
    expect(new Set(INDICES.map(i => i.ticker)).size).toBe(INDICES.length)
  })
})

describe('fetchQuote', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns price/prev/name parsed from a successful Yahoo response', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse({ chart: { result: [{ meta: { regularMarketPrice: 100, chartPreviousClose: 90, shortName: 'S&P 500' } }] } })
    )
    const result = await fetchQuote('^GSPC')
    expect(result).toEqual({ price: 100, prev: 90, name: 'S&P 500' })
  })

  it('falls back to regularMarketPrice as prev when chartPreviousClose is missing', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse({ chart: { result: [{ meta: { regularMarketPrice: 100, shortName: 'x' } }] } })
    )
    const result = await fetchQuote('^GSPC')
    expect(result?.prev).toBe(100)
  })

  it('returns null when regularMarketPrice is missing', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse({ chart: { result: [{ meta: {} }] } }))
    expect(await fetchQuote('^GSPC')).toBeNull()
  })

  it('returns null on a non-ok HTTP response', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse({}, false))
    expect(await fetchQuote('^GSPC')).toBeNull()
  })

  it('returns null when fetch throws', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network down'))
    expect(await fetchQuote('^GSPC')).toBeNull()
  })
})
