'use client'

interface FnItem {
  key: string
  label: string
}

const FN_KEYS: FnItem[] = [
  { key: 'F1', label: 'WATCHLISTA' },
  { key: 'F2', label: 'WYKRES' },
  { key: 'F3', label: 'WIADOMOŚCI' },
  { key: 'F4', label: 'SCREENER' },
  { key: 'F5', label: 'ALERTY' },
  { key: 'F6', label: 'KALEND.' },
  { key: 'F7', label: 'AI-ANALIZA' },
  { key: 'F8', label: 'RYNEK' },
]

export default function FunctionBar({ onHelpOpen }: { onHelpOpen?: () => void }) {
  return (
    <div
      className="flex items-center bg-black border-t border-[#1c1c1c] shrink-0 px-1"
      style={{ height: 22 }}
    >
      <div className="flex items-stretch divide-x divide-[#1c1c1c] h-full flex-1">
        {FN_KEYS.map(fn => (
          <div key={fn.key} className="flex items-center px-2 gap-1.5 hover:bg-[#0f0f0f] cursor-default select-none">
            <span className="fn-key">{fn.key}</span>
            <span className="fn-label">{fn.label}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 px-3 border-l border-[#1c1c1c] text-[10px] text-[#444] shrink-0">
        <span>ESC:ZAMKNIJ</span>
        <button
          onClick={onHelpOpen}
          className="flex items-center gap-1 hover:text-[#ffaa00] transition-colors cursor-pointer"
        >
          <span className="kbd">?</span>
          <span>SKRÓTY</span>
        </button>
        <span className="text-[#222]">v0.1.0</span>
      </div>
    </div>
  )
}
