import type { AssetPrice, MarketIndex } from '@/types'

const SCANNER_URL = 'https://scanner.tradingview.com/global/scan'
const ENABLED = process.env.TRADINGVIEW_UNOFFICIAL_ENABLED !== 'false'

const COLUMNS = [
  'name',
  'description',
  'close',
  'change',
  'volume',
  'market_cap_basic',
  'currency',
  'update_mode',
] as const

interface ScanRow {
  s: string
  d: unknown[]
}

interface ScanResponse {
  data?: ScanRow[]
}

interface ParsedQuote {
  ticker: string
  name: string
  price: number
  changePercent: number
  volume: number
  marketCap: number
  currency: string
  updateMode: string
}

const STOCK_SUFFIX_EXCHANGES: Record<string, string[]> = {
  WA: ['GPW'],
  DE: ['XETR', 'FWB'],
  L: ['LSE'],
  PA: ['EURONEXT'],
  MI: ['MIL'],
  MC: ['BME'],
  AS: ['EURONEXT'],
  BR: ['EURONEXT'],
  LS: ['EURONEXT'],
  SW: ['SIX'],
}

const INDEX_TICKERS = [
  { ticker: 'SP:SPX', symbol: 'SPX', name: 'S&P 500' },
  { ticker: 'NASDAQ:NDX', symbol: 'NDX', name: 'NASDAQ 100' },
  { ticker: 'DJ:DJI', symbol: 'DJI', name: 'DJIA' },
  { ticker: 'TVC:VIX', symbol: 'VIX', name: 'VIX' },
  { ticker: 'FX_IDC:USDPLN', symbol: 'USDPLN', name: 'USD/PLN' },
  { ticker: 'FX:EURUSD', symbol: 'EURUSD', name: 'EUR/USD' },
  { ticker: 'TVC:GOLD', symbol: 'GOLD', name: 'GOLD' },
  { ticker: 'NYMEX:CL1!', symbol: 'OIL', name: 'WTI futures' },
]

function numberOrZero(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function parseRow(row: ScanRow): ParsedQuote | null {
  if (!Array.isArray(row.d)) return null
  const price = numberOrZero(row.d[2])
  if (price <= 0) return null

  return {
    ticker: row.s,
    name: typeof row.d[1] === 'string' && row.d[1] ? row.d[1] : String(row.d[0] ?? row.s),
    price,
    changePercent: numberOrZero(row.d[3]),
    volume: numberOrZero(row.d[4]),
    marketCap: numberOrZero(row.d[5]),
    currency: typeof row.d[6] === 'string' ? row.d[6] : '',
    updateMode: typeof row.d[7] === 'string' ? row.d[7] : 'unknown',
  }
}

async function scan(tickers: string[]): Promise<Map<string, ParsedQuote>> {
  if (!ENABLED || tickers.length === 0) return new Map()

  const response = await fetch(SCANNER_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'user-agent': 'Mozilla/5.0 Bloomberg-Dashboard/1.0',
    },
    body: JSON.stringify({
      symbols: { tickers: [...new Set(tickers)].slice(0, 200), query: { types: [] } },
      columns: COLUMNS,
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(6000),
  })

  if (!response.ok) throw new Error(`TradingView scanner ${response.status}`)
  const json = await response.json() as ScanResponse
  if (!Array.isArray(json.data)) throw new Error('TradingView scanner: unexpected response format')

  const quotes = new Map<string, ParsedQuote>()
  for (const row of json.data) {
    const quote = parseRow(row)
    if (quote) quotes.set(quote.ticker, quote)
  }
  return quotes
}

function candidatesFor(symbol: string, type: 'stock' | 'crypto'): string[] {
  const normalized = symbol.toUpperCase()
  if (type === 'crypto') {
    return [
      `COINBASE:${normalized}USD`,
      `BINANCE:${normalized}USDT`,
      `KRAKEN:${normalized}USD`,
    ]
  }

  const dot = normalized.lastIndexOf('.')
  if (dot > 0) {
    const base = normalized.slice(0, dot)
    const suffix = normalized.slice(dot + 1)
    const exchanges = STOCK_SUFFIX_EXCHANGES[suffix]
    if (exchanges) return exchanges.map(exchange => `${exchange}:${base}`)
  }

  return [
    `NASDAQ:${normalized}`,
    `NYSE:${normalized}`,
    `AMEX:${normalized}`,
    `GPW:${normalized}`,
  ]
}

function absoluteChange(price: number, percent: number): number {
  if (percent === -100) return 0
  const previous = price / (1 + percent / 100)
  return Number.isFinite(previous) ? price - previous : 0
}

function sourceLabel(quote: ParsedQuote): string {
  const mode = quote.updateMode.replaceAll('_', ' ')
  return `TradingView Scanner — nieoficjalne (${mode})${quote.currency ? ` · ${quote.currency}` : ''}`
}

export async function fetchTradingViewPrices(
  symbols: { symbol: string; type: 'stock' | 'crypto' }[]
): Promise<AssetPrice[]> {
  const candidates = new Map(symbols.map(item => [item.symbol, candidatesFor(item.symbol, item.type)]))
  const quotes = await scan([...candidates.values()].flat())
  const now = new Date().toISOString()

  return symbols.flatMap(item => {
    const quote = candidates.get(item.symbol)?.map(ticker => quotes.get(ticker)).find(Boolean)
    if (!quote) return []

    return [{
      symbol: item.symbol,
      name: quote.name,
      price: quote.price,
      change24h: absoluteChange(quote.price, quote.changePercent),
      changePercent24h: quote.changePercent,
      volume24h: quote.volume,
      marketCap: quote.marketCap,
      type: item.type,
      lastUpdated: now,
      source: sourceLabel(quote),
      quality: 'delayed' as const,
    }]
  })
}

export async function fetchTradingViewIndices(): Promise<MarketIndex[]> {
  const quotes = await scan(INDEX_TICKERS.map(index => index.ticker))
  const now = new Date().toISOString()

  return INDEX_TICKERS.flatMap(index => {
    const quote = quotes.get(index.ticker)
    if (!quote) return []

    return [{
      symbol: index.symbol,
      name: index.name,
      value: quote.price,
      change: absoluteChange(quote.price, quote.changePercent),
      pct: quote.changePercent,
      lastUpdated: now,
      source: sourceLabel(quote),
      quality: 'delayed' as const,
    }]
  })
}
