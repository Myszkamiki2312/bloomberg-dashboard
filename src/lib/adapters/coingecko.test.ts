import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchCryptoPrices, fetchCryptoOHLC, getCoinId } from './coingecko'

function jsonResponse(body: unknown, ok = true) {
  return { ok, status: ok ? 200 : 500, json: async () => body } as Response
}

describe('getCoinId', () => {
  it('resolves a known symbol case-insensitively', () => {
    expect(getCoinId('btc')).toBe('bitcoin')
    expect(getCoinId('BTC')).toBe('bitcoin')
  })

  it('returns undefined for an unknown symbol', () => {
    expect(getCoinId('NOT_A_COIN')).toBeUndefined()
  })
})

describe('fetchCryptoPrices', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns an empty array immediately when no symbols resolve to a known coin id', async () => {
    const result = await fetchCryptoPrices(['NOT_A_COIN'])
    expect(result).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('maps a successful response into AssetPrice entries', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse({ bitcoin: { usd: 50000, usd_24h_change: 10, usd_24h_vol: 1e9, usd_market_cap: 1e12 } })
    )
    const result = await fetchCryptoPrices(['BTC'])
    expect(result).toHaveLength(1)
    expect(result[0].symbol).toBe('BTC')
    expect(result[0].price).toBe(50000)
    expect(result[0].changePercent24h).toBe(10)
    // prevPrice = 50000 / 1.10 ; change24h = 50000 - prevPrice
    expect(result[0].change24h).toBeCloseTo(50000 - 50000 / 1.1, 5)
  })

  it('handles a -100% change without dividing by zero', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse({ bitcoin: { usd: 0, usd_24h_change: -100 } })
    )
    const result = await fetchCryptoPrices(['BTC'])
    expect(result[0].change24h).toBe(0)
  })

  it('skips a requested symbol missing from the response payload', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse({}))
    const result = await fetchCryptoPrices(['BTC'])
    expect(result).toEqual([])
  })

  it('throws when the HTTP response is not ok', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse({}, false))
    await expect(fetchCryptoPrices(['BTC'])).rejects.toThrow('CoinGecko 500')
  })

  it('throws when the response body is not a plain object', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse([1, 2, 3]))
    await expect(fetchCryptoPrices(['BTC'])).rejects.toThrow('unexpected response format')
  })
})

describe('fetchCryptoOHLC', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('throws for an unknown symbol without calling fetch', async () => {
    await expect(fetchCryptoOHLC('NOT_A_COIN')).rejects.toThrow('Unknown coin')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('maps [ts, o, h, l, c] tuples into OHLC bars', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse([[1700000000000, 100, 110, 90, 105]])
    )
    const bars = await fetchCryptoOHLC('BTC')
    expect(bars).toHaveLength(1)
    expect(bars[0]).toMatchObject({ open: 100, high: 110, low: 90, close: 105, source: 'CoinGecko' })
  })

  it('filters out a tuple with a non-finite timestamp', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse([[NaN, 100, 110, 90, 105], [1700000000000, 100, 110, 90, 105]])
    )
    const bars = await fetchCryptoOHLC('BTC')
    expect(bars).toHaveLength(1)
  })

  it('throws when the HTTP response is not ok', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse({}, false))
    await expect(fetchCryptoOHLC('BTC')).rejects.toThrow('CoinGecko OHLC 500')
  })

  it('throws when the response body is not an array', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse({ not: 'an array' }))
    await expect(fetchCryptoOHLC('BTC')).rejects.toThrow('unexpected response format')
  })
})
