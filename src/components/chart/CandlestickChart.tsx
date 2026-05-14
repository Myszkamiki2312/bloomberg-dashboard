'use client'
import { useEffect, useRef, useState } from 'react'
import useSWR from 'swr'
import type { IChartApi, ISeriesApi } from 'lightweight-charts'
import { useStore } from '@/lib/store/useStore'
import type { OHLCBar } from '@/types'
import TerminalCard from '@/components/ui/TerminalCard'
import { formatPrice, formatPercent } from '@/lib/utils/formatters'
import { clsx } from 'clsx'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const TIMEFRAMES = [
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
]

export default function CandlestickChart() {
  const { selectedSymbol, selectedType } = useStore()
  const [days, setDays] = useState(90)
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const pendingData = useRef<OHLCBar[]>([])

  const { data = [], isLoading } = useSWR<OHLCBar[]>(
    `/api/chart?symbol=${selectedSymbol}&type=${selectedType}&days=${days}`,
    fetcher,
    { revalidateOnFocus: false }
  )

  useEffect(() => {
    if (!chartRef.current) return

    let destroyed = false
    let removeResizeListener: (() => void) | null = null

    async function init() {
      const { createChart, ColorType, CrosshairMode } = await import('lightweight-charts')
      if (destroyed || !chartRef.current) return

      const chart = createChart(chartRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: '#080808' },
          textColor: '#666666',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 10,
        },
        grid: {
          vertLines: { color: '#111111' },
          horzLines: { color: '#111111' },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: { color: '#00ff41', labelBackgroundColor: '#111111' },
          horzLine: { color: '#00ff41', labelBackgroundColor: '#111111' },
        },
        rightPriceScale: { borderColor: '#1c1c1c' },
        timeScale: { borderColor: '#1c1c1c', timeVisible: false },
        width: chartRef.current.clientWidth,
        height: chartRef.current.clientHeight || 300,
      })

      const candleSeries = chart.addCandlestickSeries({
        upColor: '#00ff41',
        downColor: '#ff0040',
        borderUpColor: '#00ff41',
        borderDownColor: '#ff0040',
        wickUpColor: '#00ff41',
        wickDownColor: '#ff0040',
      })

      chartInstance.current = chart
      seriesRef.current = candleSeries

      if (pendingData.current.length > 0) {
        const sorted = [...pendingData.current].sort((a, b) => a.time.localeCompare(b.time))
        const deduped = sorted.filter((bar, i, arr) => i === 0 || bar.time !== arr[i - 1].time)
        candleSeries.setData(deduped)
        chart.timeScale().fitContent()
      }

      const handleResize = () => {
        if (chartRef.current && !destroyed) {
          chart.applyOptions({
            width: chartRef.current.clientWidth,
            height: chartRef.current.clientHeight || 300,
          })
        }
      }
      window.addEventListener('resize', handleResize)
      removeResizeListener = () => window.removeEventListener('resize', handleResize)
    }

    init()

    return () => {
      destroyed = true
      removeResizeListener?.()
      chartInstance.current?.remove()
      chartInstance.current = null
      seriesRef.current = null
    }
  }, [])

  useEffect(() => {
    pendingData.current = data
    if (!seriesRef.current || !data.length) return
    const sorted = [...data].sort((a, b) => a.time.localeCompare(b.time))
    const deduped = sorted.filter((bar, i, arr) => i === 0 || bar.time !== arr[i - 1].time)
    seriesRef.current.setData(deduped)
    chartInstance.current?.timeScale().fitContent()
  }, [data])

  const lastBar = data[data.length - 1]
  const firstBar = data[0]
  const overallChange = lastBar && firstBar
    ? ((lastBar.close - firstBar.close) / firstBar.close) * 100
    : 0

  return (
    <TerminalCard
      title={`Wykres: ${selectedSymbol}`}
      badge={selectedType === 'crypto' ? 'KRYPTO' : 'AKCJA'}
      badgeColor={selectedType === 'crypto' ? 'cyan' : 'blue'}
      className="h-full"
      action={
        <div className="flex gap-1">
          {TIMEFRAMES.map(tf => (
            <button
              key={tf.label}
              onClick={() => setDays(tf.days)}
              className={clsx(
                'px-2 py-0.5 text-[10px] border transition-colors',
                days === tf.days
                  ? 'border-[#00ff41] text-[#00ff41]'
                  : 'border-[#1c1c1c] text-[#444] hover:border-[#00ff41] hover:text-[#00ff41]'
              )}
            >
              {tf.label}
            </button>
          ))}
        </div>
      }
    >
      {lastBar && (
        <div className="flex items-center gap-4 px-3 py-1.5 border-b border-[#1c1c1c] text-[11px]">
          <span className="text-[#ffaa00] font-bold text-base num">{formatPrice(lastBar.close)}</span>
          <span className={overallChange >= 0 ? 'text-[#00ff41]' : 'text-[#ff0040]'}>
            {formatPercent(overallChange)} ({TIMEFRAMES.find(t => t.days === days)?.label})
          </span>
          <span className="text-[#555]">O: {formatPrice(lastBar.open)}</span>
          <span className="text-[#555]">H: {formatPrice(lastBar.high)}</span>
          <span className="text-[#555]">L: {formatPrice(lastBar.low)}</span>
        </div>
      )}

      <div className="relative flex-1 min-h-[200px]">
        {isLoading && !data.length && (
          <div className="absolute inset-0 flex items-center justify-center text-[#333] text-xs z-10">
            <span className="blink text-[#00ff41] mr-2">█</span> Ładowanie wykresu...
          </div>
        )}
        <div ref={chartRef} className="w-full h-full" />
      </div>
    </TerminalCard>
  )
}
