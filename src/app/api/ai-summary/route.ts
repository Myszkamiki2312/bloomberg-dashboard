import { NextResponse } from 'next/server'
import { getMockAISummary } from '@/lib/adapters/mock'
import { getPrices } from '@/lib/adapters'
import type { AssetPrice, MarketSummary } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SUMMARY_SYMBOLS = [
  { symbol: 'BTC', type: 'crypto' as const },
  { symbol: 'ETH', type: 'crypto' as const },
  { symbol: 'SOL', type: 'crypto' as const },
  { symbol: 'AAPL', type: 'stock' as const },
  { symbol: 'NVDA', type: 'stock' as const },
  { symbol: 'MSFT', type: 'stock' as const },
]

function buildPrompt(prices: AssetPrice[]): string {
  const date = new Date().toLocaleDateString('pl-PL', { day: '2-digit', month: 'long', year: 'numeric' })
  const snapshot = prices.map(({ symbol, price, changePercent24h, source, quality, lastUpdated }) => ({
    symbol,
    price,
    changePercent24h,
    source,
    quality,
    lastUpdated,
  }))
  return (
    `Jesteś analitykiem rynku finansowego. Data: ${date}. ` +
    `Dostępny snapshot notowań: ${JSON.stringify(snapshot)}. ` +
    'Napisz krótkie podsumowanie nastrojów rynkowych po polsku wyłącznie na podstawie tego snapshotu. ' +
    'Nie podawaj poziomów, wydarzeń, prognoz ani faktów, których nie ma w danych wejściowych. ' +
    'Jeżeli danych jest za mało, powiedz to wprost. ' +
    'Odpowiedz WYŁĄCZNIE jako obiekt JSON (bez markdown, bez komentarzy): ' +
    '{"sentiment":"bullish","sentimentScore":63,"summary":"2-3 zdania po polsku.",' +
    '"keyPoints":["punkt 1","punkt 2","punkt 3"],' +
    '"sectors":[{"name":"Technologia","performance":1.5},{"name":"Krypto","performance":-0.8},' +
    '{"name":"Energia","performance":0.3},{"name":"Finanse","performance":0.7},' +
    '{"name":"Zdrowie","performance":-0.2},{"name":"Przemysł","performance":0.4}]}. ' +
    'sentiment: bullish/bearish/neutral. sentimentScore: liczba 0-100. ' +
    'performance: liczba dziesiętna (procent dzienny, np. 1.5 lub -0.8). '
  )
}

async function loadPriceSnapshot(): Promise<AssetPrice[]> {
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      getPrices(SUMMARY_SYMBOLS),
      new Promise<AssetPrice[]>(resolve => {
        timeout = setTimeout(() => resolve([]), 4500)
      }),
    ])
  } catch {
    return []
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

export async function GET() {
  const groqKey      = process.env.GROQ_API_KEY
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  const openaiKey    = process.env.OPENAI_API_KEY
  const prices = await loadPriceSnapshot()

  const AI_CACHE = { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }

  // Kolejność: Groq (darmowy) → Anthropic → OpenAI → mock
  if (groqKey) {
    try {
      return NextResponse.json(await fetchGroqSummary(groqKey, prices), AI_CACHE)
    } catch (err) {
      console.error('Groq error:', err)
    }
  }

  if (anthropicKey) {
    try {
      return NextResponse.json(await fetchAnthropicSummary(anthropicKey, prices), AI_CACHE)
    } catch (err) {
      console.error('Anthropic error:', err)
    }
  }

  if (openaiKey) {
    try {
      return NextResponse.json(await fetchOpenAISummary(openaiKey, prices), AI_CACHE)
    } catch (err) {
      console.error('OpenAI error:', err)
    }
  }

  return NextResponse.json(getMockAISummary(prices.length ? prices : undefined), {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  })
}

function extractJSON(text: string): unknown | null {
  try { return JSON.parse(text) } catch {}
  const start = text.indexOf('{')
  if (start === -1) return null
  for (let end = text.length - 1; end > start; end--) {
    if (text[end] !== '}') continue
    try { return JSON.parse(text.slice(start, end + 1)) } catch {}
  }
  return null
}

function validateSummary(obj: unknown): obj is MarketSummary {
  if (typeof obj !== 'object' || obj === null) return false
  const candidate = obj as Record<string, unknown>
  const validSentiments = ['bullish', 'bearish', 'neutral']
  return (
    typeof candidate.summary === 'string' && candidate.summary.length > 0 &&
    validSentiments.includes(candidate.sentiment as string) &&
    typeof candidate.sentimentScore === 'number' && isFinite(candidate.sentimentScore) &&
    Array.isArray(candidate.keyPoints) &&
    Array.isArray(candidate.sectors)
  )
}

async function fetchGroqSummary(apiKey: string, prices: AssetPrice[]): Promise<MarketSummary> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      max_tokens: 600,
      temperature: 0.7,
      messages: [{ role: 'user', content: buildPrompt(prices) }],
      response_format: { type: 'json_object' },
    }),
    signal: AbortSignal.timeout(12000),
  })

  if (!res.ok) throw new Error(`Groq ${res.status}`)
  const data = await res.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('Groq: empty response')
  const parsed = extractJSON(content) as Record<string, unknown>
  if (!parsed) throw new Error('Groq: no valid JSON in response')
  if (!validateSummary(parsed)) throw new Error('Groq: response missing required fields')
  return { ...parsed, timestamp: new Date().toISOString(), isDemo: false, source: 'Groq + snapshot notowań' }
}

async function fetchAnthropicSummary(apiKey: string, prices: AssetPrice[]): Promise<MarketSummary> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{ role: 'user', content: buildPrompt(prices) }],
    }),
    signal: AbortSignal.timeout(12000),
  })

  if (!res.ok) throw new Error(`Anthropic ${res.status}`)
  const data = await res.json()
  const text = data.content?.[0]?.text
  if (!text) throw new Error('Anthropic: empty content')
  const parsed = extractJSON(text) as Record<string, unknown>
  if (!parsed) throw new Error('Anthropic: no valid JSON in response')
  if (!validateSummary(parsed)) throw new Error('Anthropic: response missing required fields')
  return { ...parsed, timestamp: new Date().toISOString(), isDemo: false, source: 'Anthropic + snapshot notowań' }
}

async function fetchOpenAISummary(apiKey: string, prices: AssetPrice[]): Promise<MarketSummary> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 600,
      messages: [{ role: 'user', content: buildPrompt(prices) }],
      response_format: { type: 'json_object' },
    }),
    signal: AbortSignal.timeout(12000),
  })

  if (!res.ok) throw new Error(`OpenAI ${res.status}`)
  const data = await res.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('OpenAI: empty choices')
  const parsed = extractJSON(content) as Record<string, unknown>
  if (!parsed) throw new Error('OpenAI: no valid JSON in response')
  if (!validateSummary(parsed)) throw new Error('OpenAI: response missing required fields')
  return { ...parsed, timestamp: new Date().toISOString(), isDemo: false, source: 'OpenAI + snapshot notowań' }
}
