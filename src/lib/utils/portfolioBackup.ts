import type { PortfolioCurrency, PriceAlert, WatchlistEntry } from '@/types'
import { isPortfolioCurrency } from './currency'

export interface PortfolioBackupV1 {
  version: 1
  exportedAt: string
  baseCurrency: PortfolioCurrency
  watchlist: WatchlistEntry[]
  alerts: PriceAlert[]
}

function optionalPositiveNumber(value: unknown): number | undefined {
  if (value == null || value === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
}

function parseWatchlist(value: unknown): WatchlistEntry[] {
  if (!Array.isArray(value)) throw new Error('Plik nie zawiera prawidłowej watchlisty')
  const seen = new Set<string>()

  return value.slice(0, 100).flatMap(item => {
    if (typeof item !== 'object' || item === null) return []
    const raw = item as Record<string, unknown>
    const symbol = String(raw.symbol ?? '').replace(/[^A-Z0-9.\-]/gi, '').toUpperCase().slice(0, 12)
    const type = raw.type === 'stock' || raw.type === 'crypto' ? raw.type : null
    if (!symbol || !type || seen.has(symbol)) return []
    seen.add(symbol)

    const quantity = optionalPositiveNumber(raw.quantity)
    const avgPrice = optionalPositiveNumber(raw.avgPrice)
    const purchaseFxRateToPln = optionalPositiveNumber(raw.purchaseFxRateToPln)
    return [{
      symbol,
      name: String(raw.name ?? symbol).slice(0, 100),
      type,
      ...(typeof raw.coinId === 'string' ? { coinId: raw.coinId.slice(0, 100) } : {}),
      ...(quantity !== undefined ? { quantity } : {}),
      ...(avgPrice !== undefined ? { avgPrice } : {}),
      ...(purchaseFxRateToPln !== undefined ? { purchaseFxRateToPln } : {}),
    }]
  })
}

function parseAlerts(value: unknown): PriceAlert[] {
  if (!Array.isArray(value)) return []
  return value.slice(0, 200).flatMap((item, index) => {
    if (typeof item !== 'object' || item === null) return []
    const raw = item as Record<string, unknown>
    const symbol = String(raw.symbol ?? '').replace(/[^A-Z0-9.\-]/gi, '').toUpperCase().slice(0, 12)
    const targetPrice = Number(raw.targetPrice)
    const direction = raw.direction === 'above' || raw.direction === 'below' ? raw.direction : null
    if (!symbol || !Number.isFinite(targetPrice) || targetPrice <= 0 || !direction) return []

    return [{
      id: typeof raw.id === 'string' ? raw.id.slice(0, 100) : `import-${Date.now()}-${index}`,
      symbol,
      targetPrice,
      direction,
      active: raw.active !== false,
      triggered: raw.triggered === true,
      createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
    }]
  })
}

export function createPortfolioBackup(
  watchlist: WatchlistEntry[],
  alerts: PriceAlert[],
  baseCurrency: PortfolioCurrency
): PortfolioBackupV1 {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    baseCurrency,
    watchlist,
    alerts,
  }
}

export function parsePortfolioBackup(value: unknown): PortfolioBackupV1 {
  if (typeof value !== 'object' || value === null) throw new Error('Nieprawidłowy plik JSON')
  const raw = value as Record<string, unknown>
  const watchlist = parseWatchlist(raw.watchlist)
  if (watchlist.length === 0) throw new Error('Plik nie zawiera żadnego prawidłowego symbolu')
  const baseCurrency = isPortfolioCurrency(String(raw.baseCurrency ?? ''))
    ? raw.baseCurrency as PortfolioCurrency
    : 'PLN'

  return {
    version: 1,
    exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : new Date().toISOString(),
    baseCurrency,
    watchlist,
    alerts: parseAlerts(raw.alerts),
  }
}
