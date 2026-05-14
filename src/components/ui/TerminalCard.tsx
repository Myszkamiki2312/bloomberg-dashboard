'use client'
import { useState } from 'react'
import { clsx } from 'clsx'

interface TerminalCardProps {
  title: string
  children: React.ReactNode
  className?: string
  badge?: string
  badgeColor?: 'green' | 'red' | 'amber' | 'cyan' | 'blue' | 'muted'
  action?: React.ReactNode
  headerRight?: React.ReactNode
  minimizable?: boolean
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
  minimizable = true,
}: TerminalCardProps) {
  const [minimized, setMinimized] = useState(false)

  return (
    <div className={clsx('flex flex-col overflow-hidden bg-[#080808]', className)}>
      {/* Panel header */}
      <div
        className="flex items-center justify-between border-b border-[#1c1c1c] px-2 shrink-0 select-none"
        style={{ height: 22 }}
      >
        <div
          className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
          onClick={() => minimizable && setMinimized(m => !m)}
          title={minimizable ? (minimized ? 'Rozwiń panel' : 'Minimalizuj panel') : undefined}
        >
          <span className="text-[#333] text-[10px]">▌</span>
          <span className="text-[10px] font-bold tracking-[0.15em] text-[#ffaa00] uppercase truncate">
            {title}
          </span>
          {badge && (
            <span className={clsx('border px-1 py-px text-[9px] font-bold tracking-wider shrink-0', BADGE_COLORS[badgeColor])}>
              {badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {headerRight}
          {action}
          {minimizable && (
            <button
              onClick={() => setMinimized(m => !m)}
              className="text-[#444] hover:text-[#ffaa00] transition-colors text-[11px] w-5 text-center leading-none ml-1"
              title={minimized ? 'Rozwiń' : 'Minimalizuj'}
            >
              {minimized ? '▲' : '▼'}
            </button>
          )}
        </div>
      </div>

      {/* Content — hidden when minimized */}
      {!minimized && (
        <div className="flex-1 overflow-auto min-h-0">
          {children}
        </div>
      )}
    </div>
  )
}
