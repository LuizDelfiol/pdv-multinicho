import { useState, type ReactNode } from 'react'
import { useStaff } from './StaffProvider'

const PAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', 'OK']

function PinPad({ value, onChange, onSubmit }: { value: string; onChange: (v: string) => void; onSubmit: () => void }) {
  function press(key: string) {
    if (key === '⌫') onChange(value.slice(0, -1))
    else if (key === 'OK') onSubmit()
    else if (value.length < 6) onChange(value + key)
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {PAD_KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => press(key)}
          className="rounded border border-neutral-300 bg-white py-3 text-lg font-medium hover:bg-neutral-100"
        >
          {key}
        </button>
      ))}
    </div>
  )
}

function BootstrapForm() {
  const { createStaff, login } = useStaff()
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (pin.length < 4) {
      setError('PIN precisa ter pelo menos 4 dígitos')
      return
    }
    if (pin !== pinConfirm) {
      setError('PINs não conferem')
      return
    }
    await createStaff(name, 'administrador', pin)
    await login(pin)
  }

  return (
    <div className="mx-auto mt-16 max-w-sm p-6">
      <h1 className="mb-1 text-lg font-semibold text-neutral-900">Primeiro acesso</h1>
      <p className="mb-4 text-sm text-neutral-500">Cria a conta de administrador pra começar.</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded border border-neutral-200 bg-white p-4">
        <input
          className="rounded border border-neutral-300 px-3 py-2"
          placeholder="Seu nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className="rounded border border-neutral-300 px-3 py-2"
          type="password"
          inputMode="numeric"
          placeholder="PIN (mín. 4 dígitos)"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          required
        />
        <input
          className="rounded border border-neutral-300 px-3 py-2"
          type="password"
          inputMode="numeric"
          placeholder="Confirma o PIN"
          value={pinConfirm}
          onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 6))}
          required
        />
        {error && <span className="text-sm text-red-600">{error}</span>}
        <button type="submit" className="rounded bg-neutral-900 px-4 py-2 font-medium text-white hover:bg-neutral-800">
          Criar administrador
        </button>
      </form>
    </div>
  )
}

function PinLogin() {
  const { login } = useStaff()
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!pin) return
    const ok = await login(pin)
    if (!ok) {
      setError('PIN incorreto')
      setPin('')
    }
  }

  return (
    <div className="mx-auto mt-16 max-w-xs p-6">
      <h1 className="mb-4 text-center text-lg font-semibold text-neutral-900">Quem está operando?</h1>
      <div className="mb-3 flex justify-center gap-2">
        {Array.from({ length: Math.max(pin.length, 4) }).map((_, i) => (
          <span
            key={i}
            className={`h-3 w-3 rounded-full ${i < pin.length ? 'bg-neutral-900' : 'border border-neutral-300'}`}
          />
        ))}
      </div>
      {error && <p className="mb-2 text-center text-sm text-red-600">{error}</p>}
      <PinPad value={pin} onChange={setPin} onSubmit={handleSubmit} />
    </div>
  )
}

export function LoginGate({ children }: { children: ReactNode }) {
  const { current, allStaff, loading } = useStaff()

  if (loading) return <div className="p-6 text-neutral-500">Carregando…</div>
  if (current) return <>{children}</>
  if (allStaff.length === 0) return <BootstrapForm />
  return <PinLogin />
}
