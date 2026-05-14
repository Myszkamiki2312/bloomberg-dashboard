import { clsx } from 'clsx'

interface SkeletonBarProps {
  width?: string
  className?: string
}

export function SkeletonBar({ width = 'w-full', className }: SkeletonBarProps) {
  return (
    <div className={clsx('animate-pulse bg-[#151515] rounded-sm h-2.5', width, className)} />
  )
}

export function SkeletonRow({ cols = 3 }: { cols?: number }) {
  const widths = ['w-16', 'flex-1', 'w-12', 'w-10']
  return (
    <div className="flex items-center gap-2 px-2 py-2 border-b border-[#0f0f0f]">
      {Array.from({ length: cols }).map((_, i) => (
        <SkeletonBar key={i} width={widths[i] ?? 'w-12'} />
      ))}
    </div>
  )
}

export function SkeletonNewsItem() {
  return (
    <div className="px-3 py-2 border-b border-[#0f0f0f] flex flex-col gap-1.5">
      <SkeletonBar />
      <SkeletonBar width="w-3/4" />
      <SkeletonBar width="w-1/3" className="h-1.5" />
    </div>
  )
}

export function SkeletonBlock({ rows = 6, cols = 3 }: { rows?: number; cols?: number }) {
  return (
    <div className="flex flex-col">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} cols={cols} />
      ))}
    </div>
  )
}
