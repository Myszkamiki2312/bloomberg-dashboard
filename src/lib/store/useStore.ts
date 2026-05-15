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
        alerts
          .filter(a => a.active && !a.triggered)
          .forEach(alert => {
            const price = prices[alert.symbol]
            if (price == null) return
            const triggered =
              alert.direction === 'above' ? price >= alert.targetPrice : price <= alert.targetPrice
            if (!triggered) return

            triggerAlert(alert.id)

            // Browser notification
            const label = alert.direction === 'above' ? 'przekroczyła ▲' : 'spadła poniżej ▼'
            const body = `${alert.symbol} ${label} ${alert.targetPrice.toLocaleString('pl-PL')}`

            if (typeof window !== 'undefined' && 'Notification' in window) {
              if (Notification.permission === 'granted') {
                new Notification(`🔔 Alert cenowy — ${alert.symbol}`, { body, icon: '/favicon.ico' })
              } else if (Notification.permission === 'default') {
                Notification.requestPermission().then(perm => {
                  if (perm === 'granted') {
                    new Notification(`🔔 Alert cenowy — ${alert.symbol}`, { body, icon: '/favicon.ico' })
                  }
                })
              }
            }
          })
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
