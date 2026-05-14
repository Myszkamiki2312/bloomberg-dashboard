'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import useSWR from 'swr'
import type { IChartApi, ISeriesApi, MouseEventParams } from 'lightweight-charts'
import { useStore } from '@/lib/store/useStore'
import type { OHLCBar } from '@/types'
import TerminalCard from '@/components/ui/TerminalCard'
import { formatPrice, formatVolume } from '@/lib/utils/formatters'
import { clsx } from 'clsx'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const TIMEFRAMES = [
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
]

function calcSMA(data: OHLCBar[], period: number): { time: string; value: number }[] {
  return data
    .map((bar, i) => {
      if (i < period - 1) return null
      const sum = data.slice(i - period + 1, i + 1).reduce((s, b) => s + b.close, 0)
      return { time: bar.time, value: Math.round((sum / period) * 100) / 100 }
    })
    .filter((x): x is { time: string; value: number } => x !== null)
}

interface TooltipData {
  time: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  sma20?: number
  sma50?: number
  x: number
  y: number
}

export default function CandlestickChart() {
  const { selectedSymbol, selectedType } = useStore()
  const [days, setDays] = useState(90)
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const sma20Ref = useRef<ISeriesApi<'Line'> | null>(null)
  const sma50Ref = useRef<ISeriesApi<'Line'> | null>(null)
  const pendingData = useRef<OHLCBar[]>([])
  const sma20Data = useRef<{ time: string; value: number }[]>([])
  const sma50Data = useRef<{ time: string; value: number }[]>([])

  const { data = [], isLoading } = useSWR<OHLCBar[]>(
    `/api/chart?symbol=${selectedSymbol}&type=${selectedType}&days=${days}`,
    fetcher,
    { revalidateOnFocus: false }
  )

  const applyData = useCallback((bars: OHLCBar[]) => {
    if (!seriesRef.current) return
    const sorted = [...bars].sort((a, b) => a.time.localeCompare(b.time))
    const deduped = sorted.filter((b, i, arr) => i === 0 || b.time !== arr[i - 1].time)

    seriesRef.current.setData(deduped)

    if (volSeriesRef.current) {
      volSeriesRef.current.setData(deduped.map(b => ({
        time: b.time,
        value: b.volume ?? 0,
        color: b.close >= b.open ? 'rgba(0,255,65,0.35)' : 'rgba(255,0,64,0.35)',
      })))
    }

    const s20 = calcSMA(deduped, 20)
    const s50 = calcSMA(deduped, 50)
    sma20Data.current = s20
    sma50Data.current = s50
    sma20Ref.current?.setData(s20)
    sma50Ref.current?.setData(s50)

    chartInstance.current?.timeScale().fitContent()
  }, [])

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
          vertLine: { color: '#333', labelBackgroundColor: '#0a0a0a', width: 1, style: 3 },
          horzLine: { color: '#333', labelBackgroundColor: '#0a0a0a', width: 1, style: 3 },
        },
        rightPriceScale: {
          borderColor: '#1a1a1a',
          textColor: '#555',
          scaleMargins: { top: 0.06, bottom: 0.25 },
        },
        timeScale: {
          borderColor: '#1a1a1a',
          timeVisible: false,
          barSpacing: 8,
        },
        width: chartRef.current.clientWidth,
        height: chartRef.current.clientHeight || 300,
      })

      // Candlestick series
      const candleSeries = chart.addCandlestickSeries({
        upColor: '#00d084',
        downColor: '#ff3b5c',
        borderUpColor: '#00d084',
        borderDownColor: '#ff3b5c',
        wickUpColor: '#00d084',
        wickDownColor: '#ff3b5c',
        borderVisible: true,
      })

      // Volume histogram — scaled to bottom 22% of chart
      const volSeries = chart.addHistogramSeries({
        priceFormat: { type: 'volume' },
        priceScaleId: 'vol',
      })
      chart.priceScale('vol').applyOptions({
        scaleMargins: { top: 0.78, bottom: 0 },
      })

      // SMA 20
      const sma20Series = chart.addLineSeries({
        color: '#0099ff',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: true,
        crosshairMarkerVisible: false,
        title: 'SMA20',
      })

      // SMA 50
      const sma50Series = chart.addLineSeries({
        color: '#ffaa00',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: true,
        crosshairMarkerVisible: false,
        title: 'SMA50',
      })

      chartInstance.current = chart
      seriesRef.current = candleSeries
      volSeriesRef.current = volSeries
      sma20Ref.current = sma20Series
      sma50Ref.current = sma50Series

      if (pendingData.current.length > 0) {
        applyData(pendingData.current)
      }

      // Crosshair tooltip
      chart.subscribeCrosshairMove((param: MouseEventParams) => {
        if (!param.time || !param.point || !chartRef.current) {
          setTooltip(null)
          return
        }
        const candle = param.seriesData.get(candleSeries) as any
        if (!candle) { setTooltip(null); return }

        const sma20Val = sma20Data.current.find(s => s.time === param.time)?.value
        const sma50Val = sma50Data.current.find(s => s.time === param.time)?.value
        const volData = param.seriesData.get(volSeries) as any

        setTooltip({
          time: String(param.time),
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: volData?.value ?? 0,
          sma20: sma20Val,
          sma50: sma50Val,
          x: param.point.x,
          y: param.point.y,
        })
      })

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
      volSeriesRef.current = null
      sma20Ref.current = null
      sma50Ref.current = null
    }
  }, [applyData])

  useEffect(() => {
    pendingData.current = data
    if (!seriesRef.current || !data.length) return
    applyData(data)
  }, [data, applyData])

  const lastBar = data[data.length - 1]
  const firstBar = data[0]
  const overallChange = lastBar && firstBar
    ? ((lastBar.close - firstBar.close) / firstBar.close) * 100
    : 0
  const isUp = overallChange >= 0

  return (
    <TerminalCard
      title={`${selectedSymbol} / USD`}
      badge={selectedType === 'crypto' ? 'KRYPTO' : 'AKCJA'}
      badgeColor={selectedType === 'crypto' ? 'cyan' : 'blue'}
      className="h-full"
      action={
        <div className="flex items-center gap-2">
          {/* SMA legend */}
          <div className="flex items-center gap-2 text-[9px] mr-1">
            <span className="flex items-center gap-1"><span className="w-4 h-px bg-[#0099ff] inline-block" />SMA20</span>
            <span className="flex items-center gap-1"><span className="w-4 h-px bg-[#ffaa00] inline-block" />SMA50</span>
          </div>
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
      {/* Price bar */}
      {lastBar && (
        <div className="flex items-center gap-3 px-3 py-1 border-b border-[#111] text-[11px] bg-[#050505] shrink-0">
          <span className={clsx('font-bold text-[15px] num', isUp ? 'text-[#00d084]' : 'text-[#ff3b5c]')}>
            {formatPrice(lastBar.close)}
          </span>
          <span className={clsx('font-bold num', isUp ? 'text-[#00d084]' : 'text-[#ff3b5c]')}>
            {isUp ? '▲' : '▼'} {Math.abs(overallChange).toFixed(2)}%
            <span className="text-[#444] font-normal ml-1">
              ({TIMEFRAMES.find(t => t.days === days)?.label})
            </span>
          </span>
          <span className="text-[#333]">|</span>
          <span className="text-[#555]">A <span className="text-[#888]">{formatPrice(lastBar.open)}</span></span>
          <span className="text-[#555]">W <span className="text-[#00d084]">{formatPrice(lastBar.high)}</span></span>
          <span className="text-[#555]">D <span className="text-[#ff3b5c]">{formatPrice(lastBar.low)}</span></span>
          {lastBar.volume && (
            <span className="text-[#555] ml-auto">Vol <span className="text-[#888]">{formatVolume(lastBar.volume)}</span></span>
          )}
        </div>
      )}

      {/* Chart container */}
      <div className="relative flex-1 min-h-[200px]">
        {isLoading && !data.length && (
          <div className="absolute inset-0 flex items-center justify-center text-[#333] text-[11px] z-10">
            <span className="blink text-[#00ff41] mr-2">█</span> Ładowanie wykresu...
          </div>
        )}

        {/* Crosshair OHLCV tooltip */}
        {tooltip && (
          <div
            className="absolute z-20 pointer-events-none bg-[#0a0a0a] border border-[#222] px-2 py-1.5 text-[10px] font-mono"
            style={{
              left: tooltip.x > (chartRef.current?.clientWidth ?? 0) / 2 ? tooltip.x - 160 : tooltip.x + 16,
              top: Math.max(4, tooltip.y - 60),
            }}
          >
            <div className="text-[#666] mb-1">{tooltip.time}</div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
              <span className="text-[#555]">O</span><span className="text-[#ccc] num">{formatPrice(tooltip.open)}</span>
              <span className="text-[#555]">H</span><span className="text-[#00d084] num">{formatPrice(tooltip.high)}</span>
              <span className="text-[#555]">L</span><span className="text-[#ff3b5c] num">{formatPrice(tooltip.low)}</span>
              <span className="text-[#555]">C</span>
              <span className={clsx('num font-bold', tooltip.close >= tooltip.open ? 'text-[#00d084]' : 'text-[#ff3b5c]')}>
                {formatPrice(tooltip.close)}
              </span>
              {tooltip.volume > 0 && (
                <><span className="text-[#555]">V</span><span className="text-[#888] num">{formatVolume(tooltip.volume)}</span></>
              )}
              {tooltip.sma20 && (
                <><span className="text-[#0099ff]">MA20</span><span className="text-[#0099ff] num">{formatPrice(tooltip.sma20)}</span></>
              )}
              {tooltip.sma50 && (
                <><span className="text-[#ffaa00]">MA50</span><span className="text-[#ffaa00] num">{formatPrice(tooltip.sma50)}</span></>
              )}
            </div>
          </div>
        )}

        <div ref={chartRef} className="w-full h-full" />
      </div>
    </TerminalCard>
  )
}
