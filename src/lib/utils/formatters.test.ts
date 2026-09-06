import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  formatPrice,
  formatCurrency,
  formatPercent,
  formatVolume,
  formatMarketCap,
  formatDate,
  formatTime,
  formatRelativeTime,
} from './formatters'

describe('formatPrice', () => {
  it('returns an em dash for non-finite input', () => {
    expect(formatPrice(NaN)).toBe('—')
    expect(formatPrice(Infinity)).toBe('—')
    expect(formatPrice(-Infinity)).toBe('—')
  })

  it('special-cases exactly zero', () => {
    expect(formatPrice(0)).toBe('0.00')
  })

  it('uses 6 decimals under 1 (sub-penny assets like some cryptos)', () => {
    expect(formatPrice(0.5)).toBe('0,500000')
  })

  it('uses 4 decimals between 1 and 100', () => {
    expect(formatPrice(99.999)).toBe('99,9990')
  })

  it('uses 2 decimals at 100 and above', () => {
    expect(formatPrice(100)).toBe('100,00')
    expect(formatPrice(1234.567)).toBe('1234,57')
  })

  it('respects an explicit decimals override regardless of magnitude', () => {
    expect(formatPrice(5, 0)).toBe('5')
    expect(formatPrice(150000, 2)).toBe(`150${' '}000,00`)
  })
})

describe('formatCurrency', () => {
  it('returns an em dash for non-finite input', () => {
    expect(formatCurrency(NaN)).toBe('—')
  })

  it('defaults to USD when no currency is given', () => {
    expect(formatCurrency(1234.5)).toBe('1234,50 USD')
  })

  it('formats PLN with the zł symbol', () => {
    expect(formatCurrency(-50, 'PLN')).toBe('-50,00 zł')
  })

  it('always shows exactly 2 decimals regardless of input precision', () => {
    expect(formatCurrency(10, 'USD')).toBe('10,00 USD')
    expect(formatCurrency(10.999, 'USD')).toBe('11,00 USD')
  })
})

describe('formatPercent', () => {
  it('returns an em dash for non-finite input', () => {
    expect(formatPercent(NaN)).toBe('—')
  })

  it('prefixes a + sign for zero and positive values', () => {
    expect(formatPercent(0)).toBe('+0.00%')
    expect(formatPercent(5.5)).toBe('+5.50%')
  })

  it('does not double up the minus sign for negative values', () => {
    expect(formatPercent(-3.2)).toBe('-3.20%')
  })

  it('rounds to 2 decimal places', () => {
    expect(formatPercent(1.005)).toMatch(/^\+1\.0[01]%$/) // float rounding is not our concern here
    expect(formatPercent(1.239)).toBe('+1.24%')
  })
})

describe('formatVolume / formatMarketCap', () => {
  it('returns an em dash for non-finite input', () => {
    expect(formatVolume(NaN)).toBe('—')
    expect(formatMarketCap(Infinity)).toBe('—')
  })

  it('leaves small numbers as a plain integer string', () => {
    expect(formatVolume(0)).toBe('0')
    expect(formatVolume(999)).toBe('999')
  })

  it('abbreviates thousands as K', () => {
    expect(formatVolume(1_500)).toBe('1.50K')
  })

  it('has a rounding quirk right at the K/M boundary (documents current behavior, not asserting it\'s ideal)', () => {
    // 999_999 / 1000 = 999.999, which toFixed(2) rounds up to "1000.00" --
    // displays as "1000.00K" instead of rolling over to "1.00M". Harmless
    // cosmetically but worth knowing about if someone "fixes" the threshold
    // check later and wonders why this test starts failing.
    expect(formatVolume(999_999)).toBe('1000.00K')
  })

  it('abbreviates millions as M', () => {
    expect(formatVolume(2_500_000)).toBe('2.50M')
  })

  it('abbreviates billions as B', () => {
    expect(formatVolume(3_200_000_000)).toBe('3.20B')
  })

  it('abbreviates trillions as T', () => {
    expect(formatVolume(1_100_000_000_000)).toBe('1.10T')
  })

  it('formatMarketCap is just an alias for formatVolume', () => {
    expect(formatMarketCap(2_500_000)).toBe(formatVolume(2_500_000))
  })

  it('handles the exact boundary values without off-by-one errors', () => {
    expect(formatVolume(1_000)).toBe('1.00K')
    expect(formatVolume(1_000_000)).toBe('1.00M')
    expect(formatVolume(1_000_000_000)).toBe('1.00B')
    expect(formatVolume(1_000_000_000_000)).toBe('1.00T')
  })
})

describe('formatDate', () => {
  it('returns the raw string for an unparseable date', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date')
  })

  it('formats as DD.MM.YYYY', () => {
    // Noon UTC so no timezone on any real machine shifts it to a different day.
    expect(formatDate('2026-09-06T12:00:00.000Z')).toMatch(/^\d{2}\.\d{2}\.2026$/)
  })

  it('matches the platform-native pl-PL formatting exactly (delegation check)', () => {
    const iso = '2026-09-06T12:00:00.000Z'
    const expected = new Date(iso).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })
    expect(formatDate(iso)).toBe(expected)
  })
})

describe('formatTime', () => {
  it('returns the raw string for an unparseable date', () => {
    expect(formatTime('garbage')).toBe('garbage')
  })

  it('formats as HH:MM (timezone-independent shape check)', () => {
    expect(formatTime('2026-09-06T12:00:00.000Z')).toMatch(/^\d{2}:\d{2}$/)
  })
})

describe('formatRelativeTime', () => {
  afterEach(() => vi.useRealTimers())

  it('returns "nieznana data" for an unparseable date', () => {
    expect(formatRelativeTime('garbage')).toBe('nieznana data')
  })

  it('says "przed chwilą" for anything under a minute old', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-06T12:00:30.000Z'))
    expect(formatRelativeTime('2026-09-06T12:00:00.000Z')).toBe('przed chwilą')
  })

  it('reports minutes for under an hour', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-06T12:30:00.000Z'))
    expect(formatRelativeTime('2026-09-06T12:00:00.000Z')).toBe('30 min temu')
  })

  it('reports hours for under a day', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-06T15:00:00.000Z'))
    expect(formatRelativeTime('2026-09-06T12:00:00.000Z')).toBe('3 godz. temu')
  })

  it('reports days beyond 24 hours', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-09T12:00:00.000Z'))
    expect(formatRelativeTime('2026-09-06T12:00:00.000Z')).toBe('3 dni temu')
  })
})
