import { useEffect, useState } from 'react'
import { useStaff } from '../../auth/StaffProvider'
import { useDb } from '../../db/DbProvider'
import type { StaffRole } from '../../db/schema'
import { useBusinessConfig } from '../../shared/BusinessConfigProvider'
import { getDeviceId } from '../../shared/deviceId'
import { formatDateTime } from '../../shared/format'
import { useSync } from '../../sync/SyncProvider'
import { templates } from '../../templates'
import { UpdateSection } from './UpdateSection'

const ROLE_LABEL: Record<StaffRole, string> = { operador: 'Operador', gerente: 'Gerente', administrador: 'Administrador' }

export function ConfigPage() {
  const db = useDb()
  const { name: savedName, template, reload } = useBusinessConfig()
  const [name, setName] = useState(savedName)
  const [businessType, setBusinessType] = useState(template.id)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setName(savedName)
    setBusinessType(template.id)
  }, [savedName, template])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    await db.exec(
      `INSERT INTO business_config (id, name, business_type, updated_at, device_id, deleted)
       VALUES (?, ?, ?, ?, ?, 0)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         business_type = excluded.business_type,
         updated_at = excluded.updated_at,
         device_id = excluded.device_id`,
      ['default', name, businessType, new Date().toISOString(), getDeviceId()],
    )
    await reload()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="mb-4 text-lg font-semibold text-neutral-900">Configuração do negócio</h1>
      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-neutral-700">Nome do negócio</span>
          <input
            className="rounded border border-neutral-300 px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Mercado do Zé"
            required
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-neutral-700">Tipo de negócio</span>
          <select
            className="rounded border border-neutral-300 px-3 py-2"
            value={businessType}
            onChange={(e) => setBusinessType(e.target.value)}
          >
            {Object.values(templates).map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded bg-neutral-900 px-4 py-2 font-medium text-white hover:bg-neutral-800"
        >
          Salvar
        </button>
        {saved && <span className="text-sm text-green-600">Salvo.</span>}
      </form>

      <EquipeSection />
      <BackupSection />
      <UpdateSection />
      <SyncSection />
    </div>
  )
}

function EquipeSection() {
  const { current, allStaff, createStaff, removeStaff, setStaffPin } = useStaff()
  const [name, setName] = useState('')
  const [role, setRole] = useState<StaffRole>('operador')
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [resettingId, setResettingId] = useState<string | null>(null)
  const [resetPin, setResetPin] = useState('')

  const adminCount = allStaff.filter((s) => s.role === 'administrador').length

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (pin.length < 4) {
      setError('PIN precisa ter pelo menos 4 dígitos')
      return
    }
    await createStaff(name, role, pin)
    setName('')
    setPin('')
    setRole('operador')
  }

  async function handleRemove(id: string, staffRole: StaffRole) {
    if (staffRole === 'administrador' && adminCount <= 1) {
      setError('Não dá pra remover o único administrador.')
      return
    }
    await removeStaff(id)
  }

  async function handleResetPin(e: React.FormEvent) {
    e.preventDefault()
    if (!resettingId || resetPin.length < 4) {
      setError('PIN precisa ter pelo menos 4 dígitos')
      return
    }
    await setStaffPin(resettingId, resetPin)
    setResettingId(null)
    setResetPin('')
  }

  return (
    <div className="mt-6 rounded border border-neutral-200 bg-white p-4">
      <h2 className="mb-2 font-medium text-neutral-900">Equipe</h2>
      <p className="mb-2 text-xs text-neutral-400">
        PIN não sincroniza entre terminais — quem vem de outro terminal via sync precisa de "Redefinir PIN" aqui.
      </p>

      <ul className="mb-3 divide-y divide-neutral-100 text-sm">
        {allStaff.map((s) => (
          <li key={s.id} className="py-1.5">
            <div className="flex items-center justify-between">
              <span>
                {s.name} <span className="text-neutral-400">— {ROLE_LABEL[s.role]}</span>
                {!s.pin_hash && <span className="text-amber-600"> (sem PIN aqui)</span>}
                {s.id === current?.id && <span className="text-neutral-400"> (você)</span>}
              </span>
              <span className="flex gap-3">
                <button
                  onClick={() => {
                    setResettingId(s.id)
                    setResetPin('')
                    setError(null)
                  }}
                  className="text-neutral-500 hover:underline"
                >
                  Redefinir PIN
                </button>
                <button onClick={() => handleRemove(s.id, s.role)} className="text-red-600 hover:underline">
                  Remover
                </button>
              </span>
            </div>
            {resettingId === s.id && (
              <form onSubmit={handleResetPin} className="mt-2 flex gap-2">
                <input
                  className="flex-1 rounded border border-neutral-300 px-3 py-1.5"
                  type="password"
                  inputMode="numeric"
                  placeholder="Novo PIN"
                  value={resetPin}
                  onChange={(e) => setResetPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  autoFocus
                />
                <button type="submit" className="rounded bg-neutral-900 px-3 py-1.5 text-white hover:bg-neutral-800">
                  Salvar
                </button>
                <button type="button" onClick={() => setResettingId(null)} className="px-3 py-1.5 text-neutral-500 hover:bg-neutral-100">
                  Cancelar
                </button>
              </form>
            )}
          </li>
        ))}
        {allStaff.length === 0 && <li className="py-1.5 text-neutral-400">Ninguém cadastrado ainda.</li>}
      </ul>

      <form onSubmit={handleCreate} className="flex flex-col gap-2 border-t border-neutral-100 pt-3">
        <div className="flex gap-2">
          <input
            className="flex-1 rounded border border-neutral-300 px-3 py-2"
            placeholder="Nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <select
            className="rounded border border-neutral-300 px-3 py-2"
            value={role}
            onChange={(e) => setRole(e.target.value as StaffRole)}
          >
            <option value="operador">Operador</option>
            <option value="gerente">Gerente</option>
            <option value="administrador">Administrador</option>
          </select>
        </div>
        <input
          className="rounded border border-neutral-300 px-3 py-2"
          type="password"
          inputMode="numeric"
          placeholder="PIN (mín. 4 dígitos)"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          required
        />
        <button type="submit" className="rounded bg-neutral-900 px-4 py-1.5 font-medium text-white hover:bg-neutral-800">
          Adicionar
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </form>
    </div>
  )
}

