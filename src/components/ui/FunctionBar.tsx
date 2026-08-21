'use client'

interface FnItem {
  key: string
  label: string
  panelId: string
}

const FN_KEYS: FnItem[] = [
  { key: 'F1', label: 'WATCHLISTA', panelId: 'p-watchlista' },
  { key: 'F2', label: 'WYKRES',     panelId: 'p-wykres' },
  { key: 'F3', label: 'WIADOMOŚCI', panelId: 'p-wiadomosci' },
  { key: 'F4', label: 'SCREENER',   panelId: 'p-screener' },
  { key: 'F5', label: 'ALERTY',     panelId: 'p-alerty' },
  { key: 'F6', label: 'KALEND.',    panelId: 'p-kalendarz' },
  { key: 'F7', label: 'PODSUM.',    panelId: 'p-ai' },
  { key: 'F8', label: 'RYNEK',      panelId: 'p-rynek' },
]

function flashPanel(panelId: string) {
  const el = document.getElementById(panelId)
  if (!el) {
    console.warn('[FunctionBar] panel not found:', panelId, '— IDs on page:', Array.from(document.querySelectorAll('[id^="p-"]')).map(e => e.id))
    return
  }
  // Direct style manipulation — no CSS class dependency
  el.style.outline = '2px solid #00ff41'
  el.style.outlineOffset = '-2px'
  el.style.transition = 'outline 0.1s'
  setTimeout(() => {
    el.style.outline = '2px solid transparent'
    setTimeout(() => { el.style.outline = ''; el.style.outlineOffset = ''; el.style.transition = '' }, 400)
  }, 600)
}

export default function FunctionBar({
  onHelpOpen,
  readableMode = false,
  onReadableModeToggle,
}: {
  onHelpOpen?: () => void
  readableMode?: boolean
  onReadableModeToggle?: () => void
}) {
  return (
    <div
      className="flex items-center bg-black border-t border-[#1c1c1c] shrink-0 px-1"
      style={{ height: 22 }}
    >
      <div className="flex items-stretch divide-x divide-[#1c1c1c] h-full flex-1">
        {FN_KEYS.map(fn => (
          <button
            key={fn.key}
            onClick={() => flashPanel(fn.panelId)}
            className="flex items-center px-2 gap-1.5 hover:bg-[#0f0f0f] active:bg-[#1a1a1a] cursor-pointer select-none transition-colors"
            title={`${fn.key}: przejdź do panelu ${fn.label}`}
          >
            <span className="fn-key">{fn.key}</span>
            <span className="fn-label">{fn.label}</span>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-4 px-3 border-l border-[#1c1c1c] text-[10px] text-[#444] shrink-0">
        <span>ESC:ZAMKNIJ</span>
        <button
          type="button"
          onClick={onReadableModeToggle}
          className="hover:text-[#ffaa00] transition-colors cursor-pointer"
          title={readableMode ? 'Włącz kompaktowy tekst' : 'Powiększ drobny tekst'}
          aria-pressed={readableMode}
        >
          {readableMode ? 'A−' : 'A+'}
        </button>
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
