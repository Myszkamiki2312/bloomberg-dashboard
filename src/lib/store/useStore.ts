'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { WatchlistEntry, PriceAlert, PortfolioCurrency } from '@/types'

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
  baseCurrency: PortfolioCurrency

  setSelectedSymbol: (symbol: string, type: 'stock' | 'crypto') => void
  addToWatchlist: (entry: WatchlistEntry) => void
  removeFromWatchlist: (symbol: string) => void
  updateWatchlistEntry: (symbol: string, patch: Pick<WatchlistEntry, 'quantity' | 'avgPrice' | 'purchaseFxRateToPln'>) => void
  setBaseCurrency: (currency: PortfolioCurrency) => void
  replacePortfolioState: (state: {
    watchlist: WatchlistEntry[]
    alerts?: PriceAlert[]
    baseCurrency?: PortfolioCurrency
  }) => void
  addAlert: (alert: Omit<PriceAlert, 'id' | 'createdAt' | 'triggered'>) => void
  removeAlert: (id: string) => void
  clearTriggeredAlerts: () => void
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
      baseCurrency: 'PLN',

      setSelectedSymbol: (symbol, type) => set({ selectedSymbol: symbol, selectedType: type }),

      addToWatchlist: entry => {
        const { watchlist } = get()
        if (!watchlist.find(w => w.symbol === entry.symbol)) {
          set({ watchlist: [...watchlist, entry] })
        }
      },

      removeFromWatchlist: symbol =>
        set(s => {
          const next = s.watchlist.filter(w => w.symbol !== symbol)
          // If the removed symbol was selected, fall back to the first remaining entry
          const newSelected = s.selectedSymbol === symbol && next.length > 0
            ? { selectedSymbol: next[0].symbol, selectedType: next[0].type }
            : {}
          return { watchlist: next, ...newSelected }
        }),

      updateWatchlistEntry: (symbol, patch) =>
        set(s => ({
          watchlist: s.watchlist.map(w =>
            w.symbol === symbol ? { ...w, ...patch } : w
          ),
        })),

      setBaseCurrency: baseCurrency => set({ baseCurrency }),

      replacePortfolioState: imported => set(state => {
        const selectedStillExists = imported.watchlist.some(entry => entry.symbol === state.selectedSymbol)
        const first = imported.watchlist[0]
        return {
          watchlist: imported.watchlist,
          alerts: imported.alerts ?? state.alerts,
          baseCurrency: imported.baseCurrency ?? state.baseCurrency,
          ...(!selectedStillExists && first
            ? { selectedSymbol: first.symbol, selectedType: first.type }
            : {}),
        }
      }),

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

      clearTriggeredAlerts: () => set(s => ({ alerts: s.alerts.filter(a => !a.triggered) })),

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
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(registration => {
              pendingNotifications.forEach(n => {
                void registration.showNotification(n.title, { body: n.body, icon: '/icon-192.png' })
              })
            }).catch(() => undefined)
            return
          }
          pendingNotifications.forEach(n => new Notification(n.title, { body: n.body, icon: '/icon-192.png' }))
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
        selectedSymbol: state.selectedSymbol,
        selectedType: state.selectedType,
        baseCurrency: state.baseCurrency,
      }),
    }
  )
)
