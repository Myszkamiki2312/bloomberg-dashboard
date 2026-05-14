'use client'
import { clsx } from 'clsx'

interface TerminalCardProps {
  title: string
  children: React.ReactNode
  className?: string
  badge?: string
  badgeColor?: 'green' | 'red' | 'amber' | 'cyan' | 'blue' | 'muted'
  action?: React.ReactNode
  headerRight?: React.ReactNode
}

const BADGE_COLORS = {
  green:  'text-[#00ff41] border-[#00ff41]',
  red:    'text-[#ff0040] border-[#ff0040]',
  amber:  'text-[#ffaa00] border-[#ffaa00]',
  cyan:   'text-[#00cccc] border-[#00cccc]',
  blue:   'text-[#0099ff] border-[#0099ff]',
  muted:  'text-[#555] border-[#333]',
}

export default function TerminalCard({
  title,
  children,
  className,
  badge,
  badgeColor = 'green',
  action,
  headerRight,
}: TerminalCardProps) {
  return (
    <div className={clsx('flex flex-col overflow-hidden bg-[#080808]', className)}>
      {/* Panel header */}
      <div className="flex items-center justify-between border-b border-[#1c1c1c] px-2 shrink-0" style={{ height: 22 }}>
        <div className="flex items-center gap-2">
          {/* Corner accent */}
          <span className="text-[#333] text-[10px]">▌</span>
          <span className="text-[10px] font-bold tracking-[0.15em] text-[#ffaa00] uppercase">
            {title}
          </span>
          {badge && (
            <span className={clsx('border px-1 py-px text-[9px] font-bold tracking-wider', BADGE_COLORS[badgeColor])}>
              {badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {headerRight}
          {action}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto min-h-0">
        {children}
      </div>
    </div>
  )
}
