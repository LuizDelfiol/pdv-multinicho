import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { useDb } from '../../db/DbProvider'
import type { Order } from '../../db/schema'
import { getDeviceId } from '../../shared/deviceId'
import { centsToBRL } from '../../shared/format'

export function MesasPage() {
  const db = useDb()
  const navigate = useNavigate()
  const [tables, setTables] = useState<Order[]>([])
  const [newTable, setNewTable] = useState('')

  async function load() {
    const rows = await db.query<Order>(
      "SELECT * FROM orders WHERE status = 'aberta' AND deleted = 0 ORDER BY table_number",
    )
    setTables(rows)
  }

  useEffect(() => {
    load()
  }, [db])

  async function openTable(e: React.FormEvent) {
    e.preventDefault()
    const label = newTable.trim()
    if (!label) return

    const existing = await db.query<Order>(
      "SELECT * FROM orders WHERE status = 'aberta' AND deleted = 0 AND table_number = ? LIMIT 1",
      [label],
    )
    if (existing[0]) {
      navigate(`/comanda/${existing[0].id}`)
      return
    }

    const now = new Date().toISOString()
    const orderId = uuidv4()
    await db.exec(
      `INSERT INTO orders (id, status, table_number, total_cents, created_at, updated_at, device_id, deleted)
       VALUES (?, 'aberta', ?, 0, ?, ?, ?, 0)`,
      [orderId, label, now, now, getDeviceId()],
    )
    setNewTable('')
    navigate(`/comanda/${orderId}`)
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-lg font-semibold text-neutral-900">Mesas</h1>

      <form onSubmit={openTable} className="mb-6 flex gap-2">
        <input
          className="flex-1 rounded border border-neutral-300 px-3 py-2"
          placeholder="Número da mesa"
          value={newTable}
          onChange={(e) => setNewTable(e.target.value)}
        />
        <button type="submit" className="rounded bg-neutral-900 px-4 py-2 font-medium text-white hover:bg-neutral-800">
          Abrir mesa
        </button>
      </form>

      <div className="grid grid-cols-3 gap-3">
        {tables.map((order) => (
          <button
            key={order.id}
            onClick={() => navigate(`/comanda/${order.id}`)}
            className="rounded border border-neutral-200 bg-white p-4 text-left hover:border-neutral-400"
          >
            <p className="font-medium text-neutral-900">Mesa {order.table_number}</p>
            <p className="text-sm text-neutral-500">{centsToBRL(order.total_cents)}</p>
          </button>
        ))}
        {tables.length === 0 && <p className="col-span-3 py-6 text-center text-neutral-400">Nenhuma mesa aberta.</p>}
      </div>
    </div>
  )
}
