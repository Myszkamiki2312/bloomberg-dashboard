import type { AssetPrice, OHLCBar, NewsItem, EconomicEvent, MarketSummary } from '@/types'

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

function generateOHLC(basePrice: number, days: number, seed = 42): OHLCBar[] {
  const rng = seededRandom(seed)
  const bars: OHLCBar[] = []
  let price = basePrice

  for (let i = days; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]

    const volatility = 0.02
    const change = (rng() - 0.48) * volatility * price
    const open = price
    const close = price + change
    const high = Math.max(open, close) * (1 + rng() * 0.01)
    const low = Math.min(open, close) * (1 - rng() * 0.01)

    bars.push({
      time: dateStr,
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume: Math.round(rng() * 50000000 + 10000000),
    })
    price = close
  }
  return bars
}

const MOCK_PRICES_BASE = [
  { symbol: 'BTC',  name: 'Bitcoin',        price: 67420.5, change24h: 1243.2,  changePercent24h: 1.88,  volume24h: 28_500_000_000, marketCap: 1_327_000_000_000, type: 'crypto' as const },
  { symbol: 'ETH',  name: 'Ethereum',       price: 3521.8,  change24h: -45.3,   changePercent24h: -1.27, volume24h: 14_200_000_000, marketCap: 423_000_000_000,   type: 'crypto' as const },
  { symbol: 'SOL',  name: 'Solana',         price: 172.4,   change24h: 5.8,     changePercent24h: 3.48,  volume24h: 3_800_000_000,  marketCap: 79_000_000_000,    type: 'crypto' as const },
  { symbol: 'AAPL', name: 'Apple Inc.',     price: 189.3,   change24h: 2.1,     changePercent24h: 1.12,  volume24h: 52_000_000,     marketCap: 2_910_000_000_000, type: 'stock'  as const },
  { symbol: 'NVDA', name: 'NVIDIA Corp.',   price: 875.4,   change24h: -12.6,   changePercent24h: -1.42, volume24h: 38_000_000,     marketCap: 2_156_000_000_000, type: 'stock'  as const },
  { symbol: 'TSLA', name: 'Tesla Inc.',     price: 182.7,   change24h: 4.3,     changePercent24h: 2.41,  volume24h: 89_000_000,     marketCap: 582_000_000_000,   type: 'stock'  as const },
  { symbol: 'MSFT', name: 'Microsoft Corp.',price: 415.2,   change24h: 1.8,     changePercent24h: 0.44,  volume24h: 21_000_000,     marketCap: 3_085_000_000_000, type: 'stock'  as const },
  { symbol: 'XRP',  name: 'XRP',            price: 0.618,   change24h: -0.012,  changePercent24h: -1.9,  volume24h: 1_800_000_000,  marketCap: 34_000_000_000,    type: 'crypto' as const },
]

export function getMockPrices(): AssetPrice[] {
  const now = new Date().toISOString()
  return MOCK_PRICES_BASE.map(p => ({ ...p, lastUpdated: now }))
}

const BASE_PRICES: Record<string, number> = {
  BTC: 67420,
  ETH: 3521,
  SOL: 172,
  AAPL: 189,
  NVDA: 875,
  TSLA: 182,
  MSFT: 415,
  XRP: 0.618,
}

export function getMockOHLC(symbol: string, days = 90): OHLCBar[] {
  const base = BASE_PRICES[symbol] ?? 100
  return generateOHLC(base, days, symbol.charCodeAt(0) * 17)
}

const NEWS_OFFSETS_MS = [15 * 60000, 45 * 60000, 2 * 3600000, 3 * 3600000, 5 * 3600000, 7 * 3600000]
const NEWS_BASE: Omit<NewsItem, 'publishedAt'>[] = [
  { id: '1', title: 'Fed utrzymuje stopy procentowe bez zmian — Powell zapowiada ostrożność', summary: 'Rezerwa Federalna zdecydowała się nie zmieniać głównej stopy procentowej, sygnalizując dalszą ostrożność wobec trwałej inflacji.', url: '#', source: 'Bloomberg (DEMO)', category: 'makro' },
  { id: '2', title: 'Bitcoin przebija 67 000 USD — ETF spot przyciągają rekordowe napływy', summary: 'Spot Bitcoin ETF zarejestrowały w piątek napływ ponad 600 mln USD, windując cenę do najwyższego poziomu od tygodnia.', url: '#', source: 'CoinDesk (DEMO)', category: 'krypto' },
  { id: '3', title: 'NVIDIA bije prognozy — przychody AI wzrosły o 427% r/r', summary: 'Producent chipów opublikował wyniki znacznie powyżej oczekiwań analityków. Dział centrów danych odnotował rekordowe przychody.', url: '#', source: 'Reuters (DEMO)', category: 'wyniki' },
  { id: '4', title: 'PKB Niemiec kurczy się drugi kwartał z rzędu — recesja techniczna', summary: 'Największa gospodarka Europy oficjalnie weszła w recesję techniczną. Przemysł motoryzacyjny przeżywa największy kryzys od dekady.', url: '#', source: 'FT (DEMO)', category: 'makro' },
  { id: '5', title: 'Apple zapowiada nową generację chipów M4 — wydajność AI wzrośnie 3x', summary: 'Premiera nowej linii MacBook Pro z procesorem M4 planowana na jesień. Układ Neural Engine ma być 3-krotnie szybszy od poprzednika.', url: '#', source: 'The Verge (DEMO)', category: 'tech' },
  { id: '6', title: 'Ethereum po aktualizacji Dencun — opłaty na L2 spadły o 90%', summary: 'Proto-danksharding drastycznie obniżył koszty transakcji na sieciach drugiej warstwy. Arbitrum i Optimism notują rekordową aktywność.', url: '#', source: 'Decrypt (DEMO)', category: 'krypto' },
]

