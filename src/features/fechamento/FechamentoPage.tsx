import { useEffect, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useStaff } from '../../auth/StaffProvider'
import { useDb } from '../../db/DbProvider'
import type { CashMovement, CashMovementType, CashSession } from '../../db/schema'
import { getDeviceId } from '../../shared/deviceId'
import { brlToCents, centsToBRL, formatDateTime } from '../../shared/format'

async function cashSalesSince(db: ReturnType<typeof useDb>, since: string): Promise<number> {
  const rows = await db.query<{ total: number | null }>(
    "SELECT SUM(amount_cents) as total FROM payments WHERE method = 'dinheiro' AND deleted = 0 AND created_at >= ?",
    [since],
  )
  return rows[0]?.total ?? 0
}

function movementsBalance(movements: CashMovement[]): number {
  return movements.reduce((sum, m) => sum + (m.type === 'suprimento' ? m.amount_cents : -m.amount_cents), 0)
}

export function FechamentoPage() {
  const db = useDb()
  const { current } = useStaff()
  const [session, setSession] = useState<CashSession | null>(null)
  const [lastClosed, setLastClosed] = useState<CashSession | null>(null)
  const [movements, setMovements] = useState<CashMovement[]>([])
  const [cashSales, setCashSales] = useState(0)
  const [openingAmount, setOpeningAmount] = useState('')
  const [movementType, setMovementType] = useState<CashMovementType>('sangria')
  const [movementAmount, setMovementAmount] = useState('')
  const [movementReason, setMovementReason] = useState('')
  const [countedAmount, setCountedAmount] = useState('')
  const [closing, setClosing] = useState(false)

  async function load() {
    const open = await db.query<CashSession>("SELECT * FROM cash_sessions WHERE status = 'aberto' AND deleted = 0 LIMIT 1")
    setSession(open[0] ?? null)

    if (open[0]) {
      setMovements(await db.query<CashMovement>('SELECT * FROM cash_movements WHERE session_id = ? AND deleted = 0', [open[0].id]))
      setCashSales(await cashSalesSince(db, open[0].opened_at))
    } else {
      const closed = await db.query<CashSession>(
        "SELECT * FROM cash_sessions WHERE status = 'fechado' AND deleted = 0 ORDER BY closed_at DESC LIMIT 1",
      )
      setLastClosed(closed[0] ?? null)
    }
  }

  useEffect(() => {
    load()
  }, [db])

  async function handleOpen(e: React.FormEvent) {
    e.preventDefault()
    const now = new Date().toISOString()
    await db.exec(
      `INSERT INTO cash_sessions (id, status, opening_amount_cents, staff_name, opened_at, updated_at, device_id, deleted)
       VALUES (?, 'aberto', ?, ?, ?, ?, ?, 0)`,
      [uuidv4(), brlToCents(openingAmount), current?.name ?? null, now, now, getDeviceId()],
    )
    setOpeningAmount('')
    await load()
  }

  async function handleAddMovement(e: React.FormEvent) {
    e.preventDefault()
    if (!session) return
    const now = new Date().toISOString()
    await db.exec(
      `INSERT INTO cash_movements (id, session_id, type, amount_cents, reason, staff_name, created_at, updated_at, device_id, deleted)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        uuidv4(),
        session.id,
        movementType,
        brlToCents(movementAmount),
        movementReason || null,
        current?.name ?? null,
        now,
        now,
        getDeviceId(),
      ],
    )
    setMovementAmount('')
    setMovementReason('')
    await load()
  }

  const expectedCents = session ? session.opening_amount_cents + cashSales + movementsBalance(movements) : 0

  async function handleClose(e: React.FormEvent) {
    e.preventDefault()
    if (!session) return
    const now = new Date().toISOString()
    const counted = brlToCents(countedAmount)
    await db.exec(
      `UPDATE cash_sessions SET status = 'fechado', counted_amount_cents = ?, expected_amount_cents = ?, closed_at = ?, updated_at = ?, device_id = ?
       WHERE id = ?`,
      [counted, expectedCents, now, now, getDeviceId(), session.id],
    )
    setCountedAmount('')
    setClosing(false)
    await load()
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-md p-6">
        <h1 className="mb-4 text-lg font-semibold text-neutral-900">Abrir caixa</h1>
        <form onSubmit={handleOpen} className="flex flex-col gap-3 rounded border border-neutral-200 bg-white p-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-neutral-700">Fundo de caixa inicial</span>
            <input
              className="rounded border border-neutral-300 px-3 py-2"
              placeholder="R$ 0,00"
              value={openingAmount}
              onChange={(e) => setOpeningAmount(e.target.value)}
              required
            />
          </label>
          <button type="submit" className="rounded bg-neutral-900 px-4 py-2 font-medium text-white hover:bg-neutral-800">
            Abrir caixa
          </button>
        </form>

        {lastClosed && (
          <div className="mt-6 rounded border border-neutral-200 bg-white p-4 text-sm">
            <h2 className="mb-2 font-medium text-neutral-900">Último fechamento</h2>
            <p className="text-neutral-600">{lastClosed.closed_at && formatDateTime(lastClosed.closed_at)}</p>
            <p className="text-neutral-600">Esperado: {centsToBRL(lastClosed.expected_amount_cents ?? 0)}</p>
            <p className="text-neutral-600">Contado: {centsToBRL(lastClosed.counted_amount_cents ?? 0)}</p>
            <p className={(lastClosed.counted_amount_cents ?? 0) - (lastClosed.expected_amount_cents ?? 0) < 0 ? 'text-red-600' : 'text-green-600'}>
              Diferença: {centsToBRL((lastClosed.counted_amount_cents ?? 0) - (lastClosed.expected_amount_cents ?? 0))}
            </p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="mb-1 text-lg font-semibold text-neutral-900">Caixa aberto</h1>
      <p className="mb-4 text-sm text-neutral-500">Desde {formatDateTime(session.opened_at)}</p>

      <div className="mb-4 rounded border border-neutral-200 bg-white p-4 text-sm">
        <div className="flex justify-between py-0.5">
          <span>Fundo inicial</span>
          <span>{centsToBRL(session.opening_amount_cents)}</span>
        </div>
        <div className="flex justify-between py-0.5">
          <span>Vendas em dinheiro</span>
          <span>{centsToBRL(cashSales)}</span>
        </div>
        {movements.map((m) => (
          <div key={m.id} className="flex justify-between py-0.5 text-neutral-500">
            <span>
              {m.type === 'sangria' ? 'Sangria' : 'Suprimento'}
              {m.reason ? ` — ${m.reason}` : ''}
              {m.staff_name ? ` (${m.staff_name})` : ''}
            </span>
            <span>
              {m.type === 'sangria' ? '-' : '+'}
              {centsToBRL(m.amount_cents)}
            </span>
          </div>
        ))}
        <div className="mt-2 flex justify-between border-t border-neutral-200 pt-2 font-semibold">
          <span>Esperado em caixa</span>
          <span>{centsToBRL(expectedCents)}</span>
        </div>
      </div>

      <form onSubmit={handleAddMovement} className="mb-4 flex flex-col gap-2 rounded border border-neutral-200 bg-white p-4">
        <h2 className="font-medium text-neutral-900">Lançar movimento</h2>
        <div className="flex gap-2">
          <select
            className="rounded border border-neutral-300 px-3 py-2"
            value={movementType}
            onChange={(e) => setMovementType(e.target.value as CashMovementType)}
          >
            <option value="sangria">Sangria (retirada)</option>
            <option value="suprimento">Suprimento (entrada)</option>
          </select>
          <input
            className="flex-1 rounded border border-neutral-300 px-3 py-2"
            placeholder="R$ 0,00"
            value={movementAmount}
            onChange={(e) => setMovementAmount(e.target.value)}
            required
          />
        </div>
        <input
          className="rounded border border-neutral-300 px-3 py-2"
          placeholder="Motivo (opcional)"
          value={movementReason}
          onChange={(e) => setMovementReason(e.target.value)}
        />
        <button type="submit" className="rounded bg-neutral-900 px-4 py-1.5 font-medium text-white hover:bg-neutral-800">
          Lançar
        </button>
      </form>

      {closing ? (
        <form onSubmit={handleClose} className="flex flex-col gap-2 rounded border border-amber-300 bg-amber-50 p-4">
          <h2 className="font-medium text-neutral-900">Fechar caixa</h2>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-neutral-700">Valor contado (dinheiro físico)</span>
            <input
              className="rounded border border-neutral-300 px-3 py-2"
              placeholder="R$ 0,00"
              value={countedAmount}
              onChange={(e) => setCountedAmount(e.target.value)}
              required
            />
          </label>
          <div className="flex gap-2">
            <button type="submit" className="rounded bg-neutral-900 px-4 py-2 font-medium text-white hover:bg-neutral-800">
              Confirmar fechamento
            </button>
            <button type="button" onClick={() => setClosing(false)} className="rounded px-4 py-2 text-neutral-600 hover:bg-neutral-100">
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setClosing(true)}
          className="w-full rounded bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700"
        >
          Fechar caixa
        </button>
      )}
    </div>
  )
}
