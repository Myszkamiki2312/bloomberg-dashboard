import { describe, it, expect } from 'vitest'
import { resolveIndexValue } from './indicesResolver'
import type { MarketIndex } from '@/types'

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
})
