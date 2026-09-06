import { describe, it, expect } from 'vitest'
import { cleanBars, formatChartDate, timeKey, nearestBarTime } from './chartHelpers'
import type { OHLCBar } from '@/types'
import type { Time } from 'lightweight-charts'

const bar = (time: string, close: number, overrides: Partial<OHLCBar> = {}): OHLCBar => ({
  time,
  open: close,
  high: close,
  low: close,
  close,
  ...overrides,
})

describe('cleanBars', () => {
  it('returns an empty array for empty input', () => {
    expect(cleanBars([])).toEqual([])
  })

  it('sorts bars into ascending chronological order', () => {
    const result = cleanBars([bar('2026-01-03', 10), bar('2026-01-01', 10), bar('2026-01-02', 10)])
    expect(result.map(b => b.time)).toEqual(['2026-01-01', '2026-01-02', '2026-01-03'])
  })

  it('keeps only the last bar when the same date appears more than once', () => {
    const result = cleanBars([bar('2026-01-01', 10), bar('2026-01-01', 99)])
    expect(result).toHaveLength(1)
    expect(result[0].close).toBe(99)
  })

  it('drops bars with a non-finite or non-positive close', () => {
    const result = cleanBars([
      bar('2026-01-01', 10),
      bar('2026-01-02', NaN),
      bar('2026-01-03', 0),
      bar('2026-01-04', -5),
      bar('2026-01-05', 12),
    ])
    expect(result.map(b => b.time)).toEqual(['2026-01-01', '2026-01-05'])
  })

  it('filters out a bar that deviates more than 80% from the median (bad tick)', () => {
    const bars = [
      bar('2026-01-01', 100),
      bar('2026-01-02', 102),
      bar('2026-01-03', 98),
      bar('2026-01-04', 101),
      bar('2026-01-05', 99),
      bar('2026-01-06', 5000), // clearly a bad data point
    ]
    const result = cleanBars(bars)
    expect(result.some(b => b.close === 5000)).toBe(false)
    expect(result).toHaveLength(5)
  })

  it('keeps bars within the median tolerance band', () => {
    const bars = [bar('2026-01-01', 100), bar('2026-01-02', 150), bar('2026-01-03', 400)]
    // median = 150; band is [30, 750] -- all three should survive
    expect(cleanBars(bars)).toHaveLength(3)
  })

  it('returns an empty array when every bar is filtered out as invalid', () => {
    expect(cleanBars([bar('2026-01-01', 0), bar('2026-01-02', -1)])).toEqual([])
  })
})

describe('formatChartDate', () => {
  it('formats a BusinessDay object', () => {
    const result = formatChartDate({ year: 2026, month: 9, day: 6 })
    const expected = new Date(Date.UTC(2026, 8, 6)).toLocaleDateString('pl-PL', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    })
    expect(result).toBe(expected)
  })

  it('formats a UTC timestamp (seconds)', () => {
    const seconds = Math.floor(new Date('2026-09-06T12:00:00.000Z').getTime() / 1000)
    const result = formatChartDate(seconds as Time)
    const expected = new Date(seconds * 1000).toLocaleDateString('pl-PL', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    })
    expect(result).toBe(expected)
  })
})

describe('timeKey', () => {
  it('slices a full ISO string down to just the date', () => {
    expect(timeKey('2026-09-06T12:00:00.000Z')).toBe('2026-09-06')
  })

  it('leaves a plain YYYY-MM-DD string untouched', () => {
    expect(timeKey('2026-09-06')).toBe('2026-09-06')
  })

  it('zero-pads a BusinessDay object into YYYY-MM-DD', () => {
    expect(timeKey({ year: 2026, month: 1, day: 5 })).toBe('2026-01-05')
  })

  it('does not zero-pad the year, only month/day', () => {
    expect(timeKey({ year: 2026, month: 12, day: 31 })).toBe('2026-12-31')
  })

  it('converts a UTC timestamp (seconds) to the matching date key', () => {
    const seconds = Math.floor(new Date('2026-09-06T12:00:00.000Z').getTime() / 1000)
    expect(timeKey(seconds as Time)).toBe('2026-09-06')
  })

  it('produces the same key for a bar-time string and the equivalent BusinessDay object', () => {
    expect(timeKey('2026-03-15')).toBe(timeKey({ year: 2026, month: 3, day: 15 }))
  })
})

describe('nearestBarTime', () => {
  const bars = [bar('2026-01-01', 10), bar('2026-01-05', 10), bar('2026-01-10', 10)]

  it('returns null for an empty bar list', () => {
    expect(nearestBarTime([], Date.now())).toBeNull()
  })

  it('returns the exact bar when the target matches it precisely', () => {
    const target = new Date('2026-01-05').getTime()
    expect(nearestBarTime(bars, target)).toBe('2026-01-05')
  })

  it('picks whichever bar is chronologically closest', () => {
    const target = new Date('2026-01-04').getTime() // 3 days from Jan1, 1 day from Jan5
    expect(nearestBarTime(bars, target)).toBe('2026-01-05')
  })

  it('breaks a tie by keeping the earliest-found bar (first closest wins)', () => {
    const target = new Date('2026-01-03').getTime() // exactly 2 days from both Jan1 and Jan5
    expect(nearestBarTime(bars, target)).toBe('2026-01-01')
  })

  it('returns null when the closest bar is more than 2 days away', () => {
    const target = new Date('2026-06-01').getTime()
    expect(nearestBarTime(bars, target)).toBeNull()
  })

  it('returns a bar exactly 2 days away (inclusive boundary)', () => {
    const target = new Date('2026-01-03').getTime() // exactly 2 days from 2026-01-01
    expect(nearestBarTime([bar('2026-01-01', 10)], target)).toBe('2026-01-01')
  })
})
