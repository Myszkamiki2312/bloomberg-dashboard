'use client'
import useSWR from 'swr'
import { clsx } from 'clsx'
import type { MarketSummary } from '@/types'
import TerminalCard from '@/components/ui/TerminalCard'

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

const SENTIMENT_CONFIG = {
  bullish: { label: '▲ BYCZY', color: 'text-[#00ff41]', barColor: 'bg-[#00ff41]' },
  bearish: { label: '▼ NIEDŹWIEDZI', color: 'text-[#ff0040]', barColor: 'bg-[#ff0040]' },
  neutral: { label: '◆ NEUTRALNY', color: 'text-[#ffaa00]', barColor: 'bg-[#ffaa00]' },
}

export default function AIMarketSummary() {
  const { data, isLoading, error } = useSWR<MarketSummary>('/api/ai-summary', fetcher, {
    refreshInterval: 300000,
    revalidateOnFocus: false,
  })

  const sentiment = (data?.sentiment ?? 'neutral') as keyof typeof SENTIMENT_CONFIG
  const cfg = SENTIMENT_CONFIG[sentiment] ?? SENTIMENT_CONFIG.neutral

  return (
    <TerminalCard
      title="AI — Podsumowanie rynku"
      badge={data?.isDemo ? 'DEMO' : 'AI'}
      badgeColor={data?.isDemo ? 'amber' : 'cyan'}
      className="h-full"
    >
      {isLoading ? (
        <div className="p-3 flex items-center gap-2 text-[11px] text-[#555]">
          <span className="blink text-[#00ff41]">█</span>
          Analizuję rynek...
        </div>
      ) : error && !data ? (
        <div className="p-3 flex flex-col gap-1 text-[11px]">
          <span className="text-[#ff0040]">⚠ Błąd ładowania podsumowania AI</span>
          <span className="text-[#444] text-[10px]">{error.message ?? 'Sprawdź klucze API (GROQ_API_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY)'}</span>
        </div>
      ) : data ? (
        <div className="flex flex-col gap-0 overflow-auto">
          <div className="px-3 py-1 border-b border-[#1c1c1c] text-[9px] text-[#555] flex items-center justify-between gap-2">
            <span className={data.isDemo ? 'text-[#ffaa00]' : 'text-[#00cccc]'}>
              {data.isDemo ? 'Podsumowanie regułowe — bez modelu AI' : 'Analiza uziemiona w snapshotcie notowań'}
            </span>
            <span title={new Date(data.timestamp).toLocaleString('pl-PL')}>
              {new Date(data.timestamp).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div className="px-3 py-2 border-b border-[#1c1c1c]">
            <div className="flex items-center justify-between mb-1.5">
              <span className={clsx('text-sm font-bold', cfg.color)}>{cfg.label}</span>
              <span className="text-[#555] text-[10px]">Indeks sentymentu: {data.sentimentScore}/100</span>
            </div>
            <div className="h-1.5 bg-[#111] rounded-full overflow-hidden">
              <div
                className={clsx('h-full transition-all', cfg.barColor)}
                style={{ width: `${Math.max(0, Math.min(100, data.sentimentScore))}%` }}
              />
            </div>
          </div>

          <div className="px-3 py-2 border-b border-[#1c1c1c]">
            <p className="text-[11px] text-[#c8c8c8] leading-relaxed">{data.summary}</p>
          </div>

          <div className="px-3 py-2 border-b border-[#1c1c1c]">
            <div className="text-[10px] text-[#ffaa00] uppercase tracking-widest mb-1.5">Kluczowe punkty</div>
            <ul className="flex flex-col gap-1">
              {(data.keyPoints ?? []).map((point, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[11px]">
                  <span className="text-[#00ff41] shrink-0 mt-0.5">›</span>
                  <span className="text-[#c8c8c8]">{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {data.sectors && (
            <div className="px-3 py-2">
              <div className="text-[10px] text-[#ffaa00] uppercase tracking-widest mb-1.5">Sektory</div>
              <div className="flex flex-col gap-1">
                {data.sectors.map(sector => {
                  const perf = Number(sector.performance) || 0
                  // Scale: ±3% performance → ±50% of track — fits typical daily sector moves
                  const pct = Math.min(Math.abs(perf) * (50 / 3), 50)
                  const pos = perf >= 0
                  return (
                  <div key={sector.name} className="flex items-center gap-2">
                    <span className="text-[10px] text-[#c8c8c8] w-24 shrink-0 truncate">{sector.name}</span>
                    <div className="flex-1 h-2 bg-[#111] relative overflow-hidden">
                      {/* center divider */}
                      <div className="absolute top-0 bottom-0 w-px bg-[#333]" style={{ left: '50%' }} />
                      {/* bar — grows from center outward, never overlaps text */}
                      <div
                        className={pos ? 'absolute top-0 bottom-0 bg-[#00ff41]' : 'absolute top-0 bottom-0 bg-[#ff0040]'}
                        style={pos
                          ? { left: '50%', width: `${pct}%` }
                          : { right: '50%', width: `${pct}%` }
                        }
                      />
                    </div>
                    <span className={clsx('text-[10px] font-mono w-12 text-right shrink-0', pos ? 'text-[#00ff41]' : 'text-[#ff0040]')}>
                      {pos ? '+' : ''}{perf.toFixed(1)}%
                    </span>
                  </div>
                  )
                })}
              </div>
            </div>
          )}
          {data.source && (
            <div className="px-3 py-1 border-t border-[#1c1c1c] text-[9px] text-[#444]">
              Źródło: {data.source}
            </div>
          )}
        </div>
      ) : (
        <div className="p-3 text-[#555] text-xs">Nie udało się załadować podsumowania.</div>
      )}
    </TerminalCard>
  )
}
