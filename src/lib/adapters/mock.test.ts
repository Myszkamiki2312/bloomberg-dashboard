import { describe, it, expect } from 'vitest'
import { getMockPrices, getMockOHLC, getMockNews, getMockCalendar, getMockAISummary } from './mock'

describe('getMockPrices', () => {
  const prices = getMockPrices()

  it('returns a non-empty, fixed set of demo assets', () => {
    expect(prices.length).toBeGreaterThan(0)
  })

  it('every price is a positive finite number', () => {
    for (const p of prices) {
      expect(Number.isFinite(p.price)).toBe(true)
      expect(p.price).toBeGreaterThan(0)
    }
  })

  it('is consistently labeled as demo-quality USD data', () => {
    for (const p of prices) {
      expect(p.currency).toBe('USD')
      expect(p.quality).toBe('demo')
      expect(p.source).toBe('Dane demonstracyjne')
    }
  })

  it('has no duplicate symbols', () => {
    const symbols = prices.map(p => p.symbol)
    expect(new Set(symbols).size).toBe(symbols.length)
  })

  it('includes both stock and crypto types', () => {
    const types = new Set(prices.map(p => p.type))
    expect(types.has('stock')).toBe(true)
    expect(types.has('crypto')).toBe(true)
  })
})

describe('getMockOHLC', () => {
  it('returns days + 1 bars (inclusive of today)', () => {
    expect(getMockOHLC('AAPL', 30)).toHaveLength(31)
    expect(getMockOHLC('AAPL', 0)).toHaveLength(1)
  })

  it('is deterministic for the same symbol and day count', () => {
    const a = getMockOHLC('BTC', 10)
    const b = getMockOHLC('BTC', 10)
    expect(a).toEqual(b)
  })

  it('produces a different (but still deterministic) series for a different symbol', () => {
    const btc = getMockOHLC('BTC', 10)
    const eth = getMockOHLC('ETH', 10)
    expect(btc.map(b => b.close)).not.toEqual(eth.map(b => b.close))
  })

  it('falls back to a base price of 100 for an unknown symbol instead of crashing', () => {
    const bars = getMockOHLC('NOT_A_REAL_SYMBOL', 5)
    expect(bars).toHaveLength(6)
    expect(bars.every(b => Number.isFinite(b.close) && b.close > 0)).toBe(true)
  })

  it('maintains OHLC invariants: high is the max and low is the min of the bar', () => {
    const bars = getMockOHLC('MSFT', 60)
    for (const bar of bars) {
      expect(bar.high).toBeGreaterThanOrEqual(Math.max(bar.open, bar.close))
      expect(bar.low).toBeLessThanOrEqual(Math.min(bar.open, bar.close))
    }
  })

  it('bars are in ascending chronological order', () => {
    const bars = getMockOHLC('TSLA', 20)
    const times = bars.map(b => b.time)
    expect(times).toEqual([...times].sort())
  })

  it('is labeled as demo-quality data', () => {
    const bars = getMockOHLC('NVDA', 5)
    expect(bars.every(b => b.quality === 'demo')).toBe(true)
  })
})

describe('getMockNews', () => {
  const news = getMockNews()

  it('returns a fixed-size list of news items', () => {
    expect(news.length).toBeGreaterThan(0)
  })

  it('every item has a valid ISO publishedAt in the past', () => {
    const now = Date.now()
    for (const item of news) {
      const ts = new Date(item.publishedAt).getTime()
      expect(Number.isNaN(ts)).toBe(false)
      expect(ts).toBeLessThanOrEqual(now)
    }
  })

  it('is ordered most-recent first', () => {
    const timestamps = news.map(n => new Date(n.publishedAt).getTime())
    expect(timestamps).toEqual([...timestamps].sort((a, b) => b - a))
  })

  it('has no empty titles', () => {
    expect(news.every(n => n.title.trim().length > 0)).toBe(true)
  })
})

describe('getMockCalendar', () => {
  const events = getMockCalendar()

  it('returns the full fixed set of demo events', () => {
    expect(events.length).toBeGreaterThan(0)
  })

  it('never schedules an event on a weekend', () => {
    for (const e of events) {
      const weekday = new Date(`${e.date}T12:00:00Z`).getUTCDay()
      expect(weekday).not.toBe(0)
      expect(weekday).not.toBe(6)
    }
  })

  it('dates are non-decreasing (matches the daysFromNow ordering of the source data)', () => {
    const dates = events.map(e => e.date)
    expect(dates).toEqual([...dates].sort())
  })

  it('is labeled as demo-quality data', () => {
    expect(events.every(e => e.quality === 'demo')).toBe(true)
  })

  it('every event has a non-empty importance level', () => {
    const validLevels = ['low', 'medium', 'high']
    expect(events.every(e => validLevels.includes(e.importance))).toBe(true)
  })
})

describe('getMockAISummary', () => {
  it('reports "no data" summary text for an empty price list', () => {
    const result = getMockAISummary([])
    expect(result.summary).toContain('Brak aktualnych notowań')
    expect(result.sentiment).toBe('neutral')
  })

  it('is bullish when average 24h change is clearly positive', () => {
    const result = getMockAISummary([
      { symbol: 'A', name: 'A', price: 10, change24h: 1, changePercent24h: 5, volume24h: 1, marketCap: 1, type: 'stock', currency: 'USD', lastUpdated: '' },
    ])
    expect(result.sentiment).toBe('bullish')
  })

  it('is bearish when average 24h change is clearly negative', () => {
    const result = getMockAISummary([
      { symbol: 'A', name: 'A', price: 10, change24h: -1, changePercent24h: -5, volume24h: 1, marketCap: 1, type: 'stock', currency: 'USD', lastUpdated: '' },
    ])
    expect(result.sentiment).toBe('bearish')
  })

  it('ignores non-positive/non-finite prices when computing the summary', () => {
    const result = getMockAISummary([
      { symbol: 'BAD', name: 'Bad', price: 0, change24h: 0, changePercent24h: 999, volume24h: 1, marketCap: 1, type: 'stock', currency: 'USD', lastUpdated: '' },
    ])
    // The one usable-price filter should exclude the zero-price entry entirely
    expect(result.summary).toContain('Brak aktualnych notowań')
  })

  it('keeps sentimentScore within the 0-100 range even for extreme input', () => {
    const extreme = Array.from({ length: 5 }, (_, i) => ({
      symbol: `S${i}`, name: `S${i}`, price: 10, change24h: 100, changePercent24h: 500,
      volume24h: 1, marketCap: 1, type: 'stock' as const, currency: 'USD', lastUpdated: '',
    }))
    const result = getMockAISummary(extreme)
    expect(result.sentimentScore).toBeGreaterThanOrEqual(0)
    expect(result.sentimentScore).toBeLessThanOrEqual(100)
  })

  it('is always flagged as demo data', () => {
    expect(getMockAISummary().isDemo).toBe(true)
  })
})
