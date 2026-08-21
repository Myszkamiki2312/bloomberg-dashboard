'use client'
import { useEffect, useState } from 'react'
import { useStore } from '@/lib/store/useStore'
import { createPortfolioBackup, parsePortfolioBackup } from '@/lib/utils/portfolioBackup'
import {
  isCloudConfigured,
  loadCloudSession,
  pullCloudPortfolio,
  pushCloudPortfolio,
  saveCloudSession,
  signInToCloud,
  signUpToCloud,
  type CloudSession,
} from '@/lib/cloud/supabase'

export default function CloudSync() {
  const { watchlist, alerts, baseCurrency, replacePortfolioState } = useStore()
  const [open, setOpen] = useState(false)
  const [session, setSession] = useState<CloudSession | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const configured = isCloudConfigured()

  useEffect(() => setSession(loadCloudSession()), [])

  const run = async (operation: () => Promise<void>) => {
    setBusy(true)
    setMessage(null)
    try {
      await operation()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Operacja nie powiodła się')
    } finally {
      setBusy(false)
    }
  }

  const signIn = () => run(async () => {
    const next = await signInToCloud(email.trim(), password)
    setSession(next)
    setPassword('')
    setMessage('Zalogowano')
  })

  const signUp = () => run(async () => {
    const next = await signUpToCloud(email.trim(), password)
    setSession(next)
    setPassword('')
    setMessage(next ? 'Konto utworzone i zalogowane' : 'Sprawdź e-mail i potwierdź konto')
  })

  const push = () => session && run(async () => {
    const active = await pushCloudPortfolio(session, createPortfolioBackup(watchlist, alerts, baseCurrency))
    setSession(active)
    setMessage('Portfel wysłany do chmury')
  })

  const pull = () => session && run(async () => {
    if (!window.confirm('Pobrać portfel z chmury i zastąpić lokalne dane?')) return
    const result = await pullCloudPortfolio(session)
    setSession(result.session)
    if (!result.state) {
      setMessage('W chmurze nie ma jeszcze kopii portfela')
      return
    }
    replacePortfolioState(parsePortfolioBackup(result.state))
    setMessage(`Pobrano kopię${result.updatedAt ? ` z ${new Date(result.updatedAt).toLocaleString('pl-PL')}` : ''}`)
  })

  const signOut = () => {
    saveCloudSession(null)
    setSession(null)
    setMessage('Wylogowano')
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={configured ? 'border border-[#333] px-1.5 py-0.5 text-[#777] hover:text-[#00cccc] hover:border-[#00cccc]' : 'border border-[#222] px-1.5 py-0.5 text-[#333]'}
        title={configured ? 'Logowanie i synchronizacja Supabase' : 'Wymaga konfiguracji Supabase'}
      >
        CHMURA{session ? ' ●' : ''}
      </button>

      {open && (
        <div className="fixed inset-0 z-[10020] bg-black/80 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Synchronizacja chmurowa">
          <div className="w-full max-w-sm border border-[#333] bg-[#080808] p-3 text-[11px] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1c1c1c] pb-2 mb-3">
              <span className="text-[#ffaa00] font-bold tracking-widest">SYNCHRONIZACJA SUPABASE</span>
              <button onClick={() => setOpen(false)} className="text-[#555] hover:text-[#ff0040]">✕</button>
            </div>

            {!configured ? (
              <div className="text-[#ffaa00] leading-relaxed">
                Funkcja jest gotowa, ale wymaga zmiennych{' '}
                <code className="text-[#c8c8c8]">NEXT_PUBLIC_SUPABASE_URL</code>,{' '}
                <code className="text-[#c8c8c8]">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{' '}
                oraz tabeli <code className="text-[#c8c8c8]">dashboard_states</code>.
              </div>
            ) : !session ? (
              <div className="flex flex-col gap-2">
                <input value={email} onChange={event => setEmail(event.target.value)} type="email" placeholder="E-mail" className="bg-black border border-[#333] px-2 py-1.5 outline-none focus:border-[#00cccc]" />
                <input value={password} onChange={event => setPassword(event.target.value)} type="password" placeholder="Hasło (min. 6 znaków)" className="bg-black border border-[#333] px-2 py-1.5 outline-none focus:border-[#00cccc]" />
                <div className="flex gap-2">
                  <button disabled={busy || !email || password.length < 6} onClick={() => void signIn()} className="flex-1 border border-[#00cccc] text-[#00cccc] py-1 disabled:opacity-30">ZALOGUJ</button>
                  <button disabled={busy || !email || password.length < 6} onClick={() => void signUp()} className="flex-1 border border-[#ffaa00] text-[#ffaa00] py-1 disabled:opacity-30">ZAŁÓŻ KONTO</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="text-[#777]">Konto: <span className="text-[#c8c8c8]">{session.user.email ?? session.user.id}</span></div>
                <div className="grid grid-cols-2 gap-2">
                  <button disabled={busy} onClick={() => void push()} className="border border-[#00cccc] text-[#00cccc] py-1 disabled:opacity-30">WYŚLIJ ↑</button>
                  <button disabled={busy} onClick={() => void pull()} className="border border-[#00ff41] text-[#00ff41] py-1 disabled:opacity-30">POBIERZ ↓</button>
                </div>
                <button onClick={signOut} className="border border-[#333] text-[#555] py-1 hover:text-[#ff0040]">WYLOGUJ</button>
              </div>
            )}
            {message && <div className="mt-3 border-t border-[#1c1c1c] pt-2 text-[#ffaa00]">{message}</div>}
          </div>
        </div>
      )}
    </>
  )
}
