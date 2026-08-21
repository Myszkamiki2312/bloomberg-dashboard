'use client'
import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PWAControls({ compact = false }: { compact?: boolean }) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(error => {
        console.warn('[PWA] Service worker registration failed:', error)
      })
    }

    const capturePrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }
    const installed = () => setInstallPrompt(null)
    window.addEventListener('beforeinstallprompt', capturePrompt)
    window.addEventListener('appinstalled', installed)
    return () => {
      window.removeEventListener('beforeinstallprompt', capturePrompt)
      window.removeEventListener('appinstalled', installed)
    }
  }, [])

  if (!installPrompt) return null

  const install = async () => {
    await installPrompt.prompt()
    await installPrompt.userChoice
    setInstallPrompt(null)
  }

  return (
    <button
      type="button"
      onClick={() => void install()}
      className={compact
        ? 'border border-[#00cccc] px-1.5 py-0.5 text-[#00cccc] hover:bg-[#00cccc] hover:text-black'
        : 'hover:text-[#00cccc] transition-colors cursor-pointer'}
      title="Zainstaluj dashboard jako aplikację"
    >
      {compact ? 'INSTALUJ' : 'PWA↓'}
    </button>
  )
}
