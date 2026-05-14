'use client'
import useSWR from 'swr'
import { clsx } from 'clsx'
import type { EconomicEvent } from '@/types'
import TerminalCard from '@/components/ui/TerminalCard'
import { formatDate } from '@/lib/utils/formatters'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const IMPORTANCE_CONFIG = {
  high: { label: '●●●', color: 'text-terminal-red' },
  medium: { label: '●●○', color: 'text-terminal-amber' },
  low: { label: '●○○', color: 'text-terminal-muted' },
}

export default function EconomicCalendar() {
  const { data: events = [] } = useSWR<EconomicEvent[]>('/api/calendar', fetcher, {
    refreshInterval: 3600000,
  })

  const grouped = events.reduce<Record<string, EconomicEvent[]>>((acc, ev) => {
    if (!acc[ev.date]) acc[ev.date] = []
    acc[ev.date].push(ev)
    return acc
  }, {})

  return (
    <TerminalCard title="Kalendarz ekonomiczny" badge="PLACEHOLDER" badgeColor="amber" className="h-full">
      <div className="flex flex-col divide-y divide-terminal-border overflow-auto">
        {Object.entries(grouped).map(([date, dayEvents]) => (
          <div key={date}>
            <div className="px-3 py-1 bg-black text-[10px] text-terminal-amber font-bold uppercase tracking-widest sticky top-0">
              {formatDate(date)}
            </div>
            {dayEvents.map(event => {
              const imp = IMPORTANCE_CONFIG[event.importance]
              const hasActual = event.actual != null
              return (
                <div key={event.id} className="px-3 py-1.5 hover:bg-terminal-border transition-colors">
                  <div className="flex items-start gap-2">
                    <span className={clsx('text-[10px] font-mono shrink-0 mt-0.5', imp.color)}>
                      {imp.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[11px]">{event.flag}</span>
                        <span className="text-terminal-muted text-[10px]">{event.time}</span>
                        <span className="text-terminal-text text-[11px] truncate">{event.event}</span>
                      </div>
                      <div className="flex gap-3 text-[10px]">
                        {event.forecast && (
                          <span className="text-terminal-muted">
                            Prognoza: <span className="text-terminal-text">{event.forecast}</span>
                          </span>
                        )}
                        {event.previous && (
                          <span className="text-terminal-muted">
                            Poprz.: <span className="text-terminal-text">{event.previous}</span>
                          </span>
                        )}
                        {hasActual && (
                          <span className="text-terminal-muted">
                            Actual:{' '}
                            <span className={clsx(
                              'font-bold',
                              event.actual && event.forecast
                                ? parseFloat(event.actual) > parseFloat(event.forecast)
                                  ? 'text-terminal-green'
                                  : 'text-terminal-red'
                                : 'text-terminal-text'
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
    </TerminalCard>
  )
}
