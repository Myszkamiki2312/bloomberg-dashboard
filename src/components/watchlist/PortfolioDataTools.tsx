'use client'
import { useRef, useState } from 'react'
import { useStore } from '@/lib/store/useStore'
import { createPortfolioBackup, parsePortfolioBackup } from '@/lib/utils/portfolioBackup'
import CloudSync from './CloudSync'

function downloadFile(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

function csvCell(value: unknown): string {
  const text = String(value ?? '')
  return `"${text.replaceAll('"', '""')}"`
}

export default function PortfolioDataTools({ currencies }: { currencies: Record<string, string> }) {
  const { watchlist, alerts, baseCurrency, replacePortfolioState } = useStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<string | null>(null)

  const exportJson = () => {
    const backup = createPortfolioBackup(watchlist, alerts, baseCurrency)
    downloadFile(
      `bloomberg-portfel-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(backup, null, 2),
      'application/json;charset=utf-8'
    )
    setMessage('Zapisano kopię JSON')
  }

  const exportCsv = () => {
    const header = ['symbol', 'nazwa', 'typ', 'waluta_notowania', 'ilosc', 'srednia_cena', 'kurs_zakupu_do_PLN']
    const rows = watchlist.map(entry => [
      entry.symbol,
      entry.name,
      entry.type,
      currencies[entry.symbol] ?? '',
      entry.quantity ?? '',
      entry.avgPrice ?? '',
      entry.purchaseFxRateToPln ?? '',
    ])
    const csv = [header, ...rows].map(row => row.map(csvCell).join(';')).join('\n')
    downloadFile(
      `bloomberg-portfel-${new Date().toISOString().slice(0, 10)}.csv`,
      `\uFEFF${csv}`,
      'text/csv;charset=utf-8'
    )
    setMessage('Zapisano CSV')
  }

  const importJson = async (file: File | undefined) => {
    if (!file) return
    try {
      const backup = parsePortfolioBackup(JSON.parse(await file.text()))
      replacePortfolioState(backup)
      setMessage(`Zaimportowano ${backup.watchlist.length} symboli`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Nie udało się odczytać pliku')
    } finally {
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="border-t border-[#1c1c1c] px-2 py-1 bg-[#050505] flex flex-wrap items-center gap-1 text-[9px]">
      <span className="text-[#444] mr-auto">DANE PORTFELA</span>
      <button onClick={exportJson} className="border border-[#333] px-1.5 py-0.5 text-[#777] hover:text-[#ffaa00] hover:border-[#ffaa00]">
        JSON ↓
      </button>
      <button onClick={exportCsv} className="border border-[#333] px-1.5 py-0.5 text-[#777] hover:text-[#ffaa00] hover:border-[#ffaa00]">
        CSV ↓
      </button>
      <button onClick={() => inputRef.current?.click()} className="border border-[#333] px-1.5 py-0.5 text-[#777] hover:text-[#00ff41] hover:border-[#00ff41]">
        JSON ↑
      </button>
      <CloudSync />
      {message && (
        <span className="basis-full text-[#00cccc] truncate" title={message}>{message}</span>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={event => void importJson(event.target.files?.[0])}
      />
    </div>
  )
}
