import { NextResponse } from 'next/server'
import { getMockNews } from '@/lib/adapters/mock'
import type { NewsItem } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface FeedConfig {
  url: string
  source: string
  lang: 'pl' | 'en'
}

// Polskie źródła pierwsze — angielskie jako uzupełnienie
const RSS_FEEDS: FeedConfig[] = [
  { url: 'https://www.bankier.pl/rss/wiadomosci.xml',          source: 'Bankier.pl',     lang: 'pl' },
  { url: 'https://www.bankier.pl/rss/gielda.xml',              source: 'Bankier Giełda', lang: 'pl' },
  { url: 'https://www.money.pl/rss/wiadomosci_gospodarcze.xml',source: 'Money.pl',       lang: 'pl' },
  { url: 'https://feeds.a.dj.com/rss/RSSMarketsMain.xml',      source: 'WSJ Markets',    lang: 'en' },
  { url: 'https://finance.yahoo.com/rss/topstories',            source: 'Yahoo Finance',  lang: 'en' },
  { url: 'https://feeds.finance.yahoo.com/rss/2.0/headline?s=BTC-USD,ETH-USD&region=US&lang=en-US',
                                                                source: 'Yahoo Crypto',   lang: 'en' },
]

async function parseRSSFeed(feed: FeedConfig): Promise<NewsItem[]> {
  const res = await fetch(feed.url, {
    headers: { 'User-Agent': 'Mozilla/5.0 Bloomberg-Dashboard/1.0' },
    signal: AbortSignal.timeout(5000),
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`RSS ${res.status}`)

  const xml = await res.text()
  const items: NewsItem[] = []
  const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g)

  for (const match of itemMatches) {
    if (items.length >= 12) break
    const block = match[1]

    const title =
      block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)?.[1] ??
      block.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? ''

    const link =
      block.match(/<link>(.*?)<\/link>/)?.[1] ??
      block.match(/<guid[^>]*>(.*?)<\/guid>/)?.[1] ?? '#'

    const description =
      block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/)?.[1] ??
      block.match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? ''

    const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? ''

    if (!title.trim()) continue

    // Decode HTML entities in title
    const cleanTitle = title.trim()
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&nbsp;/g, ' ')

    const rawSummary = description.replace(/<[^>]*>/g, '').trim()
    const cleanSummary = rawSummary
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&nbsp;/g, ' ')
      .slice(0, 200)

    items.push({
      id: (link + pubDate).slice(0, 120),
      title: cleanTitle,
      summary: cleanSummary,
      url: link.trim(),
      source: feed.source,
      publishedAt: (() => { try { return pubDate ? new Date(pubDate).toISOString() : new Date().toISOString() } catch { return new Date().toISOString() } })(),
      category: feed.lang === 'pl' ? 'pl' : undefined,
    })
  }

  return items
}

export async function GET() {
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

  if (demoMode) {
    return NextResponse.json(getMockNews())
  }

  const results = await Promise.allSettled(RSS_FEEDS.map(parseRSSFeed))

  const plNews: NewsItem[] = []
  const enNews: NewsItem[] = []

  for (const result of results) {
    if (result.status !== 'fulfilled') continue
    for (const item of result.value) {
      if (item.category === 'pl') plNews.push(item)
      else enNews.push(item)
    }
  }

  // Prefer Polish, fill remainder with English if needed
  const combined = [...plNews, ...enNews]

  if (combined.length === 0) {
    return NextResponse.json(getMockNews())
  }

  const seen = new Set<string>()
  const unique = combined.filter(item => {
    const key = item.title.slice(0, 60)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // Remove internal lang tag before sending to client
  const output = unique.slice(0, 24).map(({ category: _c, ...item }) => item)

  return NextResponse.json(output, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  })
}
