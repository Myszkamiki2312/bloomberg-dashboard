import { describe, it, expect } from 'vitest'
import { calculateRSI, calculateSMA, calculateVolatility, getTrend } from './rsi'

describe('calculateRSI', () => {
  it('returns 50 (neutral) when there is not enough data', () => {
    expect(calculateRSI([1, 2, 3], 14)).toBe(50)
  })

  it('returns 100 when every change is a gain (no losses at all)', () => {
    const prices = Array.from({ length: 20 }, (_, i) => 100 + i)
    expect(calculateRSI(prices, 14)).toBe(100)
  })

  it('returns 0 when every change is a loss (no gains at all)', () => {
    const prices = Array.from({ length: 20 }, (_, i) => 100 - i)
    expect(calculateRSI(prices, 14)).toBe(0)
  })

  it('returns 50 for a flat (unchanging) price series', () => {
    const prices = Array(20).fill(100)
    expect(calculateRSI(prices, 14)).toBe(50)
  })

  it('stays within the valid 0-100 range for mixed data', () => {
    const prices = [10, 12, 11, 13, 15, 14, 16, 18, 17, 19, 20, 18, 21, 22, 20]
    const rsi = calculateRSI(prices, 14)
    expect(rsi).toBeGreaterThanOrEqual(0)
    expect(rsi).toBeLessThanOrEqual(100)
  })
})

describe('calculateSMA', () => {
  it('averages exactly the last N prices', () => {
    expect(calculateSMA([1, 2, 3, 4, 5], 3)).toBeCloseTo((3 + 4 + 5) / 3)
  })

  it('falls back to the last price when there is not enough history', () => {
    expect(calculateSMA([42], 10)).toBe(42)
  })

  it('returns 0 for an empty series', () => {
    expect(calculateSMA([], 10)).toBe(0)
  })
})

describe('calculateVolatility', () => {
  it('is 0 for a perfectly flat price series', () => {
    expect(calculateVolatility([100, 100, 100, 100])).toBe(0)
  })

  it('is positive for a fluctuating series', () => {
    expect(calculateVolatility([100, 105, 98, 110, 95])).toBeGreaterThan(0)
  })

  it('ignores non-positive prices instead of producing -Infinity/NaN', () => {
    const result = calculateVolatility([100, 0, -5, 105])
    expect(Number.isFinite(result)).toBe(true)
  })
})

describe('getTrend', () => {
  it('is neutral without at least 20 data points', () => {
    expect(getTrend([1, 2, 3])).toBe('neutral')
  })

  it('is bullish for a steadily rising series', () => {
    const prices = Array.from({ length: 60 }, (_, i) => 100 + i)
    expect(getTrend(prices)).toBe('bullish')
  })

  it('is bearish for a steadily falling series', () => {
    const prices = Array.from({ length: 60 }, (_, i) => 200 - i)
    expect(getTrend(prices)).toBe('bearish')
  })
})
