import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { CloudSession } from './supabase'

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as Response
}

describe('supabase cloud sync (not configured)', () => {
  it('isCloudConfigured is false when no env vars are set', async () => {
    const { isCloudConfigured } = await import('./supabase')
    expect(isCloudConfigured()).toBe(false)
  })

  it('signInToCloud rejects with a clear message when unconfigured', async () => {
    const { signInToCloud } = await import('./supabase')
    await expect(signInToCloud('a@b.com', 'pw')).rejects.toThrow('Synchronizacja chmurowa nie jest skonfigurowana')
  })
})

describe('loadCloudSession / saveCloudSession', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('returns null when nothing is stored', async () => {
    const { loadCloudSession } = await import('./supabase')
    expect(loadCloudSession()).toBeNull()
  })

  it('round-trips a saved session', async () => {
    const { loadCloudSession, saveCloudSession } = await import('./supabase')
    const session: CloudSession = {
      access_token: 'a', refresh_token: 'r', expires_at: 9999999999, user: { id: 'u1' },
    }
    saveCloudSession(session)
    expect(loadCloudSession()).toEqual(session)
  })

  it('clears the stored session when saving null', async () => {
    const { loadCloudSession, saveCloudSession } = await import('./supabase')
    saveCloudSession({ access_token: 'a', refresh_token: 'r', expires_at: 1, user: { id: 'u1' } })
    saveCloudSession(null)
    expect(loadCloudSession()).toBeNull()
  })

  it('returns null instead of throwing on corrupted stored JSON', async () => {
    const { loadCloudSession } = await import('./supabase')
    window.localStorage.setItem('bloomberg-dashboard-cloud-session-v1', '{not json')
    expect(loadCloudSession()).toBeNull()
  })
})

describe('supabase cloud sync (configured)', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co/')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key')
    vi.resetModules()
    vi.stubGlobal('fetch', vi.fn())
    window.localStorage.clear()
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('isCloudConfigured is true once both env vars are set', async () => {
    const { isCloudConfigured } = await import('./supabase')
    expect(isCloudConfigured()).toBe(true)
  })

  it('strips a trailing slash from the configured URL', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse({ access_token: 'a', refresh_token: 'r', user: { id: 'u1' } })
    )
    const { signInToCloud } = await import('./supabase')
    await signInToCloud('a@b.com', 'pw')
    const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(calledUrl.startsWith('https://example.supabase.co/auth')).toBe(true)
  })

  it('signInToCloud stores and returns the session on success', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse({ access_token: 'tok', refresh_token: 'ref', expires_in: 100, user: { id: 'u1', email: 'a@b.com' } })
    )
    const { signInToCloud, loadCloudSession } = await import('./supabase')
    const session = await signInToCloud('a@b.com', 'pw')
    expect(session.access_token).toBe('tok')
    expect(loadCloudSession()).toEqual(session)
  })

  it('signInToCloud throws the server-provided error message', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse({ msg: 'Invalid login credentials' }, false, 400))
    const { signInToCloud } = await import('./supabase')
    await expect(signInToCloud('a@b.com', 'wrong')).rejects.toThrow('Invalid login credentials')
  })

  it('signInToCloud throws a generic status message when the error body is unparseable', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 500, json: async () => { throw new Error('bad json') } } as unknown as Response)
    const { signInToCloud } = await import('./supabase')
    await expect(signInToCloud('a@b.com', 'pw')).rejects.toThrow('Supabase 500')
  })

  it('signInToCloud throws when the response has no usable session fields', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse({}))
    const { signInToCloud } = await import('./supabase')
    await expect(signInToCloud('a@b.com', 'pw')).rejects.toThrow('Nie otrzymano sesji użytkownika')
  })

  it('signUpToCloud returns null (email-confirmation flow) without throwing when no session comes back', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse({ user: { id: 'u1' } }))
    const { signUpToCloud } = await import('./supabase')
    const session = await signUpToCloud('a@b.com', 'pw')
    expect(session).toBeNull()
  })

  it('refreshCloudSession returns the same session unchanged when still valid', async () => {
    const { refreshCloudSession } = await import('./supabase')
    const session: CloudSession = {
      access_token: 'a', refresh_token: 'r', expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: 'u1' },
    }
    const result = await refreshCloudSession(session)
    expect(result).toBe(session)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('refreshCloudSession fetches a new token when the session is near expiry', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse({ access_token: 'new', refresh_token: 'newref', expires_in: 3600, user: { id: 'u1' } })
    )
    const { refreshCloudSession } = await import('./supabase')
    const session: CloudSession = {
      access_token: 'old', refresh_token: 'r', expires_at: Math.floor(Date.now() / 1000) + 10, user: { id: 'u1' },
    }
    const result = await refreshCloudSession(session)
    expect(result.access_token).toBe('new')
  })

  it('refreshCloudSession throws when the refresh response has no session', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse({}))
    const { refreshCloudSession } = await import('./supabase')
    const session: CloudSession = { access_token: 'a', refresh_token: 'r', expires_at: 1, user: { id: 'u1' } }
    await expect(refreshCloudSession(session)).rejects.toThrow('Sesja wygasła')
  })

  it('pushCloudPortfolio sends the state and returns the (possibly refreshed) session', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse({}, true, 204))
    const { pushCloudPortfolio } = await import('./supabase')
    const session: CloudSession = {
      access_token: 'a', refresh_token: 'r', expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: 'u1' },
    }
    const result = await pushCloudPortfolio(session, { watchlist: [] } as never)
    expect(result).toEqual(session)
  })

  it('pullCloudPortfolio returns null state when no row exists yet', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse([]))
    const { pullCloudPortfolio } = await import('./supabase')
    const session: CloudSession = {
      access_token: 'a', refresh_token: 'r', expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: 'u1' },
    }
    const result = await pullCloudPortfolio(session)
    expect(result.state).toBeNull()
  })

  it('pullCloudPortfolio returns the stored state and updatedAt when a row exists', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse([{ state: { watchlist: [] }, updated_at: '2026-01-01T00:00:00Z' }])
    )
    const { pullCloudPortfolio } = await import('./supabase')
    const session: CloudSession = {
      access_token: 'a', refresh_token: 'r', expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: 'u1' },
    }
    const result = await pullCloudPortfolio(session)
    expect(result.state).toEqual({ watchlist: [] })
    expect(result.updatedAt).toBe('2026-01-01T00:00:00Z')
  })
})
