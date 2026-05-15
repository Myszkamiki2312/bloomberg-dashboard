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
  { symbol: 'BTC',  name: 'Bitcoin',        price: 79300,   change24h: -1420,   changePercent24h: -1.76, volume24h: 32_000_000_000, marketCap: 1_572_000_000_000, type: 'crypto' as const },
  { symbol: 'ETH',  name: 'Ethereum',       price: 2229,    change24h: -61,     changePercent24h: -2.66, volume24h: 14_000_000_000, marketCap: 269_000_000_000,   type: 'crypto' as const },
  { symbol: 'SOL',  name: 'Solana',         price: 89.5,    change24h: -2.6,    changePercent24h: -2.82, volume24h: 3_600_000_000,  marketCap: 46_000_000_000,    type: 'crypto' as const },
  { symbol: 'AAPL', name: 'Apple Inc.',     price: 298.2,   change24h: 2.6,     changePercent24h: 0.88,  volume24h: 48_000_000,     marketCap: 4_500_000_000_000, type: 'stock'  as const },
  { symbol: 'NVDA', name: 'NVIDIA Corp.',   price: 235.7,   change24h: 3.4,     changePercent24h: 1.46,  volume24h: 280_000_000,    marketCap: 5_740_000_000_000, type: 'stock'  as const },
  { symbol: 'TSLA', name: 'Tesla Inc.',     price: 443.3,   change24h: -11.2,   changePercent24h: -2.46, volume24h: 110_000_000,    marketCap: 1_424_000_000_000, type: 'stock'  as const },
  { symbol: 'MSFT', name: 'Microsoft Corp.',price: 409.4,   change24h: 2.9,     changePercent24h: 0.71,  volume24h: 22_000_000,     marketCap: 3_050_000_000_000, type: 'stock'  as const },
  { symbol: 'XRP',  name: 'XRP',            price: 1.446,   change24h: -0.041,  changePercent24h: -2.76, volume24h: 3_800_000_000,  marketCap: 83_000_000_000,    type: 'crypto' as const },
]

export function getMockPrices(): AssetPrice[] {
  const now = new Date().toISOString()
  return MOCK_PRICES_BASE.map(p => ({ ...p, lastUpdated: now }))
}

const BASE_PRICES: Record<string, number> = {
  BTC: 79300,
  ETH: 2229,
  SOL: 89.5,
  AAPL: 298,
  NVDA: 236,
  TSLA: 443,
  MSFT: 409,
  XRP: 1.446,
}

export function getMockOHLC(symbol: string, days = 90): OHLCBar[] {
  const base = BASE_PRICES[symbol] ?? 100
  return generateOHLC(base, days, symbol.charCodeAt(0) * 17)
}

