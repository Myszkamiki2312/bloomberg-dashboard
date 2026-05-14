export function calculateRSI(prices: number[], period = 14): number {
  if (prices.length < period + 1) return 50

  const changes = prices.slice(1).map((price, i) => price - prices[i])
  const gains = changes.map(c => (c > 0 ? c : 0))
  const losses = changes.map(c => (c < 0 ? Math.abs(c) : 0))

  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period

  for (let i = period; i < changes.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period
  }

  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return Math.round(100 - 100 / (1 + rs))
}

export function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] ?? 0
  const slice = prices.slice(-period)
  return slice.reduce((a, b) => a + b, 0) / period
}

export function calculateVolatility(prices: number[]): number {
  if (prices.length < 2) return 0
  const returns = prices.slice(1).map((p, i) => Math.log(p / prices[i]))
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length
  return Math.round(Math.sqrt(variance) * Math.sqrt(252) * 100 * 10) / 10
}

export function getTrend(prices: number[]): 'bullish' | 'bearish' | 'neutral' {
  if (prices.length < 20) return 'neutral'
  const sma20 = calculateSMA(prices, 20)
  const sma50 = calculateSMA(prices, Math.min(50, prices.length))
  const current = prices[prices.length - 1]

  if (current > sma20 && sma20 > sma50) return 'bullish'
  if (current < sma20 && sma20 < sma50) return 'bearish'
  return 'neutral'
}
