import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchEconomicCalendar } from './economicCalendar'

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as Response
}

function tvEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    title: 'Inflation Rate YoY',
    country: 'US',
    date: new Date().toISOString(),
    actual: 3.1,
    forecast: 3.0,
    previous: 2.9,
    unit: '%',
    importance: 1,
    ...overrides,
  }
}

describe('fetchEconomicCalendar', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('parses, translates, and formats a well-formed event', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse({ status: 'ok', result: [tvEvent()] })
    )
    const events = await fetchEconomicCalendar()
    expect(events).toHaveLength(1)
    const e = events[0]
    expect(e.event).toBe('Inflacja r/r')
    expect(e.country).toBe('US')
    expect(e.flag).toBe('🇺🇸')
    expect(e.importance).toBe('high')
    expect(e.actual).toBe('3,1%')
    expect(e.forecast).toBe('3%')
    expect(e.previous).toBe('2,9%')
    expect(e.quality).toBe('delayed')
    expect(e.id).toBe('tv-1')
  })

  it('maps importance 0 to medium and anything else to low', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse({
        status: 'ok',
        result: [
          tvEvent({ id: 2, importance: 0, title: 'Retail Sales' }),
          tvEvent({ id: 3, importance: null, title: 'Retail Sales' }),
        ],
      })
    )
    const events = await fetchEconomicCalendar()
    const byId = Object.fromEntries(events.map(e => [e.id, e]))
    expect(byId['tv-2'].importance).toBe('medium')
    expect(byId['tv-3'].importance).toBe('low')
  })

  it('falls back to a globe flag for an unmapped country', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse({ status: 'ok', result: [tvEvent({ country: 'BR' })] })
    )
    const events = await fetchEconomicCalendar()
    expect(events[0].flag).toBe('🌐')
  })

  it('skips events missing a title, country, or date', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse({
        status: 'ok',
        result: [
          tvEvent({ title: undefined }),
          tvEvent({ country: undefined }),
          tvEvent({ date: undefined }),
        ],
      })
    )
    const events = await fetchEconomicCalendar()
    expect(events).toEqual([])
  })

  it('skips an event with an unparseable date', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse({ status: 'ok', result: [tvEvent({ date: 'not-a-date' })] })
    )
    const events = await fetchEconomicCalendar()
    expect(events).toEqual([])
  })

  it('omits actual/forecast/previous fields entirely when null', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse({ status: 'ok', result: [tvEvent({ actual: null, forecast: null, previous: null })] })
    )
    const events = await fetchEconomicCalendar()
    expect(events[0].actual).toBeUndefined()
    expect(events[0].forecast).toBeUndefined()
    expect(events[0].previous).toBeUndefined()
  })

  it('formats a currency-unit value with the symbol prefixed, no space', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse({ status: 'ok', result: [tvEvent({ actual: 1200, unit: '$', scale: 'M' })] })
    )
    const events = await fetchEconomicCalendar()
    expect(events[0].actual).toBe('$1200M')
  })

  it('sorts events within a day by importance (high first), then time', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse({
        status: 'ok',
        result: [
          tvEvent({ id: 'low', importance: -1, title: 'A' }),
          tvEvent({ id: 'high', importance: 1, title: 'B' }),
        ],
      })
    )
    const events = await fetchEconomicCalendar()
    expect(events[0].id).toBe('tv-high')
    expect(events[1].id).toBe('tv-low')
  })

  it('throws when the HTTP response is not ok', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse({}, false, 503))
    await expect(fetchEconomicCalendar()).rejects.toThrow('TradingView calendar 503')
  })

  it('throws when the response status field is not "ok"', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse({ status: 'error', result: [] }))
    await expect(fetchEconomicCalendar()).rejects.toThrow('unexpected response format')
  })

  it('throws when the result field is missing or not an array', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse({ status: 'ok', result: {} }))
    await expect(fetchEconomicCalendar()).rejects.toThrow('unexpected response format')
  })

  it('clamps the requested day range between 1 and 14 days', async () => {
    const mockFetch = fetch as ReturnType<typeof vi.fn>
    mockFetch.mockResolvedValue(jsonResponse({ status: 'ok', result: [] }))
    await fetchEconomicCalendar(999)
    const calledUrl = mockFetch.mock.calls[0][0] as URL
    const from = new Date(calledUrl.searchParams.get('from')!)
    const to = new Date(calledUrl.searchParams.get('to')!)
    const spanDays = Math.round((to.getTime() - from.getTime()) / 86_400_000)
    expect(spanDays).toBe(15) // 14 full days + the to-day's 23:59:59.999 end
  })
})

describe('fetchEconomicCalendar when disabled via env flag', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('returns an empty array without calling fetch', async () => {
    vi.stubGlobal('fetch', vi.fn())
    vi.stubEnv('TRADINGVIEW_UNOFFICIAL_ENABLED', 'false')
    vi.resetModules()
    const { fetchEconomicCalendar: fetchDisabled } = await import('./economicCalendar')
    const events = await fetchDisabled()
    expect(events).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })
})
