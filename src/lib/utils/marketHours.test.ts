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

  it('recognizes Good Friday (a moving holiday derived from Easter, not a fixed date)', () => {
    // Independently computed via the standard Meeus/Jones/Butcher Easter algorithm:
    // Easter 2026 = April 5 -> Good Friday = April 3, 2026 (confirmed Friday).
    expect(getNyseSession(new Date('2026-04-03T15:00:00Z'))).toBe('holiday')
  })

  it('recognizes MLK Day (3rd Monday of January)', () => {
    // 2026-01-19 is a Monday and the 3rd Monday of January 2026
    expect(getNyseSession(new Date('2026-01-19T15:00:00Z'))).toBe('holiday')
  })

  it('recognizes Presidents Day (3rd Monday of February)', () => {
    // 2026-02-16 is a Monday and the 3rd Monday of February 2026
    expect(getNyseSession(new Date('2026-02-16T15:00:00Z'))).toBe('holiday')
  })

  it('recognizes Memorial Day (last Monday of May)', () => {
    // 2026-05-25 is a Monday and the last one in May 2026
    expect(getNyseSession(new Date('2026-05-25T15:00:00Z'))).toBe('holiday')
  })

  it('recognizes Labor Day (1st Monday of September)', () => {
    // 2026-09-07 is a Monday and the 1st Monday of September 2026
    expect(getNyseSession(new Date('2026-09-07T15:00:00Z'))).toBe('holiday')
  })

  it('recognizes Juneteenth on its literal date when it falls on a weekday', () => {
    // 2026-06-19 is a Friday -- no weekend shift needed
    expect(getNyseSession(new Date('2026-06-19T15:00:00Z'))).toBe('holiday')
  })

  it('flips from pre-market to open exactly at the 9:30 EST opening bell', () => {
    expect(getNyseSession(new Date('2026-01-02T14:29:00Z'))).toBe('pre-market') // 9:29 EST
    expect(getNyseSession(new Date('2026-01-02T14:30:00Z'))).toBe('open')       // 9:30 EST
  })

  it('flips from open to after-hours exactly at the 16:00 EST closing bell', () => {
    expect(getNyseSession(new Date('2026-01-02T20:59:00Z'))).toBe('open')        // 15:59 EST
    expect(getNyseSession(new Date('2026-01-02T21:00:00Z'))).toBe('after-hours') // 16:00 EST
  })

  it('flips from closed to pre-market exactly at 4:00 EST', () => {
    expect(getNyseSession(new Date('2026-01-02T08:59:00Z'))).toBe('closed')     // 3:59 EST
    expect(getNyseSession(new Date('2026-01-02T09:00:00Z'))).toBe('pre-market') // 4:00 EST
  })

  it('flips from after-hours to closed exactly at 20:00 EST', () => {
    expect(getNyseSession(new Date('2026-01-03T00:59:00Z'))).toBe('after-hours') // 19:59 EST (still Fri in NY)
    expect(getNyseSession(new Date('2026-01-03T01:00:00Z'))).toBe('closed')      // 20:00 EST
  })
})
