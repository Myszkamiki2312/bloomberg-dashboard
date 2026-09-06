import { describe, it, expect } from 'vitest'
import { buildFxRates, convertMoney, convertPlnToBase, isPortfolioCurrency } from './currency'
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

  it('returns null for a non-finite amount', () => {
    const rates = buildFxRates([idx('USDPLN', 4)])
    expect(convertMoney(NaN, 'USD', 'PLN', rates)).toBeNull()
    expect(convertMoney(Infinity, 'USD', 'PLN', rates)).toBeNull()
  })
})

describe('buildFxRates', () => {
  it('always includes PLN at rate 1', () => {
    expect(buildFxRates([])).toEqual({ PLN: 1 })
  })

  it('prefers a direct EURPLN rate over the USDPLN*EURUSD derivation', () => {
    const rates = buildFxRates([idx('USDPLN', 4), idx('EURUSD', 1.1), idx('EURPLN', 4.35)])
    expect(rates.EUR).toBe(4.35)
  })

  it('derives EURPLN from USDPLN and EURUSD when no direct rate exists', () => {
    const rates = buildFxRates([idx('USDPLN', 4), idx('EURUSD', 1.1)])
    expect(rates.EUR).toBeCloseTo(4.4)
  })

  it('ignores a non-finite or non-positive USDPLN value', () => {
    const rates = buildFxRates([idx('USDPLN', NaN)])
    expect(rates.USD).toBeUndefined()
  })

  it('ignores a non-finite or non-positive EURPLN value, falling through to derivation', () => {
    const rates = buildFxRates([idx('USDPLN', 4), idx('EURUSD', 1.1), idx('EURPLN', -1)])
    expect(rates.EUR).toBeCloseTo(4.4)
  })

  it('omits EUR entirely when neither a direct rate nor derivation inputs are available', () => {
    const rates = buildFxRates([idx('USDPLN', 4)])
    expect(rates.EUR).toBeUndefined()
  })

  it('ignores unrelated index symbols', () => {
    const rates = buildFxRates([idx('SPX', 5000), idx('USDPLN', 4)])
    expect(rates).toEqual({ PLN: 1, USD: 4 })
  })
})

describe('convertPlnToBase', () => {
  it('converts a PLN amount into USD using the given rate', () => {
    const rates = buildFxRates([idx('USDPLN', 4)])
    expect(convertPlnToBase(400, 'USD', rates)).toBe(100)
  })

  it('is a no-op for PLN to PLN', () => {
    const rates = buildFxRates([])
    expect(convertPlnToBase(123, 'PLN', rates)).toBe(123)
  })

  it('returns null when the target currency has no known rate', () => {
    const rates = buildFxRates([])
    expect(convertPlnToBase(100, 'EUR', rates)).toBeNull()
  })

  it('returns null for a non-finite PLN amount', () => {
    const rates = buildFxRates([idx('USDPLN', 4)])
    expect(convertPlnToBase(NaN, 'USD', rates)).toBeNull()
  })
})

describe('isPortfolioCurrency', () => {
  it('accepts PLN, USD, and EUR', () => {
    expect(isPortfolioCurrency('PLN')).toBe(true)
    expect(isPortfolioCurrency('USD')).toBe(true)
    expect(isPortfolioCurrency('EUR')).toBe(true)
  })

  it('rejects an unsupported currency code', () => {
    expect(isPortfolioCurrency('GBP')).toBe(false)
  })

  it('rejects undefined and an empty string', () => {
    expect(isPortfolioCurrency(undefined)).toBe(false)
    expect(isPortfolioCurrency('')).toBe(false)
  })
})
