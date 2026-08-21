'use client'
import useSWR from 'swr'
import type { NewsItem } from '@/types'

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

export default function NewsTickerBar() {
  const { data: news = [], error } = useSWR<NewsItem[]>('/api/news', fetcher, {
    refreshInterval: 300000,
    revalidateOnFocus: false,
  })

  if (news.length === 0) {
    return (
      <div className="bg-[#050505] border-t border-[#1c1c1c] shrink-0 flex items-center text-[10px]" style={{ height: 22 }}>
        <span className="text-[9px] font-bold text-[#ffaa00] px-2 tracking-widest">NEWS</span>
        <span className={error ? 'text-[#ff0040]' : 'text-[#444]'}>
          {error ? 'Wiadomości chwilowo niedostępne' : 'Pobieranie aktualnych wiadomości…'}
        </span>
      </div>
    )
  }

  const doubled = [...news, ...news]

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