const NEWS_OFFSETS_MS = [15 * 60000, 45 * 60000, 2 * 3600000, 3 * 3600000, 5 * 3600000, 7 * 3600000]
const NEWS_BASE: Omit<NewsItem, 'publishedAt'>[] = [
  { id: '1', title: 'Fed utrzymuje stopy — Powell sygnalizuje ostrożność wobec inflacji usługowej', summary: 'Rezerwa Federalna pozostawiła stopy bez zmian. Powell podkreślił, że inflacja usługowa pozostaje powyżej celu i bank centralny nie spieszy się z obniżkami.', url: '#', source: 'Bloomberg (DEMO)', category: 'makro' },
  { id: '2', title: 'Bitcoin testuje 79 000 USD — kluczowe wsparcie utrzymane mimo korekty', summary: 'Spot Bitcoin ETF odnotowały umiarkowane odpływy. Analitycy wskazują na wsparcie w okolicy 78 000–80 000 USD jako kluczową strefę.', url: '#', source: 'CoinDesk (DEMO)', category: 'krypto' },
  { id: '3', title: 'NVIDIA kapitalizacja 5,7 bln USD — wyprzedziła Apple i Microsoft', summary: 'Producent chipów AI stał się najwyżej wycenianą spółką na świecie. Popyt na układy H100/H200 wciąż przewyższa podaż.', url: '#', source: 'Reuters (DEMO)', category: 'wyniki' },
  { id: '4', title: 'Złoto rekordowe na 3 238 USD — banki centralne kupują historycznie', summary: 'Popyt banków centralnych na złoto osiągnął najwyższy poziom od dekad. Słabszy dolar i napięcia geopolityczne napędzają wzrosty.', url: '#', source: 'FT (DEMO)', category: 'makro' },
  { id: '5', title: 'Apple Intelligence przyspiesza — sprzedaż iPhone w Chinach rośnie', summary: 'Nowe funkcje AI w iOS zwiększyły sprzedaż w Azji. Akcja Apple wzrosła 18% od początku roku, kapitalizacja przekroczyła 4,5 bln USD.', url: '#', source: 'The Verge (DEMO)', category: 'tech' },
  { id: '6', title: 'Ethereum 2 400 USD — aktualizacja Pectra zwiększa przepustowość sieci', summary: 'Najnowsza aktualizacja Ethereum podwoiła przepustowość. Opłaty transakcyjne na L2 pozostają na historycznie niskich poziomach.', url: '#', source: 'Decrypt (DEMO)', category: 'krypto' },
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
  { id: '1',  daysFromNow: 0, time: '08:30', country: 'POL', flag: '🇵🇱', event: 'Sprzedaż detaliczna (Polska)', importance: 'medium', forecast: '4.1%',  previous: '3.8%' },
  { id: '2',  daysFromNow: 0, time: '14:30', country: 'USA', flag: '🇺🇸', event: 'CPI m/m',                      importance: 'high',   forecast: '0.3%',  previous: '0.4%' },
  { id: '3',  daysFromNow: 0, time: '16:00', country: 'USA', flag: '🇺🇸', event: 'Nastroje konsumentów (Mich.)', importance: 'medium', forecast: '79.0',  previous: '77.2', actual: '78.8' },
  { id: '4',  daysFromNow: 1, time: '08:00', country: 'POL', flag: '🇵🇱', event: 'CPI r/r (Polska)',             importance: 'medium', forecast: '3.2%',  previous: '2.8%' },
  { id: '5',  daysFromNow: 1, time: '10:00', country: 'EUZ', flag: '🇪🇺', event: 'Decyzja EBC ws. stóp proc.',  importance: 'high',   forecast: '4.50%', previous: '4.50%' },
  { id: '6',  daysFromNow: 1, time: '13:30', country: 'GBR', flag: '🇬🇧', event: 'PKB m/m (Wielka Brytania)',   importance: 'medium', forecast: '0.1%',  previous: '0.3%' },
  { id: '7',  daysFromNow: 2, time: '14:30', country: 'USA', flag: '🇺🇸', event: 'Wnioski o zasiłek (tyg.)',     importance: 'low',    forecast: '215K',  previous: '212K' },
  { id: '8',  daysFromNow: 2, time: '16:30', country: 'USA', flag: '🇺🇸', event: 'Zapasy ropy EIA',              importance: 'medium', forecast: '-1.2M', previous: '+0.8M' },
  { id: '9',  daysFromNow: 3, time: '14:30', country: 'USA', flag: '🇺🇸', event: 'NFP — zmiana zatrudnienia',    importance: 'high',   forecast: '185K',  previous: '275K' },
  { id: '10', daysFromNow: 3, time: '14:30', country: 'USA', flag: '🇺🇸', event: 'Stopa bezrobocia USA',         importance: 'high',   forecast: '3.9%',  previous: '4.0%' },
  { id: '11', daysFromNow: 4, time: '09:00', country: 'DEU', flag: '🇩🇪', event: 'Inflacja HICP (Niemcy) r/r',  importance: 'medium', forecast: '2.8%',  previous: '2.6%' },
  { id: '12', daysFromNow: 5, time: '14:30', country: 'USA', flag: '🇺🇸', event: 'Sprzedaż detaliczna m/m',     importance: 'high',   forecast: '0.4%',  previous: '-0.1%' },
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
    sentiment: 'neutral',
    sentimentScore: 48,
    summary:
      'Korekta na rynkach krypto — Bitcoin cofa się do okolic 79 000 USD po wcześniejszych wzrostach. Akcje US stabilne dzięki silnym wynikom sektora technologicznego. Złoto rekordowe powyżej 3 200 USD, odzwierciedlając obawy o inflację i napięcia geopolityczne.',
    keyPoints: [
      'Bitcoin testuje wsparcie w okolicy 79 000 USD po korekcie',
      'NVIDIA napędza wzrosty AI — kapitalizacja powyżej 5,7 bln USD',
      'Złoto > 3 200 USD/oz — historyczny szczyt, popyt banków centralnych silny',
      'S&P 500 blisko historycznych maksimów mimo zmienności',
      'Fed: ostrożność wobec inflacji, rynek wycenia 1 obniżkę w 2025',
    ],
    sectors: [
      { name: 'Technologia', performance: 1.2 },
      { name: 'Krypto', performance: -1.8 },
      { name: 'Energia', performance: -1.1 },
      { name: 'Finanse', performance: 0.3 },
      { name: 'Ochrona zdrowia', performance: 0.5 },
      { name: 'Przemysł', performance: -0.4 },
    ],
    timestamp: new Date().toISOString(),
    isDemo: true,
  }
}
