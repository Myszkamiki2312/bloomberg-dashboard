import type { MarketIndex, PortfolioCurrency } from '@/types'

export const PORTFOLIO_CURRENCIES: PortfolioCurrency[] = ['PLN', 'USD', 'EUR']

export type FxRatesToPln = Partial<Record<PortfolioCurrency, number>> & { PLN: 1 }

export function isPortfolioCurrency(currency: string | undefined): currency is PortfolioCurrency {
  return !!currency && PORTFOLIO_CURRENCIES.includes(currency as PortfolioCurrency)
}

export function buildFxRates(indices: MarketIndex[]): FxRatesToPln {
  const bySymbol = new Map(indices.map(index => [index.symbol, index.value]))
  const usdPln = bySymbol.get('USDPLN')
  const directEurPln = bySymbol.get('EURPLN')
  const eurUsd = bySymbol.get('EURUSD')
  const rates: FxRatesToPln = { PLN: 1 }

  if (usdPln && Number.isFinite(usdPln) && usdPln > 0) rates.USD = usdPln
  const eurPln = directEurPln && Number.isFinite(directEurPln) && directEurPln > 0
    ? directEurPln
    : usdPln && eurUsd && Number.isFinite(usdPln) && Number.isFinite(eurUsd)
      ? usdPln * eurUsd
      : undefined
  if (eurPln && eurPln > 0) rates.EUR = eurPln

  return rates
}

export function convertMoney(
  amount: number,
  from: PortfolioCurrency,
  to: PortfolioCurrency,
  ratesToPln: FxRatesToPln
): number | null {
  const fromRate = ratesToPln[from]
  const toRate = ratesToPln[to]
  if (!Number.isFinite(amount) || !fromRate || !toRate) return null
  return amount * fromRate / toRate
}

export function convertPlnToBase(
  amountPln: number,
  to: PortfolioCurrency,
  ratesToPln: FxRatesToPln
): number | null {
  const toRate = ratesToPln[to]
  if (!Number.isFinite(amountPln) || !toRate) return null
  return amountPln / toRate
}
