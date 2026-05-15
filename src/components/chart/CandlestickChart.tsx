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
  const deduped = sorted.filter((bar, i, arr) =>
    i === arr.length - 1 || bar.time !== arr[i + 1].time
  ).filter(b => isFinite(b.close) && b.close > 0)
  if (!deduped.length) return []
  const closes = [...deduped].map(b => b.close).sort((a, b) => a - b)
  const median = closes[Math.floor(closes.length / 2)]
  return deduped.filter(b => b.close >= median * 0.2 && b.close <= median * 5)
}

function computeSMA(bars: OHLCBar[], period: number): { time: string; value: number }[] {
  if (bars.length < period) return []
  const result: { time: string; value: number }[] = []
  for (let i = period - 1; i < bars.length; i++) {
    let sum = 0
    for (let j = i - period + 1; j <= i; j++) sum += bars[j].close
    result.push({ time: bars[i].time, value: sum / period })
  }
  return result
}

const TIMEFRAMES = [
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '1Y', days: 365 },
]

const MA_CONFIG = {
  ma20: { period: 20, color: '#ffaa00', label: 'MA20' },
  ma50: { period: 50, color: '#0099ff', label: 'MA50' },
} as const

type MAKey = keyof typeof MA_CONFIG

export default function CandlestickChart() {
  const { selectedSymbol, selectedType } = useStore()
  const [days, setDays] = useState(90)
  const [showMA, setShowMA] = useState<Record<MAKey, boolean>>({ ma20: true, ma50: true })

  const chartRef      = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<IChartApi | null>(null)
  const seriesRef     = useRef<ISeriesApi<'Area'> | null>(null)
  const ma20Ref       = useRef<ISeriesApi<'Line'> | null>(null)
  const ma50Ref       = useRef<ISeriesApi<'Line'> | null>(null)
  const pendingData   = useRef<OHLCBar[]>([])

  const swrKey = `/api/chart?symbol=${selectedSymbol}&type=${selectedType}&days=${days}`
  const { data, isLoading } = useSWR<OHLCBar[]>(swrKey, fetcher, { revalidateOnFocus: false })

  const prevKey = useRef(swrKey)
  const [clearing, setClearing] = useState(false)
  useEffect(() => {
    if (prevKey.current !== swrKey) {
      prevKey.current = swrKey
      setClearing(true)
      seriesRef.current?.setData([])
      ma20Ref.current?.setData([])
      ma50Ref.current?.setData([])
    }
  }, [swrKey])
  useEffect(() => {
    if (clearing && data && data.length > 0) setClearing(false)
  }, [data, clearing])

  const displayData = clearing || !data ? [] : data

  // Sync MA visibility whenever toggles change
  useEffect(() => {
    ma20Ref.current?.applyOptions({ visible: showMA.ma20 })
    ma50Ref.current?.applyOptions({ visible: showMA.ma50 })
  }, [showMA])

  // Chart initialization
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
        rightPriceScale: { borderColor: '#1a1a1a', textColor: '#555' },
        timeScale: { borderColor: '#1a1a1a', timeVisible: false },
        width: chartRef.current.clientWidth,
        height: chartRef.current.clientHeight || 300,
      })

      const clean = cleanBars(pendingData.current)
      const isUp = clean.length >= 2 ? clean[clean.length - 1].close >= clean[0].close : true

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

      const ma20Series = chart.addLineSeries({
        color: MA_CONFIG.ma20.color,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
        visible: showMA.ma20,
      })
      const ma50Series = chart.addLineSeries({
        color: MA_CONFIG.ma50.color,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
        visible: showMA.ma50,
      })

      chartInstance.current = chart
      seriesRef.current = areaSeries
      ma20Ref.current = ma20Series
      ma50Ref.current = ma50Series

      if (clean.length > 0) {
        areaSeries.setData(clean.map(b => ({ time: b.time, value: b.close })))
        ma20Series.setData(computeSMA(clean, MA_CONFIG.ma20.period))
        ma50Series.setData(computeSMA(clean, MA_CONFIG.ma50.period))
        chart.timeScale().fitContent()
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
      ma20Ref.current = null
      ma50Ref.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Update series data when chart data changes
  useEffect(() => {
    pendingData.current = displayData
    if (!seriesRef.current || !displayData.length) return
    const clean = cleanBars(displayData)
    if (!clean.length) return

    const isUp = clean[clean.length - 1].close >= clean[0].close
    seriesRef.current.applyOptions({
      lineColor: isUp ? '#00ff41' : '#ff0040',
      topColor: isUp ? 'rgba(0,255,65,0.25)' : 'rgba(255,0,64,0.25)',
      bottomColor: isUp ? 'rgba(0,255,65,0.01)' : 'rgba(255,0,64,0.01)',
      priceLineColor: isUp ? '#00ff41' : '#ff0040',
    })
    seriesRef.current.setData(clean.map(b => ({ time: b.time, value: b.close })))
    ma20Ref.current?.setData(computeSMA(clean, MA_CONFIG.ma20.period))
    ma50Ref.current?.setData(computeSMA(clean, MA_CONFIG.ma50.period))
    chartInstance.current?.timeScale().fitContent()
  }, [displayData])

  const chartBars = cleanBars(displayData)
  const lastBar = chartBars[chartBars.length - 1]
  const firstBar = chartBars[0]
  const overallChange = lastBar && firstBar && firstBar.close > 0
    ? ((lastBar.close - firstBar.close) / firstBar.close) * 100
    : 0
  const isUp = overallChange >= 0

  // Current MA values for header display
  const lastSma20 = (() => { const d = computeSMA(chartBars, 20); return d[d.length - 1]?.value })()
  const lastSma50 = (() => { const d = computeSMA(chartBars, 50); return d[d.length - 1]?.value })()

  return (
    <TerminalCard
      title={`Wykres: ${selectedSymbol}`}
      badge={selectedType === 'crypto' ? 'KRYPTO' : 'AKCJA'}
      badgeColor={selectedType === 'crypto' ? 'cyan' : 'blue'}
      className="h-full"
      action={
        <div className="flex items-center gap-1">
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
          <span className="border-l border-[#1c1c1c] h-3 mx-0.5" />
          {(Object.keys(MA_CONFIG) as MAKey[]).map(key => (
            <button
              key={key}
              onClick={() => setShowMA(s => ({ ...s, [key]: !s[key] }))}
              className={clsx(
                'px-1.5 py-0.5 text-[10px] border transition-colors',
                showMA[key]
                  ? key === 'ma20'
                    ? 'border-[#ffaa00] text-[#ffaa00]'
                    : 'border-[#0099ff] text-[#0099ff]'
                  : 'border-[#1c1c1c] text-[#333]'
              )}
            >
              {MA_CONFIG[key].label}
            </button>
          ))}
        </div>
      }
    >
      {lastBar && (
        <div className="flex items-center gap-3 px-3 py-1.5 border-b border-[#111] text-[11px] flex-wrap">
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
          {lastSma20 && showMA.ma20 && (
            <>
              <span className="text-[#333]">│</span>
              <span style={{ color: MA_CONFIG.ma20.color }} className="num text-[10px]">
                MA20 <span className="font-bold">{formatPrice(lastSma20)}</span>
              </span>
            </>
          )}
          {lastSma50 && showMA.ma50 && (
            <>
              {!lastSma20 && <span className="text-[#333]">│</span>}
              <span style={{ color: MA_CONFIG.ma50.color }} className="num text-[10px]">
                MA50 <span className="font-bold">{formatPrice(lastSma50)}</span>
              </span>
            </>
          )}
        </div>
      )}

      <div className="relative flex-1 min-h-[200px]">
        {(isLoading || clearing) && !displayData.length && (
          <div className="absolute inset-0 flex items-center justify-center text-[#333] text-xs z-10">
            <span className="blink text-[#00ff41] mr-2">█</span> Ładowanie wykresu...
          </div>
        )}
        <div ref={chartRef} className="w-full h-full" />
      </div>
    </TerminalCard>
  )
}
