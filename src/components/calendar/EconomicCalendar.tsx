'use client'
import useSWR from 'swr'
import { clsx } from 'clsx'
import type { EconomicEvent } from '@/types'
import TerminalCard from '@/components/ui/TerminalCard'
import { formatDate } from '@/lib/utils/formatters'
import { SkeletonBlock } from '@/components/ui/Skeleton'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const IMPORTANCE_CONFIG = {
  high: { label: '●●●', color: 'text-[#ff0040]' },
  medium: { label: '●●○', color: 'text-[#ffaa00]' },
  low: { label: '●○○', color: 'text-[#555]' },
}

export default function EconomicCalendar() {
  const { data: events = [], isLoading, error } = useSWR<EconomicEvent[]>('/api/calendar', fetcher, {
    refreshInterval: 3600000,
    revalidateOnFocus: false,
  })

  const grouped = events.reduce<Record<string, EconomicEvent[]>>((acc, ev) => {
    if (!acc[ev.date]) acc[ev.date] = []
    acc[ev.date].push(ev)
    return acc
  }, {})
  // Sort days chronologically (ISO date strings sort correctly as strings)
  const sortedDays = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b))
  sortedDays.forEach(([, day]) => day.sort((a, b) => a.time.localeCompare(b.time)))

  return (
    <TerminalCard title="Kalendarz ekonomiczny" badge="DEMO" badgeColor="muted" className="h-full">
      {isLoading && events.length === 0 ? (
        <SkeletonBlock rows={6} cols={3} />
      ) : error ? (
        <div className="flex items-center justify-center p-4 text-[10px] text-[#ff0040]">
          ⚠ Błąd ładowania kalendarza
        </div>
      ) : events.length === 0 ? (
        <div className="p-3 text-[#555] text-[11px]">Brak wydarzeń ekonomicznych.</div>
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
                <div key={event.id} className="px-3 py-1.5 hover:bg-[#111] transition-colors">
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
                            Actual:{' '}
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
