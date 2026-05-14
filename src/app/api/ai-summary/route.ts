import { NextResponse } from 'next/server'
import { getMockAISummary } from '@/lib/adapters/mock'
import type { MarketSummary } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PROMPT =
  'Jesteś analitykiem rynku finansowego. Napisz aktualne krótkie podsumowanie nastrojów rynkowych po polsku. ' +
  'Odpowiedz WYŁĄCZNIE jako JSON (bez markdown): ' +
  '{ "sentiment": "bullish|bearish|neutral", "sentimentScore": 0-100, "summary": "2-3 zdania", ' +
  '"keyPoints": ["max 5 punktów"], "sectors": [{"name": "nazwa", "performance": liczba_procent}] }. ' +
  'Uwzględnij: krypto, akcje US, Europa, surowce. Sektory: Technologia, Krypto, Energia, Finanse, Zdrowie, Przemysł.'

export async function GET() {
  const groqKey      = process.env.GROQ_API_KEY
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  const openaiKey    = process.env.OPENAI_API_KEY

  // Kolejność: Groq (darmowy) → Anthropic → OpenAI → mock
  if (groqKey) {
    try {
      return NextResponse.json(await fetchGroqSummary(groqKey))
    } catch (err) {
      console.error('Groq error:', err)
    }
  }

  if (anthropicKey) {
    try {
      return NextResponse.json(await fetchAnthropicSummary(anthropicKey))
    } catch (err) {
      console.error('Anthropic error:', err)
    }
  }

  if (openaiKey) {
    try {
      return NextResponse.json(await fetchOpenAISummary(openaiKey))
    } catch (err) {
      console.error('OpenAI error:', err)
    }
  }

  return NextResponse.json(getMockAISummary(), {
    headers: { 'Cache-Control': 'public, s-maxage=300' },
  })
}

async function fetchGroqSummary(apiKey: string): Promise<MarketSummary> {
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
      messages: [{ role: 'user', content: PROMPT }],
      response_format: { type: 'json_object' },
    }),
    signal: AbortSignal.timeout(12000),
  })

  if (!res.ok) throw new Error(`Groq ${res.status}`)
  const data = await res.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('Groq: empty response')
  const parsed = JSON.parse(content)
  return { ...parsed, timestamp: new Date().toISOString(), isDemo: false }
}

async function fetchAnthropicSummary(apiKey: string): Promise<MarketSummary> {
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
      messages: [{ role: 'user', content: PROMPT }],
    }),
    signal: AbortSignal.timeout(12000),
  })

  if (!res.ok) throw new Error(`Anthropic ${res.status}`)
  const data = await res.json()
  const text = data.content?.[0]?.text
  if (!text) throw new Error('Anthropic: empty content')
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Anthropic: no JSON in response')
  const parsed = JSON.parse(jsonMatch[0])
  return { ...parsed, timestamp: new Date().toISOString(), isDemo: false }
}

async function fetchOpenAISummary(apiKey: string): Promise<MarketSummary> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 600,
      messages: [{ role: 'user', content: PROMPT }],
      response_format: { type: 'json_object' },
    }),
    signal: AbortSignal.timeout(12000),
  })

  if (!res.ok) throw new Error(`OpenAI ${res.status}`)
  const data = await res.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('OpenAI: empty choices')
  const parsed = JSON.parse(content)
  return { ...parsed, timestamp: new Date().toISOString(), isDemo: false }
}
