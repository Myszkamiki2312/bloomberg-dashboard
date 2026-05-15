'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { WatchlistEntry, PriceAlert } from '@/types'

const DEFAULT_WATCHLIST: WatchlistEntry[] = [
  { symbol: 'BTC', name: 'Bitcoin', type: 'crypto', coinId: 'bitcoin' },
  { symbol: 'ETH', name: 'Ethereum', type: 'crypto', coinId: 'ethereum' },
  { symbol: 'SOL', name: 'Solana', type: 'crypto', coinId: 'solana' },
  { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', type: 'stock' },
  { symbol: 'TSLA', name: 'Tesla Inc.', type: 'stock' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', type: 'stock' },
  { symbol: 'XRP', name: 'XRP', type: 'crypto', coinId: 'ripple' },
]

interface AppStore {
  watchlist: WatchlistEntry[]
  selectedSymbol: string
  selectedType: 'stock' | 'crypto'
  alerts: PriceAlert[]

  setSelectedSymbol: (symbol: string, type: 'stock' | 'crypto') => void
  addToWatchlist: (entry: WatchlistEntry) => void
  removeFromWatchlist: (symbol: string) => void
  updateWatchlistEntry: (symbol: string, patch: Pick<WatchlistEntry, 'quantity' | 'avgPrice'>) => void
  addAlert: (alert: Omit<PriceAlert, 'id' | 'createdAt' | 'triggered'>) => void
  removeAlert: (id: string) => void
  triggerAlert: (id: string) => void
  checkAlerts: (prices: Record<string, number>) => void
}

export const useStore = create<AppStore>()(
  persist(
    (set, get) => ({
      watchlist: DEFAULT_WATCHLIST,
      selectedSymbol: 'BTC',
      selectedType: 'crypto',
      alerts: [],

      setSelectedSymbol: (symbol, type) => set({ selectedSymbol: symbol, selectedType: type }),

      addToWatchlist: entry => {
        const { watchlist } = get()
        if (!watchlist.find(w => w.symbol === entry.symbol)) {
          set({ watchlist: [...watchlist, entry] })
        }
      },

      removeFromWatchlist: symbol =>
        set(s => ({ watchlist: s.watchlist.filter(w => w.symbol !== symbol) })),

      updateWatchlistEntry: (symbol, patch) =>
        set(s => ({
          watchlist: s.watchlist.map(w =>
            w.symbol === symbol ? { ...w, ...patch } : w
          ),
        })),

      addAlert: alert =>
        set(s => ({
          alerts: [
            ...s.alerts,
            {
              ...alert,
              id: crypto.randomUUID(),
              createdAt: new Date().toISOString(),
              triggered: false,
            },
          ],
        })),

      removeAlert: id => set(s => ({ alerts: s.alerts.filter(a => a.id !== id) })),

      triggerAlert: id =>
        set(s => ({
          alerts: s.alerts.map(a => (a.id === id ? { ...a, triggered: true, active: false } : a)),
        })),

      checkAlerts: prices => {
        const { alerts, triggerAlert } = get()

        // Collect all triggered alert notifications first, then request permission once
        const pendingNotifications: { title: string; body: string }[] = []

        alerts
          .filter(a => a.active && !a.triggered)
          .forEach(alert => {
            const price = prices[alert.symbol]
            if (price == null) return
            const triggered =
              alert.direction === 'above' ? price >= alert.targetPrice : price <= alert.targetPrice
            if (!triggered) return

            triggerAlert(alert.id)

            const label = alert.direction === 'above' ? 'przekroczyła ▲' : 'spadła poniżej ▼'
            pendingNotifications.push({
              title: `🔔 Alert cenowy — ${alert.symbol}`,
              body: `${alert.symbol} ${label} ${alert.targetPrice.toLocaleString('pl-PL')}`,
            })
          })

        if (pendingNotifications.length === 0) return
        if (typeof window === 'undefined' || !('Notification' in window)) return

        const send = () => {
          pendingNotifications.forEach(n => new Notification(n.title, { body: n.body, icon: '/favicon.ico' }))
        }

        if (Notification.permission === 'granted') {
          send()
        } else if (Notification.permission === 'default') {
          // Request permission once for all pending notifications
          Notification.requestPermission().then(perm => {
            if (perm === 'granted') send()
          })
        }
      },
    }),
    {
      name: 'bloomberg-dashboard',
      partialize: state => ({
        watchlist: state.watchlist,
        alerts: state.alerts,
      }),
    }
  )
)
