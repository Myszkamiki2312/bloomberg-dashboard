'use client'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
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

const Panel = ({ children, label }: { children: React.ReactNode; label: string }) => (
  <div className="overflow-hidden bg-[#080808]">
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

        {/* ── Main grid ── */}
        <div
          className="overflow-hidden"
          style={{
            flex: '1 1 0',
            display: 'grid',
            gridTemplateColumns: '210px 1fr 250px',
            gap: 1,
            backgroundColor: '#111',
            minHeight: 0,
          }}
        >
          <Panel label="Watchlista"><Watchlist /></Panel>

          <div
            className="overflow-hidden"
            style={{ display: 'grid', gridTemplateRows: '3fr 2fr', gap: 1, backgroundColor: '#111' }}
          >
            <Panel label="Wykres"><CandlestickChart /></Panel>
            <div
              className="overflow-hidden"
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, backgroundColor: '#111' }}
            >
              <Panel label="AI Podsumowanie"><AIMarketSummary /></Panel>
              <Panel label="Rynek Globalny"><MarketOverview /></Panel>
            </div>
          </div>

          <Panel label="Wiadomości"><NewsPanel /></Panel>
        </div>

        {/* ── Bottom strip ── */}
        <div
          className="shrink-0 overflow-hidden"
          style={{
            height: 200,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 260px',
            gap: 1,
            backgroundColor: '#111',
            borderTop: '1px solid #111',
          }}
        >
          <Panel label="Screener"><MarketScreener /></Panel>
          <Panel label="Kalendarz"><EconomicCalendar /></Panel>
          <Panel label="Alerty"><PriceAlerts /></Panel>
        </div>

        <NewsTickerBar />
        <FunctionBar onHelpOpen={() => setShowShortcuts(true)} />
      </div>
    </>
  )
}
