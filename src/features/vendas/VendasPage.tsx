import { useEffect, useState } from 'react'
import { useDb } from '../../db/DbProvider'
import type { Order, OrderItem, PaymentMethod } from '../../db/schema'
import { getDeviceId } from '../../shared/deviceId'
import { centsToBRL, formatDateTime } from '../../shared/format'

type Period = 'hoje' | '7dias' | 'tudo'
type OrderRow = Order & { method: PaymentMethod | null }

function periodStartIso(period: Period): string | null {
  const now = new Date()
  if (period === 'hoje') return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  if (period === '7dias') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  return null
}

const methodLabel: Record<PaymentMethod, string> = { dinheiro: 'Dinheiro', cartao: 'Cartão', pix: 'Pix' }

export function VendasPage() {
  const db = useDb()
  const [period, setPeriod] = useState<Period>('hoje')
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [itemsByOrder, setItemsByOrder] = useState<Record<string, OrderItem[]>>({})
  const [confirmingCancelId, setConfirmingCancelId] = useState<string | null>(null)

  async function load() {
    const start = periodStartIso(period)
    const sql = `SELECT o.*, p.method as method FROM orders o LEFT JOIN payments p ON p.order_id = o.id
                 WHERE o.deleted = 0 ${start ? 'AND o.created_at >= ?' : ''} ORDER BY o.created_at DESC`
    setOrders(await db.query<OrderRow>(sql, start ? [start] : []))
  }

  useEffect(() => {
    load()
  }, [db, period])

  async function loadItems(orderId: string): Promise<OrderItem[]> {
    if (itemsByOrder[orderId]) return itemsByOrder[orderId]
    const items = await db.query<OrderItem>('SELECT * FROM order_items WHERE order_id = ? AND deleted = 0', [orderId])
    setItemsByOrder((prev) => ({ ...prev, [orderId]: items }))
    return items
  }

  async function toggleExpand(order: OrderRow) {
    if (expandedId === order.id) {
      setExpandedId(null)
      return
    }
    setExpandedId(order.id)
    await loadItems(order.id)
  }

  async function handleCancel(order: OrderRow) {
    const items = await loadItems(order.id)
    const now = new Date().toISOString()
    const deviceId = getDeviceId()
    await db.transaction(async () => {
      await db.exec('UPDATE orders SET status = ?, updated_at = ?, device_id = ? WHERE id = ?', ['cancelada', now, deviceId, order.id])
      for (const item of items) {
        await db.exec('UPDATE products SET stock = stock + ?, updated_at = ?, device_id = ? WHERE id = ?', [
          item.quantity,
          now,
          deviceId,
          item.product_id,
        ])
      }
    })
    setConfirmingCancelId(null)
    await load()
  }

  const vendasValidas = orders.filter((o) => o.status !== 'cancelada')
  const totalPeriodo = vendasValidas.reduce((sum, o) => sum + o.total_cents, 0)

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-neutral-900">Vendas</h1>
        <select
          className="rounded border border-neutral-300 px-3 py-1.5"
          value={period}
          onChange={(e) => setPeriod(e.target.value as Period)}
        >
          <option value="hoje">Hoje</option>
          <option value="7dias">Últimos 7 dias</option>
          <option value="tudo">Tudo</option>
        </select>
      </div>

      <p className="mb-4 text-sm text-neutral-600">
        {vendasValidas.length} venda(s) — total {centsToBRL(totalPeriodo)}
      </p>

      <div className="divide-y divide-neutral-100 rounded border border-neutral-200 bg-white">
        {orders.map((order) => {
          const cancelada = order.status === 'cancelada'
          return (
            <div key={order.id}>
              <div className={`flex items-center justify-between px-4 py-3 ${cancelada ? 'opacity-50' : ''}`}>
                <button onClick={() => toggleExpand(order)} className="flex flex-1 items-center justify-between text-left hover:underline">
                  <span className="text-sm text-neutral-700">{formatDateTime(order.created_at)}</span>
                  <span className="text-sm text-neutral-500">{order.staff_name ?? '—'}</span>
                  <span className="text-sm text-neutral-500">{order.method ? methodLabel[order.method] : '—'}</span>
                  <span className={`mx-3 font-medium ${cancelada ? 'line-through' : ''}`}>{centsToBRL(order.total_cents)}</span>
                </button>

                {cancelada ? (
                  <span className="text-xs font-medium text-red-600">Cancelada</span>
                ) : confirmingCancelId === order.id ? (
                  <span className="flex items-center gap-2 text-xs">
                    <span className="text-neutral-600">Cancelar venda?</span>
                    <button onClick={() => handleCancel(order)} className="font-medium text-red-600 hover:underline">
                      Sim
                    </button>
                    <button onClick={() => setConfirmingCancelId(null)} className="text-neutral-500 hover:underline">
                      Não
                    </button>
                  </span>
                ) : (
                  <button
                    onClick={() => setConfirmingCancelId(order.id)}
                    className="text-xs text-neutral-400 hover:text-red-600 hover:underline"
                  >
                    Cancelar
                  </button>
                )}
              </div>
              {expandedId === order.id && (
                <div className="bg-neutral-50 px-4 py-2 text-sm">
                  {(itemsByOrder[order.id] ?? []).map((item) => (
                    <div key={item.id} className="flex justify-between py-0.5">
                      <span>
                        {item.quantity}x {item.product_name}
                      </span>
                      <span>{centsToBRL(item.quantity * item.unit_price_cents)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
        {orders.length === 0 && <p className="px-4 py-6 text-center text-neutral-400">Nenhuma venda no período.</p>}
      </div>
    </div>
  )
}
