import { isTauri } from '@tauri-apps/api/core'
import { useState } from 'react'

type Status = 'idle' | 'checking' | 'none' | 'downloading' | 'ready' | 'error'

export function UpdateSection() {
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  if (!isTauri()) return null

  async function handleCheck() {
    setStatus('checking')
    setError(null)
    try {
      const { check } = await import('@tauri-apps/plugin-updater')
      const update = await check()
      if (!update) {
        setStatus('none')
        return
      }
      setStatus('downloading')
      await update.downloadAndInstall()
      setStatus('ready')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setStatus('error')
    }
  }

  async function handleRestart() {
    const { relaunch } = await import('@tauri-apps/plugin-process')
    await relaunch()
  }

  return (
    <div className="mt-6 rounded border border-neutral-200 bg-white p-4">
      <h2 className="mb-2 font-medium text-neutral-900">Atualizações</h2>
      {status === 'ready' ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-green-600">Baixada. Reinicia pra aplicar.</span>
          <button onClick={handleRestart} className="rounded bg-neutral-900 px-4 py-1.5 font-medium text-white hover:bg-neutral-800">
            Reiniciar agora
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            onClick={handleCheck}
            disabled={status === 'checking' || status === 'downloading'}
            className="rounded bg-neutral-900 px-4 py-1.5 font-medium text-white hover:bg-neutral-800 disabled:opacity-40"
          >
            {status === 'checking' ? 'Verificando…' : status === 'downloading' ? 'Baixando…' : 'Verificar atualização'}
          </button>
          {status === 'none' && <span className="text-sm text-neutral-500">Já está na versão mais recente.</span>}
          {status === 'error' && <span className="text-sm text-red-600">{error}</span>}
        </div>
      )}
    </div>
  )
}
