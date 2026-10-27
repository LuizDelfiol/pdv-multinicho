import { isTauri } from '@tauri-apps/api/core'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { IDbClient } from './client'
import { SqlJsAdapter } from './sqljsAdapter'
import { TauriSqlAdapter } from './tauriSqlAdapter'

const DbContext = createContext<IDbClient | null>(null)

export function DbProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<IDbClient | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const adapter: IDbClient = isTauri() ? new TauriSqlAdapter() : new SqlJsAdapter()
    adapter
      .init()
      .then(() => setDb(adapter))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
  }, [])

  if (error) {
    return <div className="p-6 text-red-600">Erro ao abrir o banco local: {error}</div>
  }

  if (!db) {
    return <div className="p-6 text-neutral-500">Carregando…</div>
  }

  return <DbContext.Provider value={db}>{children}</DbContext.Provider>
}

export function useDb(): IDbClient {
  const db = useContext(DbContext)
  if (!db) throw new Error('useDb() precisa estar dentro de <DbProvider>')
  return db
}
