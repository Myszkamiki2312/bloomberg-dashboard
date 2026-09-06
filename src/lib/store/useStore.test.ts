import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useStore } from './useStore'

describe('useStore checkAlerts', () => {
  beforeEach(() => {
    useStore.setState({ alerts: [] })
  })

  it('triggers an alert when price crosses above target', () => {
    useStore.getState().addAlert({ symbol: 'BTC', targetPrice: 100, direction: 'above', active: true })
    const alertId = useStore.getState().alerts[0].id

    useStore.getState().checkAlerts({ BTC: 150 })

    const alert = useStore.getState().alerts.find(a => a.id === alertId)
    expect(alert?.triggered).toBe(true)
    expect(alert?.active).toBe(false)
  })

  it('does not trigger when price has not reached target', () => {
    useStore.getState().addAlert({ symbol: 'BTC', targetPrice: 100, direction: 'above', active: true })
    useStore.getState().checkAlerts({ BTC: 50 })
    expect(useStore.getState().alerts[0].triggered).toBe(false)
  })

  it('does not re-trigger an already-triggered alert', () => {
    useStore.getState().addAlert({ symbol: 'BTC', targetPrice: 100, direction: 'below', active: true })
    useStore.getState().checkAlerts({ BTC: 50 }) // crosses below, triggers
    useStore.getState().checkAlerts({ BTC: 10 }) // already triggered -- should be a no-op

    const alerts = useStore.getState().alerts
    expect(alerts).toHaveLength(1)
    expect(alerts[0].triggered).toBe(true)
  })

  it('ignores alerts for symbols with no price in the snapshot', () => {
    useStore.getState().addAlert({ symbol: 'ETH', targetPrice: 100, direction: 'above', active: true })
    useStore.getState().checkAlerts({ BTC: 999 })
    expect(useStore.getState().alerts[0].triggered).toBe(false)
  })
})

describe('useStore alert management', () => {
  beforeEach(() => {
    useStore.setState({ alerts: [] })
  })

  it('addAlert assigns id, createdAt, and triggered:false automatically', () => {
    useStore.getState().addAlert({ symbol: 'BTC', targetPrice: 100, direction: 'above', active: true })
    const alert = useStore.getState().alerts[0]
    expect(alert.id).toBeTruthy()
    expect(alert.createdAt).toBeTruthy()
    expect(alert.triggered).toBe(false)
  })

  it('removeAlert removes only the matching alert by id', () => {
    useStore.getState().addAlert({ symbol: 'BTC', targetPrice: 100, direction: 'above', active: true })
    useStore.getState().addAlert({ symbol: 'ETH', targetPrice: 50, direction: 'below', active: true })
    const [first, second] = useStore.getState().alerts

    useStore.getState().removeAlert(first.id)

    const remaining = useStore.getState().alerts
    expect(remaining).toHaveLength(1)
    expect(remaining[0].id).toBe(second.id)
  })

  it('clearTriggeredAlerts removes only triggered alerts, keeping active ones', () => {
    useStore.getState().addAlert({ symbol: 'BTC', targetPrice: 100, direction: 'above', active: true })
    useStore.getState().addAlert({ symbol: 'ETH', targetPrice: 50, direction: 'below', active: true })
    useStore.getState().checkAlerts({ BTC: 150 }) // triggers the BTC alert only

    useStore.getState().clearTriggeredAlerts()

    const remaining = useStore.getState().alerts
    expect(remaining).toHaveLength(1)
    expect(remaining[0].symbol).toBe('ETH')
  })

  it('triggerAlert marks the alert triggered and inactive', () => {
    useStore.getState().addAlert({ symbol: 'BTC', targetPrice: 100, direction: 'above', active: true })
    const id = useStore.getState().alerts[0].id

    useStore.getState().triggerAlert(id)

    const alert = useStore.getState().alerts[0]
    expect(alert.triggered).toBe(true)
    expect(alert.active).toBe(false)
  })
})

