import type { AssetPrice, OHLCBar } from '@/types'

const BASE = 'https://api.coingecko.com/api/v3'

const COIN_IDS: Record<string, string> = {
  BTC:   'bitcoin',
  ETH:   'ethereum',
  SOL:   'solana',
  XRP:   'ripple',
  BNB:   'binancecoin',
  ADA:   'cardano',
  AVAX:  'avalanche-2',
  DOT:   'polkadot',
  MATIC: 'matic-network',
  POL:   'matic-network',
  LINK:  'chainlink',
  DOGE:  'dogecoin',
  SHIB:  'shiba-inu',
  TON:   'the-open-network',
  TRX:   'tron',
  LTC:   'litecoin',
  BCH:   'bitcoin-cash',
  ATOM:  'cosmos',
  UNI:   'uniswap',
  NEAR:  'near',
  OP:    'optimism',
  ARB:   'arbitrum',
  SUI:   'sui',
  APT:   'aptos',
  PEPE:  'pepe',
  FIL:   'filecoin',
  ICP:   'internet-computer',
  HBAR:  'hedera-hashgraph',
}

function headers(): HeadersInit {
  const key = process.env.COINGECKO_API_KEY
  return key ? { 'x-cg-demo-api-key': key } : {}
}

export function getCoinId(symbol: string): string | undefined {
  return COIN_IDS[symbol.toUpperCase()]
}

export async function fetchCryptoPrices(symbols: string[]): Promise<AssetPrice[]> {
  const ids = symbols
    .map(s => getCoinId(s))
    .filter(Boolean)
    .join(',')

  if (!ids) return []

  const url = `${BASE}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`
  const res = await fetch(url, {
    headers: headers(),
    next: { revalidate: 30 },
  })

  if (!res.ok) throw new Error(`CoinGecko ${res.status}`)
  const data = await res.json()

  return symbols
    .filter(s => getCoinId(s))
    .map(symbol => {
      const id = getCoinId(symbol)!
      const d = data[id]
      if (!d) return null

      return {
        symbol,
        name: symbol,
        price: d.usd ?? 0,
        change24h: ((d.usd_24h_change ?? 0) / 100) * d.usd,
        changePercent24h: d.usd_24h_change ?? 0,
        volume24h: d.usd_24h_vol ?? 0,
        marketCap: d.usd_market_cap ?? 0,
        type: 'crypto' as const,
        lastUpdated: new Date().toISOString(),
      }
    })
    .filter(Boolean) as AssetPrice[]
}

export async function fetchCryptoOHLC(symbol: string, days = 30): Promise<OHLCBar[]> {
  const id = getCoinId(symbol)
  if (!id) throw new Error(`Unknown coin: ${symbol}`)

  const url = `${BASE}/coins/${id}/ohlc?vs_currency=usd&days=${days}`
  const res = await fetch(url, {
    headers: headers(),
    next: { revalidate: 300 },
  })

  if (!res.ok) throw new Error(`CoinGecko OHLC ${res.status}`)
  const data: [number, number, number, number, number][] = await res.json()

  return data.map(([ts, open, high, low, close]) => ({
    time: new Date(ts).toISOString().split('T')[0],
    open,
    high,
    low,
    close,
  }))
}