function BackupSection() {
  const db = useDb()

  async function handleExport() {
    const tables = [
      'products',
      'orders',
      'order_items',
      'payments',
      'business_config',
      'cash_sessions',
      'cash_movements',
      'staff',
    ] as const
    const data: Record<string, unknown[]> = {}
    for (const table of tables) {
      data[table] = await db.query(`SELECT * FROM ${table}`)
    }

    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), tables: data }, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pdv-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mt-6 rounded border border-neutral-200 bg-white p-4">
      <h2 className="mb-2 font-medium text-neutral-900">Backup</h2>
      <p className="mb-3 text-sm text-neutral-500">Baixa todos os dados (produtos, vendas, pagamentos) num arquivo .json.</p>
      <button onClick={handleExport} className="rounded bg-neutral-900 px-4 py-1.5 font-medium text-white hover:bg-neutral-800">
        Exportar backup
      </button>
    </div>
  )
}

function SyncSection() {
  const { configured, session, syncing, error, lastSyncedAt, signIn, signUp, signOut, sync } = useSync()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [authInfo, setAuthInfo] = useState<string | null>(null)
  const [mode, setMode] = useState<'login' | 'signup'>('login')

  if (!configured) {
    return (
      <p className="mt-6 rounded border border-neutral-200 bg-white p-4 text-sm text-neutral-500">
        Sincronização não configurada (faltam VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY no .env). O app funciona
        normalmente offline.
      </p>
    )
  }

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    setAuthError(null)
    setAuthInfo(null)
    try {
      if (mode === 'login') {
        await signIn(email, password)
      } else {
        const needsConfirmation = await signUp(email, password)
        if (needsConfirmation) setAuthInfo('Conta criada. Confira seu e-mail pra confirmar antes de entrar.')
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : String(err))
    }
  }

  if (!session) {
    return (
      <form onSubmit={handleAuth} className="mt-6 flex flex-col gap-3 rounded border border-neutral-200 bg-white p-4">
        <h2 className="font-medium text-neutral-900">Sincronização</h2>
        <input
          className="rounded border border-neutral-300 px-3 py-2"
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="rounded border border-neutral-300 px-3 py-2"
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />
        <div className="flex gap-2">
          <button type="submit" className="rounded bg-neutral-900 px-4 py-1.5 font-medium text-white hover:bg-neutral-800">
            {mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
          <button
            type="button"
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            className="rounded px-4 py-1.5 text-neutral-600 hover:bg-neutral-100"
          >
            {mode === 'login' ? 'Criar conta nova' : 'Já tenho conta'}
          </button>
        </div>
        {authError && <span className="text-sm text-red-600">{authError}</span>}
        {authInfo && <span className="text-sm text-green-600">{authInfo}</span>}
      </form>
    )
  }

  return (
    <div className="mt-6 flex flex-col gap-2 rounded border border-neutral-200 bg-white p-4">
      <h2 className="font-medium text-neutral-900">Sincronização</h2>
      <p className="text-sm text-neutral-600">Conectado como {session.user.email}</p>
      <p className="text-sm text-neutral-500">
        {lastSyncedAt ? `Última sincronização: ${formatDateTime(lastSyncedAt)}` : 'Ainda não sincronizou'}
      </p>
      <div className="flex gap-2">
        <button
          onClick={sync}
          disabled={syncing}
          className="rounded bg-neutral-900 px-4 py-1.5 font-medium text-white hover:bg-neutral-800 disabled:opacity-40"
        >
          {syncing ? 'Sincronizando…' : 'Sincronizar agora'}
        </button>
        <button onClick={signOut} className="rounded px-4 py-1.5 text-neutral-600 hover:bg-neutral-100">
          Sair
        </button>
      </div>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  )
}
