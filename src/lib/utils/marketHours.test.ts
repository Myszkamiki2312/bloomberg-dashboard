import { describe, it, expect } from 'vitest'
import { getNyseSession } from './marketHours'

// All times below are verified real calendar dates (checked with `date`),
// not hand-computed weekdays -- avoids a wrong "expected" value from a
// manual day-of-week slip.
describe('getNyseSession', () => {
  it('is open during regular trading hours on an ordinary weekday', () => {
    // 2026-01-02 is a Friday, not a holiday. 10:00 EST = 15:00 UTC.
    expect(getNyseSession(new Date('2026-01-02T15:00:00Z'))).toBe('open')
  })

  it('is pre-market before the opening bell', () => {
    // 06:00 EST = 11:00 UTC
    expect(getNyseSession(new Date('2026-01-02T11:00:00Z'))).toBe('pre-market')
  })

  it('is after-hours past the closing bell', () => {
    // 17:00 EST = 22:00 UTC
    expect(getNyseSession(new Date('2026-01-02T22:00:00Z'))).toBe('after-hours')
  })

  it('is closed late at night', () => {
    // 02:00 EST = 07:00 UTC
    expect(getNyseSession(new Date('2026-01-02T07:00:00Z'))).toBe('closed')
  })

  it('is closed on a weekend regardless of time', () => {
    // 2026-01-03 is a Saturday
    expect(getNyseSession(new Date('2026-01-03T15:00:00Z'))).toBe('closed')
  })

  it('recognizes a fixed holiday (New Year\'s Day)', () => {
    // 2026-01-01 is a Thursday -- falls on its literal date, no weekend shift
    expect(getNyseSession(new Date('2026-01-01T15:00:00Z'))).toBe('holiday')
  })

  it('recognizes an nth-weekday holiday (Thanksgiving, 4th Thursday of November)', () => {
    // 2026-11-26 is a Thursday and is the 4th Thursday of November 2026
    expect(getNyseSession(new Date('2026-11-26T15:00:00Z'))).toBe('holiday')
  })

  it('observes Independence Day on the preceding Friday when July 4 falls on a Saturday', () => {
    // July 4, 2026 is a Saturday -- NYSE observes it Friday July 3 instead.
    // 10:00 EDT = 14:00 UTC (summer, UTC-4)
    expect(getNyseSession(new Date('2026-07-03T14:00:00Z'))).toBe('holiday')
    // The actual Saturday is just closed for being a weekend, not double-counted.
    expect(getNyseSession(new Date('2026-07-04T14:00:00Z'))).toBe('closed')
  })
})
