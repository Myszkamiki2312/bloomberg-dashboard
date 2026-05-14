'use client'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels'
import { clsx } from 'clsx'
import StatusBar from '@/components/ui/StatusBar'
import Ticker from '@/components/ui/Ticker'
import FunctionBar from '@/components/ui/FunctionBar'
import NewsTickerBar from '@/components/ui/NewsTickerBar'
import KeyboardShortcuts from '@/components/ui/KeyboardShortcuts'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import SmallScreenWarning from '@/components/ui/SmallScreenWarning'

const Watchlist       = dynamic(() => import('@/components/watchlist/Watchlist'),      { ssr: false })
const CandlestickChart= dynamic(() => import('@/components/chart/CandlestickChart'),  { ssr: false })
const NewsPanel       = dynamic(() => import('@/components/news/NewsPanel'),            { ssr: false })
const EconomicCalendar= dynamic(() => import('@/components/calendar/EconomicCalendar'),{ ssr: false })
const PriceAlerts     = dynamic(() => import('@/components/alerts/PriceAlerts'),       { ssr: false })
const AIMarketSummary = dynamic(() => import('@/components/ai/AIMarketSummary'),       { ssr: false })
const MarketScreener  = dynamic(() => import('@/components/screener/MarketScreener'),  { ssr: false })
const MarketOverview  = dynamic(() => import('@/components/market/MarketOverview'),    { ssr: false })

const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

const Handle = ({ direction = 'vertical' }: { direction?: 'vertical' | 'horizontal' }) => {
  const isVert = direction === 'vertical'
  return (
    <PanelResizeHandle
      className={clsx(
        'group relative flex items-center justify-center transition-colors shrink-0',
        'bg-[#0d0d0d] hover:bg-[#1a1a1a]',
        isVert ? 'w-2 cursor-col-resize' : 'h-2 cursor-row-resize'
      )}
    >
      {/* visible grip line */}
      <div className={clsx(
        'transition-colors rounded-full',
        isVert
          ? 'w-px h-8 group-hover:bg-[#00ff41] bg-[#2a2a2a]'
          : 'h-px w-8 group-hover:bg-[#00ff41] bg-[#2a2a2a]'
      )} />
      {/* dots indicator */}
      <div className={clsx(
        'absolute flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity',
        isVert ? 'flex-col' : 'flex-row'
      )}>
        {[0,1,2].map(i => (
          <div key={i} className="w-0.5 h-0.5 rounded-full bg-[#00ff41]" />
        ))}
      </div>
    </PanelResizeHandle>
  )
}

const PANEL_IDS: Record<string, string> = {
  'Watchlista': 'p-watchlista', 'Wykres': 'p-wykres',
  'Wiadomości': 'p-wiadomosci', 'Screener': 'p-screener',
  'Alerty': 'p-alerty', 'Kalendarz': 'p-kalendarz',
  'AI Podsumowanie': 'p-ai', 'Rynek Globalny': 'p-rynek',
}

const P = ({ children, label }: { children: React.ReactNode; label: string }) => (
  <div id={PANEL_IDS[label] ?? `p-${label}`} className="overflow-hidden bg-[#080808] h-full">
    <ErrorBoundary label={label}>{children}</ErrorBoundary>
  </div>
)

export default function Home() {
  const [showShortcuts, setShowShortcuts] = useState(false)

  useEffect(() => {
    const FN_MAP: Record<string, string> = {
      F1: 'p-watchlista', F2: 'p-wykres',    F3: 'p-wiadomosci',
      F4: 'p-screener',   F5: 'p-alerty',    F6: 'p-kalendarz',
      F7: 'p-ai',         F8: 'p-rynek',
    }
    const handler = (e: KeyboardEvent) => {
      if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        setShowShortcuts(s => !s)
      }
      if (e.key === 'Escape') setShowShortcuts(false)
      if (FN_MAP[e.key]) {
        e.preventDefault()
        const el = document.getElementById(FN_MAP[e.key])
        if (el) {
          el.classList.remove('panel-fn-flash')
          void el.offsetWidth
          el.classList.add('panel-fn-flash')
          setTimeout(() => el.classList.remove('panel-fn-flash'), 800)
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <>
      <SmallScreenWarning />
      {showShortcuts && <KeyboardShortcuts onClose={() => setShowShortcuts(false)} />}

      <div className="flex flex-col h-screen overflow-hidden bg-[#080808]">
        <StatusBar isDemo={isDemo} />
        <Ticker />

        {/* ── Outer vertical split: main ↕ bottom strip ── */}
        <PanelGroup direction="vertical" className="flex-1 min-h-0" id="outer-layout">

          {/* Main area */}
          <Panel defaultSize={72} minSize={40}>
            <PanelGroup direction="horizontal" className="h-full" id="main-layout">
              <Panel defaultSize={14} minSize={8} maxSize={30}>
                <P label="Watchlista"><Watchlist /></P>
              </Panel>
              <Handle direction="vertical" />
              <Panel defaultSize={68} minSize={40}>
                <PanelGroup direction="vertical" id="center-layout">
                  <Panel defaultSize={60} minSize={25}>
                    <P label="Wykres"><CandlestickChart /></P>
                  </Panel>
                  <Handle direction="horizontal" />
                  <Panel defaultSize={40} minSize={20}>
                    <PanelGroup direction="horizontal" id="bottom-center-layout">
                      <Panel defaultSize={50} minSize={25}>
                        <P label="AI Podsumowanie"><AIMarketSummary /></P>
                      </Panel>
                      <Handle direction="vertical" />
                      <Panel defaultSize={50} minSize={25}>
                        <P label="Rynek Globalny"><MarketOverview /></P>
                      </Panel>
                    </PanelGroup>
                  </Panel>
                </PanelGroup>
              </Panel>
              <Handle direction="vertical" />
              <Panel defaultSize={18} minSize={10} maxSize={35}>
                <P label="Wiadomości"><NewsPanel /></P>
              </Panel>
            </PanelGroup>
          </Panel>

          <Handle direction="horizontal" />

          {/* Bottom strip */}
          <Panel defaultSize={28} minSize={10} maxSize={55}>
            <PanelGroup direction="horizontal" className="h-full" id="bottom-layout">
              <Panel defaultSize={40} minSize={20}>
                <P label="Screener"><MarketScreener /></P>
              </Panel>
              <Handle direction="vertical" />
              <Panel defaultSize={35} minSize={20}>
                <P label="Kalendarz"><EconomicCalendar /></P>
              </Panel>
              <Handle direction="vertical" />
              <Panel defaultSize={25} minSize={15}>
                <P label="Alerty"><PriceAlerts /></P>
              </Panel>
            </PanelGroup>
          </Panel>

        </PanelGroup>

        <NewsTickerBar />
        <FunctionBar onHelpOpen={() => setShowShortcuts(true)} />
      </div>
    </>
  )
}
