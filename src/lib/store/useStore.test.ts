import { describe, it, expect, beforeEach } from 'vitest'
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
