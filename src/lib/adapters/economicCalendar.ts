import type { EconomicEvent } from '@/types'

const CALENDAR_URL = 'https://economic-calendar.tradingview.com/events'
const ENABLED = process.env.TRADINGVIEW_UNOFFICIAL_ENABLED !== 'false'
const COUNTRIES = ['US', 'EU', 'PL', 'GB', 'DE', 'JP', 'CN']

interface TradingViewCalendarEvent {
  id?: string | number
  title?: string
  country?: string
  actual?: string | number | null
  forecast?: string | number | null
  previous?: string | number | null
  unit?: string | null
  scale?: string | null
  importance?: number | null
  date?: string
  source?: string
  source_url?: string
}

interface TradingViewCalendarResponse {
  status?: string
  result?: TradingViewCalendarEvent[]
}

const FLAG_BY_COUNTRY: Record<string, string> = {
  US: '🇺🇸', EU: '🇪🇺', PL: '🇵🇱', GB: '🇬🇧', DE: '🇩🇪',
  JP: '🇯🇵', CN: '🇨🇳', CA: '🇨🇦', AU: '🇦🇺', CH: '🇨🇭',
}

function warsawDateParts(date: Date): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value ?? ''

  return {
    date: `${value('year')}-${value('month')}-${value('day')}`,
    time: `${value('hour')}:${value('minute')}`,
  }
}

function formatValue(
  value: string | number | null | undefined,
  unit?: string | null,
  scale?: string | null
): string | undefined {
  if (value == null || value === '') return undefined
  const display = typeof value === 'number'
    ? value.toLocaleString('pl-PL', { maximumFractionDigits: 4 })
    : value
  const magnitude = scale ?? ''

  if (!unit) return `${display}${magnitude}`
  if (unit === '%') return `${display}%`
  if (/^[€$£¥]$/.test(unit)) return `${unit}${display}${magnitude}`
  return `${display}${magnitude} ${unit}`
}

function mapImportance(importance?: number | null): EconomicEvent['importance'] {
  if ((importance ?? -1) >= 1) return 'high'
  if (importance === 0) return 'medium'
  return 'low'
}

function parseEvent(event: TradingViewCalendarEvent): EconomicEvent | null {
  if (!event.title || !event.country || !event.date) return null
  const timestamp = new Date(event.date)
  if (Number.isNaN(timestamp.getTime())) return null
  const local = warsawDateParts(timestamp)

  return {
    id: `tv-${event.id ?? `${event.country}-${event.date}-${event.title}`}`,
    date: local.date,
    time: local.time,
    country: event.country,
    flag: FLAG_BY_COUNTRY[event.country] ?? '🌐',
    event: event.title,
    importance: mapImportance(event.importance),
    actual: formatValue(event.actual, event.unit, event.scale),
    forecast: formatValue(event.forecast, event.unit, event.scale),
    previous: formatValue(event.previous, event.unit, event.scale),
    source: `TradingView Economic Calendar — nieoficjalne${event.source ? ` · ${event.source}` : ''}`,
    sourceUrl: event.source_url || 'https://www.tradingview.com/economic-calendar/',
    quality: 'delayed',
  }
}

export async function fetchEconomicCalendar(days = 7): Promise<EconomicEvent[]> {
  if (!ENABLED) return []

  const from = new Date()
  from.setUTCHours(0, 0, 0, 0)
  const to = new Date(from)
  to.setUTCDate(to.getUTCDate() + Math.max(1, Math.min(days, 14)))
  to.setUTCHours(23, 59, 59, 999)

  const url = new URL(CALENDAR_URL)
  url.searchParams.set('from', from.toISOString())
  url.searchParams.set('to', to.toISOString())
  url.searchParams.set('countries', COUNTRIES.join(','))

  const response = await fetch(url, {
    headers: {
      Origin: 'https://www.tradingview.com',
      Referer: 'https://www.tradingview.com/economic-calendar/',
      'User-Agent': 'Mozilla/5.0 Bloomberg-Dashboard/1.0',
    },
    next: { revalidate: 900 },
    signal: AbortSignal.timeout(9000),
  })

  if (!response.ok) throw new Error(`TradingView calendar ${response.status}`)
  const json = await response.json() as TradingViewCalendarResponse
  if (json.status !== 'ok' || !Array.isArray(json.result)) {
    throw new Error('TradingView calendar: unexpected response format')
  }

  return json.result
    .filter(event => event.importance === 0 || (event.importance ?? -1) >= 1 || event.country === 'PL')
    .map(parseEvent)
    .filter((event): event is EconomicEvent => event !== null)
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))
    .slice(0, 60)
}
