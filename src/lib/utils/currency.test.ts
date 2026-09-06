import { describe, it, expect } from 'vitest'
import { buildFxRates, convertMoney } from './currency'
import type { MarketIndex } from '@/types'

const idx = (symbol: string, value: number): MarketIndex => ({
  symbol,
  name: symbol,
  value,
  change: 0,
  pct: 0,
})

describe('convertMoney (regression: watchlist price row ignored base currency)', () => {
  it('converts a USD price into PLN using USDPLN', () => {
    const rates = buildFxRates([idx('USDPLN', 4)])
    const result = convertMoney(100, 'USD', 'PLN', rates)
    expect(result).toBe(400)
  })

  it('converts a PLN price into EUR via USDPLN + EURUSD when EURPLN is missing', () => {
    const rates = buildFxRates([idx('USDPLN', 4), idx('EURUSD', 1.1)])
    // EUR/PLN implied = 4 * 1.1 = 4.4
    const result = convertMoney(440, 'PLN', 'EUR', rates)
    expect(result).toBeCloseTo(100)
  })

  it('is a no-op converting a currency to itself', () => {
    const rates = buildFxRates([idx('USDPLN', 4)])
    expect(convertMoney(50, 'USD', 'USD', rates)).toBe(50)
  })

  it('returns null when the target currency has no known rate', () => {
    const rates = buildFxRates([]) // no FX indices available at all
    expect(convertMoney(50, 'USD', 'EUR', rates)).toBeNull()
  })
})
