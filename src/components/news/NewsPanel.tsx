'use client'
import useSWR from 'swr'
import { clsx } from 'clsx'
import type { NewsItem } from '@/types'
import TerminalCard from '@/components/ui/TerminalCard'
import { formatRelativeTime } from '@/lib/utils/formatters'
import { SkeletonNewsItem } from '@/components/ui/Skeleton'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const CATEGORY_COLORS: Record<string, string> = {
  makro: 'text-terminal-amber border-terminal-amber',
  krypto: 'text-terminal-cyan border-terminal-cyan',
  wyniki: 'text-terminal-blue border-terminal-blue',
  tech: 'text-terminal-green border-terminal-green',
  default: 'text-terminal-muted border-terminal-muted',
}

export default function NewsPanel() {
  const { data: news = [], isLoading } = useSWR<NewsItem[]>('/api/news', fetcher, {
    refreshInterval: 300000,
  })

  return (
    <TerminalCard title="Wiadomości" badge="RSS" badgeColor="amber" className="h-full">
      {isLoading && !news.length ? (
        <div className="flex flex-col">
          {Array.from({ length: 7 }).map((_, i) => <SkeletonNewsItem key={i} />)}
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-terminal-border overflow-auto">
          {news.map(item => (
            <NewsEntry key={item.id} item={item} />
          ))}
          {!news.length && (
            <div className="p-3 text-terminal-muted text-xs">Brak dostępnych wiadomości.</div>
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
      target="_blank"
      rel="noopener noreferrer"
      className="block px-3 py-2 hover:bg-terminal-border transition-colors cursor-pointer group"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-[11px] text-terminal-text leading-snug group-hover:text-terminal-green transition-colors line-clamp-2">
          {item.title}
        </p>
        {item.category && (
          <span className={clsx('border px-1 py-0.5 text-[9px] font-bold shrink-0 uppercase', colorClass)}>
            {item.category}
          </span>
        )}
      </div>
      {item.summary && (
        <p className="text-[10px] text-terminal-muted line-clamp-1 mb-1">{item.summary}</p>
      )}
      <div className="flex items-center gap-2 text-[9px] text-terminal-muted">
        <span className="text-terminal-amber">{item.source}</span>
        <span>·</span>
        <span>{formatRelativeTime(item.publishedAt)}</span>
      </div>
    </a>
  )
}
