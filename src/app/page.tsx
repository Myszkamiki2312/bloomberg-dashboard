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

const Handle = ({ direction = 'vertical' }: { direction?: 'vertical' | 'horizontal' }) => (
  <PanelResizeHandle
    className={clsx(
      'relative flex items-center justify-center transition-colors bg-[#111] hover:bg-[#00ff41]',
      direction === 'vertical' ? 'w-1 cursor-col-resize' : 'h-1 cursor-row-resize'
    )}
  />
)

const P = ({ children, label }: { children: React.ReactNode; label: string }) => (
  <div className="overflow-hidden bg-[#080808] h-full">
    <ErrorBoundary label={label}>{children}</ErrorBoundary>
  </div>
)

export default function Home() {
  const [showShortcuts, setShowShortcuts] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        setShowShortcuts(s => !s)
      }
      if (e.key === 'Escape') setShowShortcuts(false)
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
