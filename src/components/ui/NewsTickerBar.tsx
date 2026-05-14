'use client'
import useSWR from 'swr'
import type { NewsItem } from '@/types'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const FALLBACK: NewsItem[] = [
  { id: '1', title: 'Fed utrzymuje stopy procentowe bez zmian — Powell sygnalizuje ostrożność',    url: '#', source: '', publishedAt: '', summary: '' },
  { id: '2', title: 'Bitcoin stabilizuje się powyżej 67 000 USD — napływy do ETF rekordowe',      url: '#', source: '', publishedAt: '', summary: '' },
  { id: '3', title: 'NVIDIA wyniki Q1: przychody AI wzrosły 427% rok do roku',                    url: '#', source: '', publishedAt: '', summary: '' },
  { id: '4', title: 'PKB Niemiec -0.2% — recesja techniczna potwierdzona przez Destatis',         url: '#', source: '', publishedAt: '', summary: '' },
  { id: '5', title: 'Apple zapowiada chip M4 — Neural Engine 3x szybszy od M3',                  url: '#', source: '', publishedAt: '', summary: '' },
  { id: '6', title: 'Ethereum po Dencun: opłaty L2 spadły o ponad 90% w ciągu tygodnia',         url: '#', source: '', publishedAt: '', summary: '' },
]

export default function NewsTickerBar() {
  const { data: news = [] } = useSWR<NewsItem[]>('/api/news', fetcher, { refreshInterval: 300000 })

  const items = news.length > 0 ? news : FALLBACK
  const doubled = [...items, ...items]

  return (
    <div
      className="bg-[#050505] border-t border-[#1c1c1c] shrink-0 overflow-hidden relative"
      style={{ height: 22 }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-16 z-10 pointer-events-none flex items-center"
           style={{ background: 'linear-gradient(to right, #050505 60%, transparent)' }}>
        <span className="text-[9px] font-bold text-[#ffaa00] pl-2 tracking-widest">NEWS</span>
      </div>
      <div className="absolute right-0 top-0 bottom-0 w-8 z-10 pointer-events-none"
           style={{ background: 'linear-gradient(to left, #050505, transparent)' }} />

      <div className="flex items-center h-full" style={{ paddingLeft: 60 }}>
        <div className="ticker-inner h-full items-center">
          {doubled.map((item, i) => (
            <span key={`${item.id}-${i}`} className="flex items-center shrink-0">
              <a
                href={item.url !== '#' ? item.url : undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-[#777] px-4 hover:text-[#ffaa00] transition-colors cursor-pointer whitespace-nowrap"
                style={{ textDecoration: 'none' }}
              >
                {item.title}
              </a>
              <span className="text-[#222] shrink-0">◆</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
