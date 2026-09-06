import { describe, it, expect } from 'vitest'
import { createPortfolioBackup, parsePortfolioBackup } from './portfolioBackup'
import type { WatchlistEntry, PriceAlert } from '@/types'

describe('parsePortfolioBackup', () => {
  it('round-trips a backup created by createPortfolioBackup', () => {
    const watchlist: WatchlistEntry[] = [
      { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock', quantity: 10, avgPrice: 150 },
    ]
    const alerts: PriceAlert[] = [
      { id: '1', symbol: 'AAPL', targetPrice: 200, direction: 'above', active: true, triggered: false, createdAt: '2026-01-01T00:00:00.000Z' },
    ]
    const backup = createPortfolioBackup(watchlist, alerts, 'USD')
    const parsed = parsePortfolioBackup(JSON.parse(JSON.stringify(backup)))
    expect(parsed.watchlist).toEqual(watchlist)
    expect(parsed.alerts).toEqual(alerts)
    expect(parsed.baseCurrency).toBe('USD')
  })

  it('rejects a non-object payload', () => {
    expect(() => parsePortfolioBackup(null)).toThrow()
    expect(() => parsePortfolioBackup('not json')).toThrow()
  })

  it('rejects a payload with no valid watchlist entries', () => {
    expect(() => parsePortfolioBackup({ watchlist: [] })).toThrow()
    expect(() => parsePortfolioBackup({ watchlist: 'not-an-array' })).toThrow()
  })

  it('sanitizes symbols and drops entries with an unknown type', () => {
    const result = parsePortfolioBackup({
      watchlist: [
        { symbol: 'aapl<script>', name: 'Apple', type: 'stock' },
        { symbol: 'BAD', name: 'Bad Entry', type: 'not-a-real-type' },
      ],
    })
    expect(result.watchlist).toHaveLength(1)
    expect(result.watchlist[0].symbol).toBe('AAPLSCRIPT')
  })

  it('deduplicates repeated symbols, keeping the first occurrence', () => {
    const result = parsePortfolioBackup({
      watchlist: [
        { symbol: 'BTC', name: 'Bitcoin', type: 'crypto', quantity: 1 },
        { symbol: 'BTC', name: 'Bitcoin Duplicate', type: 'crypto', quantity: 99 },
      ],
    })
    expect(result.watchlist).toHaveLength(1)
    expect(result.watchlist[0].quantity).toBe(1)
  })

  it('drops negative or non-finite numeric fields instead of importing garbage', () => {
    const result = parsePortfolioBackup({
      watchlist: [
        { symbol: 'AAPL', name: 'Apple', type: 'stock', quantity: -5, avgPrice: 'not-a-number' },
      ],
    })
    expect(result.watchlist[0].quantity).toBeUndefined()
    expect(result.watchlist[0].avgPrice).toBeUndefined()
  })

  it('falls back to PLN for an invalid or missing baseCurrency', () => {
    const result = parsePortfolioBackup({
      watchlist: [{ symbol: 'AAPL', name: 'Apple', type: 'stock' }],
      baseCurrency: 'NOT_A_CURRENCY',
    })
    expect(result.baseCurrency).toBe('PLN')
  })

  it('drops alerts with an invalid direction or non-positive target price', () => {
    const result = parsePortfolioBackup({
      watchlist: [{ symbol: 'AAPL', name: 'Apple', type: 'stock' }],
      alerts: [
        { symbol: 'AAPL', targetPrice: 100, direction: 'sideways' },
        { symbol: 'AAPL', targetPrice: -50, direction: 'above' },
        { symbol: 'AAPL', targetPrice: 100, direction: 'above' },
      ],
    })
    expect(result.alerts).toHaveLength(1)
  })

  it('caps watchlist size at 100 entries instead of accepting an unbounded import', () => {
    const watchlist = Array.from({ length: 150 }, (_, i) => ({
      symbol: `SYM${i}`,
      name: `Symbol ${i}`,
      type: 'stock',
    }))
    const result = parsePortfolioBackup({ watchlist })
    expect(result.watchlist.length).toBeLessThanOrEqual(100)
  })
})
