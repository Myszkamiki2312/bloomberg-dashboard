'use client'
import { useState } from 'react'
import useSWR from 'swr'
import { clsx } from 'clsx'
import type { EconomicEvent } from '@/types'
import TerminalCard from '@/components/ui/TerminalCard'
import { formatDate } from '@/lib/utils/formatters'
import { SkeletonBlock } from '@/components/ui/Skeleton'

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

const IMPORTANCE_CONFIG = {
  high: { label: '●●●', color: 'text-[#ff0040]' },
  medium: { label: '●●○', color: 'text-[#ffaa00]' },
  low: { label: '●○○', color: 'text-[#555]' },
}

const COUNTRY_LABELS: Record<string, string> = {
  US: 'USA', EU: 'Strefa euro', PL: 'Polska', GB: 'Wielka Brytania',
  DE: 'Niemcy', JP: 'Japonia', CN: 'Chiny',
}

export default function EconomicCalendar() {
  const [countryFilter, setCountryFilter] = useState('ALL')
  const [importanceFilter, setImportanceFilter] = useState<'all' | EconomicEvent['importance']>('all')
  const { data: events = [], isLoading, error } = useSWR<EconomicEvent[]>('/api/calendar', fetcher, {
    refreshInterval: 3600000,
    revalidateOnFocus: false,
  })

  const countries = [...new Set(events.map(event => event.country))].sort()
  const visibleEvents = events.filter(event =>
    (countryFilter === 'ALL' || event.country === countryFilter)
    && (importanceFilter === 'all' || event.importance === importanceFilter)
  )
  const grouped = visibleEvents.reduce<Record<string, EconomicEvent[]>>((acc, ev) => {
    if (!acc[ev.date]) acc[ev.date] = []
    acc[ev.date].push(ev)
    return acc
  }, {})
  // Sort days chronologically (ISO date strings sort correctly as strings)
  const sortedDays = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b))
  sortedDays.forEach(([, day]) => day.sort((a, b) => a.time.localeCompare(b.time)))
  const hasDemoData = events.some(event => event.quality === 'demo')
  const calendarBadge = events.length === 0 ? 'ŁADOWANIE' : hasDemoData ? 'DEMO' : 'BIEŻĄCE'

  return (
    <TerminalCard
      title="Kalendarz ekonomiczny"
      badge={calendarBadge}
      badgeColor={hasDemoData ? 'muted' : events.length ? 'cyan' : 'muted'}
      className="h-full"
    >
      <div className={clsx(
        'px-3 py-1 border-b border-[#1c1c1c] text-[9px]',
        hasDemoData ? 'text-[#ffaa00]' : 'text-[#555]'
      )}>
        {hasDemoData
          ? 'Fallback demonstracyjny · harmonogram nie jest aktualnym kalendarzem'
          : 'TradingView Economic Calendar — nieoficjalne · czas Europe/Warsaw · aktualizacja co 15 min'}
      </div>
      <div className="flex items-center gap-1 px-2 py-1 border-b border-[#1c1c1c] bg-[#050505] text-[9px]">
        <select
          value={countryFilter}
          onChange={event => setCountryFilter(event.target.value)}
          className="bg-black border border-[#2a2a2a] text-[#888] px-1 py-0.5 outline-none focus:border-[#ffaa00] max-w-32"
          aria-label="Filtr kraju"
        >
          <option value="ALL">Wszystkie kraje</option>
          {countries.map(country => (
            <option key={country} value={country}>{COUNTRY_LABELS[country] ?? country}</option>
          ))}
        </select>
        {(['all', 'high', 'medium', 'low'] as const).map(importance => (
          <button
            key={importance}
            type="button"
            onClick={() => setImportanceFilter(importance)}
            className={clsx(
              'border px-1.5 py-0.5 transition-colors',
              importanceFilter === importance
                ? 'border-[#ffaa00] text-[#ffaa00]'
                : 'border-[#222] text-[#444] hover:text-[#888]'
            )}
            aria-pressed={importanceFilter === importance}
          >
            {importance === 'all' ? 'WSZ.' : IMPORTANCE_CONFIG[importance].label}
          </button>
        ))}
        <span className="text-[#444] ml-auto">{visibleEvents.length}/{events.length}</span>
      </div>
      {isLoading && events.length === 0 ? (
        <SkeletonBlock rows={6} cols={3} />
      ) : error ? (
        <div className="flex items-center justify-center p-4 text-[10px] text-[#ff0040]">
          ⚠ Błąd ładowania kalendarza
        </div>
      ) : visibleEvents.length === 0 ? (
        <div className="p-3 text-[#555] text-[11px]">Brak wydarzeń dla wybranych filtrów.</div>
      ) : (
      <div className="flex flex-col divide-y divide-[#1c1c1c]">
        {sortedDays.map(([date, dayEvents]) => (
          <div key={date}>
            <div className="px-3 py-1 bg-black text-[10px] text-[#ffaa00] font-bold uppercase tracking-widest sticky top-0">
              {formatDate(date)}
            </div>
            {dayEvents.map(event => {
              const imp = IMPORTANCE_CONFIG[event.importance] ?? IMPORTANCE_CONFIG.low
              const hasActual = event.actual != null
              return (
                <div
                  key={event.id}
                  className="px-3 py-1.5 hover:bg-[#111] transition-colors"
                  title={event.source}
                >
                  <div className="flex items-start gap-2">
                    <span className={clsx('text-[10px] font-mono shrink-0 mt-0.5', imp.color)}>
                      {imp.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[11px]">{event.flag}</span>
                        <span className="text-[#555] text-[10px]">{event.time}</span>
                        <span className="text-[#c8c8c8] text-[11px] truncate">{event.event}</span>
                      </div>
                      <div className="flex gap-3 text-[10px]">
                        {event.forecast && (
                          <span className="text-[#555]">
                            Prognoza: <span className="text-[#c8c8c8]">{event.forecast}</span>
                          </span>
                        )}
                        {event.previous && (
                          <span className="text-[#555]">
                            Poprz.: <span className="text-[#c8c8c8]">{event.previous}</span>
                          </span>
                        )}
                        {hasActual && (
                          <span className="text-[#555]">
                            Odczyt:{' '}
                            <span className={clsx(
                              'font-bold',
                              (() => {
                                const a = parseFloat(event.actual ?? '')
                                const f = parseFloat(event.forecast ?? '')
                                if (!isNaN(a) && !isNaN(f)) return a > f ? 'text-[#00ff41]' : 'text-[#ff0040]'
                                return 'text-[#c8c8c8]'
                              })()
                            )}>
                              {event.actual}
                            </span>
                          </span>
                        )}
                      </div>
                      {event.sourceUrl && (
                        <a
                          href={event.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[9px] text-[#333] hover:text-[#00cccc] transition-colors"
                        >
                          źródło ↗
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
      )}
    </TerminalCard>
  )
}
