import type { Session } from '@supabase/supabase-js'
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useDb } from '../db/DbProvider'
import { getLastSyncedAt, syncNow } from './engine'
import { isSyncConfigured, supabase } from './supabaseClient'

const AUTO_SYNC_INTERVAL_MS = 2 * 60 * 1000

interface SyncContextValue {
  configured: boolean
  session: Session | null
  syncing: boolean
  error: string | null
  lastSyncedAt: string | null
  signIn: (email: string, password: string) => Promise<void>
  /** @returns true se a conta foi criada mas precisa confirmar o e-mail antes de logar */
  signUp: (email: string, password: string) => Promise<boolean>
  signOut: () => Promise<void>
  sync: () => Promise<void>
}

const SyncContext = createContext<SyncContextValue | null>(null)

export function SyncProvider({ children }: { children: ReactNode }) {
  const db = useDb()
  const [session, setSession] = useState<Session | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(getLastSyncedAt())
  const syncingRef = useRef(false)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => setSession(newSession))
    return () => listener.subscription.unsubscribe()
  }, [])

  const sync = useCallback(async () => {
    if (!supabase || !session || syncingRef.current) return
    syncingRef.current = true
    setSyncing(true)
    setError(null)
    try {
      await syncNow(db)
      setLastSyncedAt(getLastSyncedAt())
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      syncingRef.current = false
      setSyncing(false)
    }
  }, [db, session])

  useEffect(() => {
    if (!session) return
    sync()
    const interval = setInterval(sync, AUTO_SYNC_INTERVAL_MS)
    window.addEventListener('online', sync)
    return () => {
      clearInterval(interval)
      window.removeEventListener('online', sync)
    }
  }, [session, sync])

  async function signIn(email: string, password: string) {
    if (!supabase) return
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
  }

  async function signUp(email: string, password: string): Promise<boolean> {
    if (!supabase) return false
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw new Error(error.message)
    return !data.session
  }

  async function signOut() {
    if (!supabase) return
    await supabase.auth.signOut()
  }

  return (
    <SyncContext.Provider
      value={{ configured: isSyncConfigured, session, syncing, error, lastSyncedAt, signIn, signUp, signOut, sync }}
    >
      {children}
    </SyncContext.Provider>
  )
}

export function useSync(): SyncContextValue {
  const ctx = useContext(SyncContext)
  if (!ctx) throw new Error('useSync() precisa estar dentro de <SyncProvider>')
  return ctx
}
