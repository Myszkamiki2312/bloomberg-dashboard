'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import useSWR from 'swr'
import type { IChartApi, ISeriesApi } from 'lightweight-charts'
import { useStore } from '@/lib/store/useStore'
import type { NewsItem, OHLCBar } from '@/types'
import TerminalCard from '@/components/ui/TerminalCard'
import { formatPrice } from '@/lib/utils/formatters'
import { cleanBars, formatChartDate, timeKey, nearestBarTime } from '@/lib/chart/chartHelpers'
import { clsx } from 'clsx'

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

const TIMEFRAMES = [
  { label: '7D', days: 7 },
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '1Y', days: 365 },
]

export default function CandlestickChart() {
  const { selectedSymbol, selectedType, watchlist } = useStore()
  const [days, setDays] = useState(7)
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const pendingData = useRef<OHLCBar[]>([])
  // Bar time ('YYYY-MM-DD') -> the news headline attached to that day's marker.
  const newsByTimeRef = useRef<Map<string, NewsItem>>(new Map())

  const swrKey = `/api/chart?symbol=${selectedSymbol}&type=${selectedType}&days=${days}`
  const { data, isLoading, error } = useSWR<OHLCBar[]>(swrKey, fetcher, { revalidateOnFocus: false })
  // Same key NewsPanel uses -- SWR dedupes this into one shared request/cache.
  const { data: news = [] } = useSWR<NewsItem[]>('/api/news', fetcher, { revalidateOnFocus: false })

  // Heuristic: general market RSS headlines say "Apple", not "AAPL" or "Apple
  // Inc." -- match on the first word of the watchlist entry's display name.
  const newsMatchTerm = useMemo(() => {
    const entry = watchlist.find(w => w.symbol === selectedSymbol)
    return (entry?.name.split(' ')[0] ?? selectedSymbol).toLowerCase()
  }, [watchlist, selectedSymbol])

  // Clear chart when symbol/days change so stale data from prev symbol isn't shown
  const prevKey = useRef(swrKey)
  const [clearing, setClearing] = useState(false)
  useEffect(() => {
    if (prevKey.current !== swrKey) {
      prevKey.current = swrKey
      setClearing(true)
      if (seriesRef.current) seriesRef.current.setData([])
    }
  }, [swrKey])
  useEffect(() => {
    // Clear the "clearing" state once new data arrives (even if empty — to show "Brak danych")
    if (clearing && data !== undefined) setClearing(false)
  }, [data, clearing])

  const displayData = useMemo(() => clearing || !data ? [] : data, [clearing, data])

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
          // Leave the bottom 25% of the pane for the volume histogram overlay.
          scaleMargins: { top: 0.1, bottom: 0.25 },
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

      const volumeSeries = chart.addHistogramSeries({
        priceFormat: { type: 'volume' },
        priceScaleId: '', // own overlay scale, independent of the price axis
      })
      volumeSeries.priceScale().applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      })

      chartInstance.current = chart
      seriesRef.current = areaSeries
      volumeSeriesRef.current = volumeSeries

      // Ensure the tooltip's `position: absolute` is relative to this
      // container, not whatever positioned ancestor happens to be further up.
      chartRef.current.style.position = 'relative'
      const tooltip = document.createElement('div')
      tooltip.style.cssText = `
        position: absolute; display: none; top: 8px; z-index: 20;
        padding: 3px 6px; font-size: 10px; font-family: 'JetBrains Mono', monospace;
        background: #0a0a0a; color: #c8c8c8; border: 1px solid #00ff41;
        border-radius: 2px; pointer-events: none; white-space: nowrap;
      `
      chartRef.current.appendChild(tooltip)
      tooltipRef.current = tooltip

      chart.subscribeCrosshairMove(param => {
        const point = param.point
        if (!param.time || !point || point.x < 0 || point.y < 0 || !chartRef.current) {
          tooltip.style.display = 'none'
          return
        }
        const seriesValue = param.seriesData.get(areaSeries) as { value?: number } | undefined
        if (seriesValue?.value == null) {
          tooltip.style.display = 'none'
          return
        }

        const newsItem = newsByTimeRef.current.get(timeKey(param.time))
        tooltip.textContent = newsItem
          ? `${formatChartDate(param.time)} (${formatPrice(seriesValue.value)}) 📰 ${newsItem.title.slice(0, 50)}`
          : `${formatChartDate(param.time)} (${formatPrice(seriesValue.value)})`
        tooltip.style.display = 'block'
        const containerWidth = chartRef.current.clientWidth
        const left = point.x + 12 + tooltip.offsetWidth > containerWidth
          ? point.x - tooltip.offsetWidth - 12
          : point.x + 12
        tooltip.style.left = `${Math.max(0, left)}px`
      })

      if (pendingData.current.length > 0) {
        const clean = cleanBars(pendingData.current)
        if (clean.length > 0) {
          areaSeries.setData(clean.map(b => ({ time: b.time, value: b.close })))
          volumeSeries.setData(clean.map((b, i) => ({
            time: b.time,
            value: b.volume ?? 0,
            color: i === 0 || b.close >= clean[i - 1].close ? 'rgba(0,255,65,0.5)' : 'rgba(255,0,64,0.5)',
          })))
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
      // ResizeObserver covers both element and window resize — no need for a
      // separate window 'resize' listener that would fire applySize twice
      removeResizeListener = () => { ro.disconnect() }
    }

    init()

    return () => {
      destroyed = true
      removeResizeListener?.()
      chartInstance.current?.remove()
      chartInstance.current = null
      seriesRef.current = null
      volumeSeriesRef.current = null
      tooltipRef.current?.remove()
      tooltipRef.current = null
    }
  }, [])

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
    volumeSeriesRef.current?.setData(clean.map((b, i) => ({
      time: b.time,
      value: b.volume ?? 0,
      color: i === 0 || b.close >= clean[i - 1].close ? 'rgba(0,255,65,0.5)' : 'rgba(255,0,64,0.5)',
    })))

    // News markers: match general market headlines against this symbol's
    // display name, then pin each match to its nearest trading day's bar.
    const relevantNews = newsMatchTerm
      ? news.filter(n =>
          n.title.toLowerCase().includes(newsMatchTerm) || n.summary.toLowerCase().includes(newsMatchTerm)
        )
      : []
    const newsByTime = new Map<string, NewsItem>()
    for (const item of relevantNews) {
      const barTime = nearestBarTime(clean, new Date(item.publishedAt).getTime())
      if (barTime && !newsByTime.has(timeKey(barTime))) newsByTime.set(timeKey(barTime), item)
    }
    newsByTimeRef.current = newsByTime
    seriesRef.current.setMarkers(
      [...newsByTime.keys()].map(time => ({
        time,
        position: 'aboveBar' as const,
        color: '#00cccc',
        shape: 'circle' as const,
        text: '📰',
      }))
    )

    chartInstance.current?.timeScale().fitContent()
  }, [displayData, news, newsMatchTerm])

  // Use cleaned bars for header stats
  const chartBars = cleanBars(displayData)

  const lastBar = chartBars[chartBars.length - 1]
  const firstBar = chartBars[0]
  const overallChange = lastBar && firstBar && firstBar.close > 0
    ? ((lastBar.close - firstBar.close) / firstBar.close) * 100
    : 0
  const isUp = overallChange >= 0
  const chartQuality = chartBars[0]?.quality
  const qualityLabel = chartQuality === 'demo' ? 'DEMO' : chartQuality === 'delayed' ? 'OPÓŹN.' : chartQuality === 'live' ? 'LIVE' : 'ŁADOWANIE'
  const assetLabel = selectedType === 'crypto' ? 'KRYPTO' : 'AKCJA'

  return (
    <TerminalCard
      title={`Wykres: ${selectedSymbol}`}
      badge={`${assetLabel} · ${qualityLabel}`}
      badgeColor={chartQuality === 'demo' || chartQuality === 'delayed' ? 'amber' : chartQuality === 'live' ? 'green' : 'muted'}
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
          <span className="ml-auto text-[9px] text-[#444]" title={lastBar.lastUpdated ? new Date(lastBar.lastUpdated).toLocaleString('pl-PL') : undefined}>
            {lastBar.source ?? 'Nieznane źródło'}
          </span>
        </div>
      )}

      <div className="relative flex-1 min-h-[200px]">
        {(isLoading || clearing) && !displayData.length && (
          <div className="absolute inset-0 flex items-center justify-center text-[#333] text-xs z-10">
            <span className="blink text-[#00ff41] mr-2">█</span> Ładowanie wykresu...
          </div>
        )}
        {!isLoading && !clearing && (data !== undefined || error) && chartBars.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-[#444] text-xs z-10">
            {error ? '⚠ Błąd pobierania wykresu' : `Brak danych dla ${selectedSymbol}`}
          </div>
        )}
        <div ref={chartRef} className="w-full h-full" />
      </div>
    </TerminalCard>
  )
}