describe('useStore watchlist actions', () => {
  beforeEach(() => {
    useStore.setState({
      watchlist: [{ symbol: 'BTC', name: 'Bitcoin', type: 'crypto', coinId: 'bitcoin' }],
      selectedSymbol: 'BTC',
      selectedType: 'crypto',
    })
  })

  it('addToWatchlist appends a new entry', () => {
    useStore.getState().addToWatchlist({ symbol: 'ETH', name: 'Ethereum', type: 'crypto', coinId: 'ethereum' })
    expect(useStore.getState().watchlist.map(w => w.symbol)).toEqual(['BTC', 'ETH'])
  })

  it('addToWatchlist is a no-op for a symbol already present', () => {
    useStore.getState().addToWatchlist({ symbol: 'BTC', name: 'Duplicate Bitcoin', type: 'crypto' })
    const watchlist = useStore.getState().watchlist
    expect(watchlist).toHaveLength(1)
    expect(watchlist[0].name).toBe('Bitcoin') // the original entry, not the duplicate
  })

  it('removeFromWatchlist removes the entry', () => {
    useStore.getState().addToWatchlist({ symbol: 'ETH', name: 'Ethereum', type: 'crypto' })
    useStore.getState().removeFromWatchlist('ETH')
    expect(useStore.getState().watchlist.map(w => w.symbol)).toEqual(['BTC'])
  })

  it('removeFromWatchlist falls back selectedSymbol to the first remaining entry when the selected one is removed', () => {
    useStore.getState().addToWatchlist({ symbol: 'ETH', name: 'Ethereum', type: 'crypto' })
    useStore.getState().removeFromWatchlist('BTC') // BTC was selected

    const state = useStore.getState()
    expect(state.selectedSymbol).toBe('ETH')
  })

  it('removeFromWatchlist leaves selectedSymbol untouched when a different entry is removed', () => {
    useStore.getState().addToWatchlist({ symbol: 'ETH', name: 'Ethereum', type: 'crypto' })
    useStore.getState().removeFromWatchlist('ETH')
    expect(useStore.getState().selectedSymbol).toBe('BTC')
  })

  it('updateWatchlistEntry patches only the given fields', () => {
    useStore.getState().updateWatchlistEntry('BTC', { quantity: 2, avgPrice: 50000, purchaseFxRateToPln: undefined })
    const entry = useStore.getState().watchlist.find(w => w.symbol === 'BTC')
    expect(entry?.quantity).toBe(2)
    expect(entry?.avgPrice).toBe(50000)
    expect(entry?.name).toBe('Bitcoin') // untouched
  })

  it('updateWatchlistEntry is a no-op for an unknown symbol', () => {
    useStore.getState().updateWatchlistEntry('DOES_NOT_EXIST', { quantity: 5 })
    expect(useStore.getState().watchlist).toHaveLength(1)
  })
})

