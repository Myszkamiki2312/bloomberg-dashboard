'use client'
import { useEffect, useRef, useState } from 'react'
import useSWR from 'swr'
import type { IChartApi, ISeriesApi } from 'lightweight-charts'
import { useStore } from '@/lib/store/useStore'
import type { OHLCBar } from '@/types'
import TerminalCard from '@/components/ui/TerminalCard'
import { formatPrice } from '@/lib/utils/formatters'
import { clsx } from 'clsx'

const fetcher = (url: string) => fetch(url).then(r => r.json())

function cleanBars(data: OHLCBar[]): OHLCBar[] {
  if (!data.length) return []
  const sorted = [...data].sort((a, b) => a.time.localeCompare(b.time))
  // Last bar per date (4h CoinGecko → daily close)
  const deduped = sorted.filter((bar, i, arr) =>
    i === arr.length - 1 || bar.time !== arr[i + 1].time
  ).filter(b => isFinite(b.close) && b.close > 0)

  if (!deduped.length) return []

  // Median-based outlier filter — removes anomalous bars (>80% deviation from median)
  const closes = [...deduped].map(b => b.close).sort((a, b) => a - b)
  const median = closes[Math.floor(closes.length / 2)]
  return deduped.filter(b => b.close >= median * 0.2 && b.close <= median * 5)
}

const TIMEFRAMES = [
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '1Y', days: 365 },
]

export default function CandlestickChart() {
  const { selectedSymbol, selectedType } = useStore()
  const [days, setDays] = useState(90)
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null)
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
          textColor: '#555',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 10,
        },
        grid: {
          vertLines: { color: '#0f0f0f' },
          horzLines: { color: '#0f0f0f' },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: { color: '#00ff41', labelBackgroundColor: '#0a0a0a', width: 1, style: 3 },
          horzLine: { color: '#00ff41', labelBackgroundColor: '#0a0a0a', width: 1, style: 3 },
        },
        rightPriceScale: {
          borderColor: '#1a1a1a',
          textColor: '#555',
        },
        timeScale: { borderColor: '#1a1a1a', timeVisible: false },
        width: chartRef.current.clientWidth,
        height: chartRef.current.clientHeight || 300,
      })

      const overallChange = pendingData.current.length >= 2
        ? pendingData.current[pendingData.current.length - 1].close - pendingData.current[0].close
        : 0
      const isUp = overallChange >= 0

      const areaSeries = chart.addAreaSeries({
        lineColor: isUp ? '#00ff41' : '#ff0040',
        lineWidth: 2,
        topColor: isUp ? 'rgba(0,255,65,0.25)' : 'rgba(255,0,64,0.25)',
        bottomColor: isUp ? 'rgba(0,255,65,0.01)' : 'rgba(255,0,64,0.01)',
        priceLineColor: isUp ? '#00ff41' : '#ff0040',
        priceLineWidth: 1,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
        crosshairMarkerBorderColor: isUp ? '#00ff41' : '#ff0040',
        crosshairMarkerBackgroundColor: '#080808',
        lastValueVisible: true,
      })

      chartInstance.current = chart
      seriesRef.current = areaSeries

      if (pendingData.current.length > 0) {
        const clean = cleanBars(pendingData.current)
        if (clean.length > 0) {
          areaSeries.setData(clean.map(b => ({ time: b.time, value: b.close })))
          chart.timeScale().fitContent()
        }
      }

      const applySize = () => {
        if (!chartRef.current || destroyed) return
        const w = chartRef.current.clientWidth
        const h = chartRef.current.clientHeight
        if (w > 0 && h > 0) {
          chart.applyOptions({ width: w, height: h })
          chart.timeScale().fitContent()
        }
      }

      const ro = new ResizeObserver(applySize)
      ro.observe(chartRef.current)
      window.addEventListener('resize', applySize)
      removeResizeListener = () => { ro.disconnect(); window.removeEventListener('resize', applySize) }
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
    const clean = cleanBars(data)
    if (!clean.length) return

    const isUp = clean[clean.length - 1].close >= clean[0].close
    seriesRef.current.applyOptions({
      lineColor: isUp ? '#00ff41' : '#ff0040',
      topColor: isUp ? 'rgba(0,255,65,0.25)' : 'rgba(255,0,64,0.25)',
      bottomColor: isUp ? 'rgba(0,255,65,0.01)' : 'rgba(255,0,64,0.01)',
      priceLineColor: isUp ? '#00ff41' : '#ff0040',
    })

    seriesRef.current.setData(clean.map(b => ({ time: b.time, value: b.close })))
    chartInstance.current?.timeScale().fitContent()
  }, [data])

  // Use cleaned bars for header stats
  const chartBars = cleanBars(data)

  const lastBar = chartBars[chartBars.length - 1]
  const firstBar = chartBars[0]
  const overallChange = lastBar && firstBar && firstBar.close > 0
    ? ((lastBar.close - firstBar.close) / firstBar.close) * 100
    : 0
  const isUp = overallChange >= 0

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
        <div className="flex items-center gap-4 px-3 py-1.5 border-b border-[#111] text-[11px]">
          <span className={clsx('font-bold text-[15px] num', isUp ? 'text-[#00ff41]' : 'text-[#ff0040]')}>
            {formatPrice(lastBar.close)}
          </span>
          <span className={clsx('font-bold num', isUp ? 'text-[#00ff41]' : 'text-[#ff0040]')}>
            {isUp ? '▲' : '▼'} {Math.abs(overallChange).toFixed(2)}%
            <span className="text-[#333] font-normal ml-1">
              {TIMEFRAMES.find(t => t.days === days)?.label}
            </span>
          </span>
          <span className="text-[#333]">│</span>
          <span className="text-[#444]">O <span className="text-[#666]">{formatPrice(lastBar.open)}</span></span>
          <span className="text-[#444]">H <span className="text-[#00ff41]">{formatPrice(lastBar.high)}</span></span>
          <span className="text-[#444]">L <span className="text-[#ff0040]">{formatPrice(lastBar.low)}</span></span>
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
