import type { PortfolioBackupV1 } from '@/lib/utils/portfolioBackup'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const SESSION_KEY = 'bloomberg-dashboard-cloud-session-v1'

export interface CloudSession {
  access_token: string
  refresh_token: string
  expires_at: number
  user: { id: string; email?: string }
}

interface AuthResponse {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  user?: { id: string; email?: string }
}

export function isCloudConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)
}

async function supabaseRequest<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  if (!isCloudConfigured()) throw new Error('Synchronizacja chmurowa nie jest skonfigurowana')
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token ?? SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as Record<string, unknown>
    throw new Error(String(error.message ?? error.msg ?? error.error_description ?? `Supabase ${response.status}`))
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

function toSession(response: AuthResponse): CloudSession | null {
  if (!response.access_token || !response.refresh_token || !response.user?.id) return null
  return {
    access_token: response.access_token,
    refresh_token: response.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + (response.expires_in ?? 3600),
    user: response.user,
  }
}

export function loadCloudSession(): CloudSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) as CloudSession : null
  } catch {
    return null
  }
}

export function saveCloudSession(session: CloudSession | null) {
  if (typeof window === 'undefined') return
  if (session) window.localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  else window.localStorage.removeItem(SESSION_KEY)
}

export async function signInToCloud(email: string, password: string): Promise<CloudSession> {
  const response = await supabaseRequest<AuthResponse>('/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  const session = toSession(response)
  if (!session) throw new Error('Nie otrzymano sesji użytkownika')
  saveCloudSession(session)
  return session
}

export async function signUpToCloud(email: string, password: string): Promise<CloudSession | null> {
  const response = await supabaseRequest<AuthResponse>('/auth/v1/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  const session = toSession(response)
  if (session) saveCloudSession(session)
  return session
}

export async function refreshCloudSession(session: CloudSession): Promise<CloudSession> {
  if (session.expires_at > Math.floor(Date.now() / 1000) + 60) return session
  const response = await supabaseRequest<AuthResponse>('/auth/v1/token?grant_type=refresh_token', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  })
  const refreshed = toSession(response)
  if (!refreshed) throw new Error('Sesja wygasła — zaloguj się ponownie')
  saveCloudSession(refreshed)
  return refreshed
}

export async function pushCloudPortfolio(session: CloudSession, state: PortfolioBackupV1): Promise<CloudSession> {
  const active = await refreshCloudSession(session)
  await supabaseRequest('/rest/v1/dashboard_states?on_conflict=user_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({
      user_id: active.user.id,
      state,
      updated_at: new Date().toISOString(),
    }),
  }, active.access_token)
  return active
}

export async function pullCloudPortfolio(
  session: CloudSession
): Promise<{ session: CloudSession; state: PortfolioBackupV1 | null; updatedAt?: string }> {
  const active = await refreshCloudSession(session)
  const rows = await supabaseRequest<{ state: PortfolioBackupV1; updated_at?: string }[]>(
    `/rest/v1/dashboard_states?user_id=eq.${encodeURIComponent(active.user.id)}&select=state,updated_at&limit=1`,
    {},
    active.access_token
  )
  return { session: active, state: rows[0]?.state ?? null, updatedAt: rows[0]?.updated_at }
}
