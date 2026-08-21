export interface AssetPrice {
  symbol: string
  name: string
  price: number
  change24h: number
  changePercent24h: number
  volume24h: number
  marketCap: number
  type: 'stock' | 'crypto'
  currency: string
  lastUpdated: string
  source?: string
  quality?: DataQuality
}

export type DataQuality = 'live' | 'delayed' | 'demo'
export type PortfolioCurrency = 'PLN' | 'USD' | 'EUR'

export interface OHLCBar {
  time: string
  open: number
  high: number
  low: number
  close: number
  volume?: number
  source?: string
  quality?: DataQuality
  lastUpdated?: string
}

export interface NewsItem {
  id: string
  title: string
  summary: string
  url: string
  source: string
  publishedAt: string
  category?: string
}

export interface PriceAlert {
  id: string
  symbol: string
  targetPrice: number
  direction: 'above' | 'below'
  active: boolean
  triggered: boolean
  createdAt: string
}

export interface ScreenerItem {
  symbol: string
  name: string
  price: number
  change: number
  volume: number
  rsi: number
  trend: 'bullish' | 'bearish' | 'neutral'
  volatility: number
  type: 'stock' | 'crypto'
  source?: string
  quality?: DataQuality
}

export interface EconomicEvent {
  id: string
  date: string
  time: string
  country: string
  flag: string
  event: string
  importance: 'low' | 'medium' | 'high'
  actual?: string
  forecast?: string
  previous?: string
  source?: string
  sourceUrl?: string
  quality?: DataQuality
}

export interface MarketSummary {
  sentiment: 'bullish' | 'bearish' | 'neutral'
  sentimentScore: number
  summary: string
  keyPoints: string[]
  sectors: { name: string; performance: number }[]
  timestamp: string
  isDemo: boolean
  source?: string
}

export interface WatchlistEntry {
  symbol: string
  name: string
  type: 'stock' | 'crypto'
  coinId?: string
  quantity?: number
  avgPrice?: number
  purchaseFxRateToPln?: number
}

export interface MarketIndex {
  symbol: string
  name: string
  value: number
  change: number
  pct: number
  lastUpdated?: string
  source?: string
  quality?: DataQuality
}