describe('useStore replacePortfolioState', () => {
  beforeEach(() => {
    useStore.setState({
      watchlist: [{ symbol: 'BTC', name: 'Bitcoin', type: 'crypto' }],
      alerts: [],
      selectedSymbol: 'BTC',
      selectedType: 'crypto',
      baseCurrency: 'PLN',
    })
  })

  it('replaces the watchlist wholesale', () => {
    useStore.getState().replacePortfolioState({
      watchlist: [{ symbol: 'AAPL', name: 'Apple Inc.', type: 'stock' }],
    })
    expect(useStore.getState().watchlist.map(w => w.symbol)).toEqual(['AAPL'])
  })

  it('keeps the current selection if it still exists in the imported watchlist', () => {
    useStore.getState().replacePortfolioState({
      watchlist: [
        { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock' },
        { symbol: 'BTC', name: 'Bitcoin', type: 'crypto' },
      ],
    })
    expect(useStore.getState().selectedSymbol).toBe('BTC')
  })

  it('resets the selection to the imported list\'s first entry when the current one no longer exists', () => {
    useStore.getState().replacePortfolioState({
      watchlist: [{ symbol: 'AAPL', name: 'Apple Inc.', type: 'stock' }],
    })
    const state = useStore.getState()
    expect(state.selectedSymbol).toBe('AAPL')
    expect(state.selectedType).toBe('stock')
  })

  it('defaults alerts and baseCurrency to the current state when omitted from the import', () => {
    useStore.setState({ alerts: [{ id: '1', symbol: 'BTC', targetPrice: 1, direction: 'above', active: true, triggered: false, createdAt: '' }] })
    useStore.getState().replacePortfolioState({
      watchlist: [{ symbol: 'AAPL', name: 'Apple Inc.', type: 'stock' }],
    })
    const state = useStore.getState()
    expect(state.alerts).toHaveLength(1) // kept, not wiped
    expect(state.baseCurrency).toBe('PLN') // kept
  })

  it('applies an explicitly imported baseCurrency and alerts', () => {
    useStore.getState().replacePortfolioState({
      watchlist: [{ symbol: 'AAPL', name: 'Apple Inc.', type: 'stock' }],
      alerts: [{ id: 'x', symbol: 'AAPL', targetPrice: 200, direction: 'above', active: true, triggered: false, createdAt: '' }],
      baseCurrency: 'USD',
    })
    const state = useStore.getState()
    expect(state.baseCurrency).toBe('USD')
    expect(state.alerts).toHaveLength(1)
    expect(state.alerts[0].symbol).toBe('AAPL')
  })
})

describe('useStore checkAlerts notifications', () => {
  beforeEach(() => {
    useStore.setState({ alerts: [] })
    vi.unstubAllGlobals()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('triggers a "below" alert when price drops to/under the target', () => {
    useStore.getState().addAlert({ symbol: 'ETH', targetPrice: 100, direction: 'below', active: true })
    useStore.getState().checkAlerts({ ETH: 100 })
    expect(useStore.getState().alerts[0].triggered).toBe(true)
  })

  it('does nothing when the Notification API is unavailable, even after a trigger', () => {
    useStore.getState().addAlert({ symbol: 'BTC', targetPrice: 100, direction: 'above', active: true })
    expect(() => useStore.getState().checkAlerts({ BTC: 200 })).not.toThrow()
    expect(useStore.getState().alerts[0].triggered).toBe(true)
  })

  it('sends a plain Notification immediately when permission is already granted', () => {
    const NotificationMock = vi.fn() as ReturnType<typeof vi.fn> & { permission: string; requestPermission: ReturnType<typeof vi.fn> }
    NotificationMock.permission = 'granted'
    NotificationMock.requestPermission = vi.fn()
    vi.stubGlobal('Notification', NotificationMock)

    useStore.getState().addAlert({ symbol: 'BTC', targetPrice: 100, direction: 'above', active: true })
    useStore.getState().checkAlerts({ BTC: 200 })

    expect(NotificationMock).toHaveBeenCalledTimes(1)
    expect(NotificationMock.requestPermission).not.toHaveBeenCalled()
    const [title, opts] = NotificationMock.mock.calls[0]
    expect(title).toContain('BTC')
    expect((opts as { body: string }).body).toContain('przekroczyła')
  })

  it('requests permission and only notifies if the user grants it', async () => {
    const NotificationMock = vi.fn() as ReturnType<typeof vi.fn> & { permission: string; requestPermission: ReturnType<typeof vi.fn> }
    NotificationMock.permission = 'default'
    NotificationMock.requestPermission = vi.fn().mockResolvedValue('granted')
    vi.stubGlobal('Notification', NotificationMock)

    useStore.getState().addAlert({ symbol: 'BTC', targetPrice: 100, direction: 'above', active: true })
    useStore.getState().checkAlerts({ BTC: 200 })

    expect(NotificationMock.requestPermission).toHaveBeenCalledTimes(1)
    await Promise.resolve() // flush the requestPermission().then(...)
    expect(NotificationMock).toHaveBeenCalledTimes(1)
  })

  it('does not notify when permission is denied', () => {
    const NotificationMock = vi.fn() as ReturnType<typeof vi.fn> & { permission: string; requestPermission: ReturnType<typeof vi.fn> }
    NotificationMock.permission = 'denied'
    NotificationMock.requestPermission = vi.fn()
    vi.stubGlobal('Notification', NotificationMock)

    useStore.getState().addAlert({ symbol: 'BTC', targetPrice: 100, direction: 'above', active: true })
    useStore.getState().checkAlerts({ BTC: 200 })

    expect(NotificationMock).not.toHaveBeenCalled()
    expect(NotificationMock.requestPermission).not.toHaveBeenCalled()
  })

  it('routes through the service worker registration when one is available', async () => {
    const showNotification = vi.fn()
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { ready: Promise.resolve({ showNotification }) },
      configurable: true,
    })
    const NotificationMock = vi.fn() as ReturnType<typeof vi.fn> & { permission: string; requestPermission: ReturnType<typeof vi.fn> }
    NotificationMock.permission = 'granted'
    vi.stubGlobal('Notification', NotificationMock)

    useStore.getState().addAlert({ symbol: 'BTC', targetPrice: 100, direction: 'above', active: true })
    useStore.getState().checkAlerts({ BTC: 200 })
    await Promise.resolve()
    await Promise.resolve()

    expect(showNotification).toHaveBeenCalledTimes(1)
    expect(NotificationMock).not.toHaveBeenCalled() // used the SW path, not the plain constructor

    // @ts-expect-error -- test cleanup of a jsdom-defined property
    delete navigator.serviceWorker
  })

  it('batches multiple simultaneously-triggered alerts into separate notifications', () => {
    const NotificationMock = vi.fn() as ReturnType<typeof vi.fn> & { permission: string; requestPermission: ReturnType<typeof vi.fn> }
    NotificationMock.permission = 'granted'
    vi.stubGlobal('Notification', NotificationMock)

    useStore.getState().addAlert({ symbol: 'BTC', targetPrice: 100, direction: 'above', active: true })
    useStore.getState().addAlert({ symbol: 'ETH', targetPrice: 50, direction: 'above', active: true })
    useStore.getState().checkAlerts({ BTC: 200, ETH: 100 })

    expect(NotificationMock).toHaveBeenCalledTimes(2)
  })
})

describe('useStore misc setters', () => {
  it('setSelectedSymbol updates both symbol and type together', () => {
    useStore.getState().setSelectedSymbol('TSLA', 'stock')
    const state = useStore.getState()
    expect(state.selectedSymbol).toBe('TSLA')
    expect(state.selectedType).toBe('stock')
  })

  it('setBaseCurrency updates the base currency', () => {
    useStore.getState().setBaseCurrency('EUR')
    expect(useStore.getState().baseCurrency).toBe('EUR')
  })
})