export function getMockNews(): NewsItem[] {
  const now = Date.now()
  return NEWS_BASE.map((item, i) => ({
    ...item,
    publishedAt: new Date(now - (NEWS_OFFSETS_MS[i] ?? 3600000)).toISOString(),
  }))
}

type CalendarBase = Omit<EconomicEvent, 'date'> & { daysFromNow: number }

const CALENDAR_BASE: CalendarBase[] = [
  { id: '1', daysFromNow: 0, time: '14:30', country: 'USA', flag: '🇺🇸', event: 'CPI m/m',                    importance: 'high',   forecast: '0.3%',  previous: '0.4%' },
  { id: '2', daysFromNow: 0, time: '16:00', country: 'USA', flag: '🇺🇸', event: 'Nastroje konsumentów (Mich.)', importance: 'medium', forecast: '79.0',  previous: '77.2', actual: '78.8' },
  { id: '3', daysFromNow: 1, time: '10:00', country: 'EUZ', flag: '🇪🇺', event: 'Decyzja EBC ws. stóp proc.',  importance: 'high',   forecast: '4.50%', previous: '4.50%' },
  { id: '4', daysFromNow: 1, time: '08:00', country: 'POL', flag: '🇵🇱', event: 'CPI r/r (Polska)',             importance: 'medium', forecast: '3.2%',  previous: '2.8%' },
  { id: '5', daysFromNow: 2, time: '14:30', country: 'USA', flag: '🇺🇸', event: 'Wnioski o zasiłek (tyg.)',     importance: 'low',    forecast: '215K',  previous: '212K' },
  { id: '6', daysFromNow: 3, time: '14:30', country: 'USA', flag: '🇺🇸', event: 'NFP — zmiana zatrudnienia',    importance: 'high',   forecast: '185K',  previous: '275K' },
]

export function getMockCalendar(): EconomicEvent[] {
  const now = Date.now()
  return CALENDAR_BASE.map(({ daysFromNow, ...rest }) => ({
    ...rest,
    date: new Date(now + daysFromNow * 86400000).toISOString().split('T')[0],
  }))
}

export function getMockAISummary(): MarketSummary {
  return {
    sentiment: 'bullish',
    sentimentScore: 63,
    summary:
      'Rynki wykazują umiarkowanie pozytywny sentyment. Sektor technologiczny prowadzi wzrosty napędzane wynikami NVIDIA i oczekiwaniami wokół AI. Rynek kryptowalut odrabia straty po korekcji — Bitcoin stabilizuje się powyżej kluczowego wsparcia na 65 000 USD. Główne ryzyko: dane inflacyjne z USA i możliwa zmiana narracji Fed.',
    keyPoints: [
      'Indeks S&P 500 testuje opór przy historycznych szczytach',
      'Napływy do Bitcoin ETF spot pozostają silne (600M USD/dzień)',
      'DXY (indeks dolara) słabnie — korzystne dla surowców i krypto',
      'Sektor energetyczny pod presją po danych OPEC',
      'Yield 10Y UST: 4.42% — rynek wycenia 2 obniżki Fed w 2024',
    ],
    sectors: [
      { name: 'Technologia', performance: 1.8 },
      { name: 'Krypto', performance: 2.1 },
      { name: 'Energia', performance: -0.9 },
      { name: 'Finanse', performance: 0.4 },
      { name: 'Ochrona zdrowia', performance: -0.2 },
      { name: 'Przemysł', performance: 0.7 },
    ],
    timestamp: new Date().toISOString(),
    isDemo: true,
  }
}
