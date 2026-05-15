'use client'
import useSWR from 'swr'
import { clsx } from 'clsx'
import type { NewsItem } from '@/types'
import TerminalCard from '@/components/ui/TerminalCard'
import { formatRelativeTime } from '@/lib/utils/formatters'
import { SkeletonNewsItem } from '@/components/ui/Skeleton'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const CATEGORY_COLORS: Record<string, string> = {
  makro: 'text-[#ffaa00] border-[#ffaa00]',
  krypto: 'text-[#00cccc] border-[#00cccc]',
  wyniki: 'text-[#0099ff] border-[#0099ff]',
  tech: 'text-[#00ff41] border-[#00ff41]',
  default: 'text-[#555] border-[#444]',
}

export default function NewsPanel() {
  const { data: news = [], isLoading } = useSWR<NewsItem[]>('/api/news', fetcher, {
    refreshInterval: 300000,
    revalidateOnFocus: false,
  })

  return (
    <TerminalCard title="Wiadomości" badge="RSS" badgeColor="amber" className="h-full">
      {isLoading && !news.length ? (
        <div className="flex flex-col">
          {Array.from({ length: 7 }).map((_, i) => <SkeletonNewsItem key={i} />)}
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-[#1c1c1c] overflow-auto">
          {news.map(item => (
            <NewsEntry key={item.id} item={item} />
          ))}
          {!news.length && (
            <div className="p-3 text-[#555] text-xs">Brak dostępnych wiadomości.</div>
          )}
        </div>
      )}
    </TerminalCard>
  )
}

function NewsEntry({ item }: { item: NewsItem }) {
  const colorClass = item.category
    ? CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS.default
    : CATEGORY_COLORS.default

  return (
    <a
      href={item.url !== '#' ? item.url : undefined}
      target={item.url !== '#' ? '_blank' : undefined}
      rel={item.url !== '#' ? 'noopener noreferrer' : undefined}
      className={`block px-3 py-2 hover:bg-[#111] transition-colors group ${item.url !== '#' ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-[11px] text-[#c8c8c8] leading-snug group-hover:text-[#00ff41] transition-colors line-clamp-2">
          {item.title}
        </p>
        {item.category && (
          <span className={clsx('border px-1 py-0.5 text-[9px] font-bold shrink-0 uppercase', colorClass)}>
            {item.category}
          </span>
        )}
      </div>
      {item.summary && (
        <p className="text-[10px] text-[#555] line-clamp-1 mb-1">{item.summary}</p>
      )}
      <div className="flex items-center gap-2 text-[9px] text-[#555]">
        <span className="text-[#ffaa00]">{item.source}</span>
        <span>·</span>
        <span>{formatRelativeTime(item.publishedAt)}</span>
      </div>
    </a>
  )
}
