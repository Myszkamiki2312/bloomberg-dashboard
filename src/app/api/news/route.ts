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

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
}

function canonicalUrl(value: string): string {
  if (value === '#') return value
  try {
    const url = new URL(value)
    return `${url.origin}${url.pathname}`.replace(/\/$/, '')
  } catch {
    return value.split('?')[0]
  }
}

function normalizedTitle(value: string): string {
  return value.toLocaleLowerCase('pl-PL').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

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

    const rawLink = decodeEntities(
      block.match(/<link>(.*?)<\/link>/)?.[1] ??
      block.match(/<guid[^>]*>(.*?)<\/guid>/)?.[1] ?? ''
    )
    // Only allow http/https URLs — reject javascript: and other dangerous schemes
    const link = /^https?:\/\//i.test(rawLink.trim()) ? rawLink.trim() : '#'

    const description =
      block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/)?.[1] ??
      block.match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? ''

    const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? ''

    if (!title.trim()) continue

    const cleanTitle = decodeEntities(title.trim())

    const rawSummary = description.replace(/<[^>]*>/g, '').trim()
    const cleanSummary = decodeEntities(rawSummary).slice(0, 200)

    // Use URL as ID when valid (unique per article); fall back to title slice
    const itemId = link !== '#'
      ? canonicalUrl(link).slice(0, 200)
      : (cleanTitle.slice(0, 80) + pubDate.slice(0, 30))

    items.push({
      id: itemId,
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
    return NextResponse.json(getMockNews(), {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    })
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
    return NextResponse.json(getMockNews(), {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    })
  }

  const seenUrls = new Set<string>()
  const seenTitles = new Set<string>()
  const unique = combined.filter(item => {
    const urlKey = canonicalUrl(item.url)
    const titleKey = normalizedTitle(item.title)
    if ((urlKey !== '#' && seenUrls.has(urlKey)) || seenTitles.has(titleKey)) return false
    if (urlKey !== '#') seenUrls.add(urlKey)
    seenTitles.add(titleKey)
    return true
  })

  // Remove internal lang tag before sending to client
  const output = unique.slice(0, 24).map(({ category: _c, ...item }) => item)

  return NextResponse.json(output, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  })
}
