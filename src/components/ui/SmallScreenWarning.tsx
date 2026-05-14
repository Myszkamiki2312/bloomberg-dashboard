'use client'
import { useState, useEffect } from 'react'

const MIN_WIDTH = 1200

export default function SmallScreenWarning() {
  const [width, setWidth] = useState<number | null>(null)

  useEffect(() => {
    const check = () => setWidth(window.innerWidth)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // null = SSR/hydration — don't render yet
  if (width === null || width >= MIN_WIDTH) return null

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center text-center p-8 gap-4">
      <div className="text-[#ffaa00] text-4xl">⚠</div>
      <div className="text-[#ffaa00] font-bold text-[13px] tracking-widest uppercase">
        Ekran za mały
      </div>
      <div className="text-[#666] text-[11px] max-w-xs leading-relaxed">
        Bloomberg Dashboard wymaga minimalnej szerokości{' '}
        <span className="text-[#ffaa00]">{MIN_WIDTH}px</span>.
        <br />
        Obecna: <span className="text-[#ff0040]">{width}px</span>
      </div>
      <div className="text-[#333] text-[10px]">
        Rozszerz okno przeglądarki lub użyj zewnętrznego monitora.
      </div>
      <div className="border border-[#1c1c1c] px-4 py-2 text-[9px] text-[#444] font-mono mt-2">
        Terminal finansowy · Zoptymalizowany pod 1920×1080
      </div>
    </div>
  )
}
