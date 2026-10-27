import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { useStaff } from '../../auth/StaffProvider'
import { useDb } from '../../db/DbProvider'
import type { Order, OrderItem, PaymentMethod, Product } from '../../db/schema'
import { useBusinessConfig } from '../../shared/BusinessConfigProvider'
import { getDeviceId } from '../../shared/deviceId'
import { centsToBRL } from '../../shared/format'
import { PaymentButtons } from '../../shared/PaymentButtons'
import { ProductSearchInput } from '../../shared/ProductSearchInput'
import { Receipt, type ReceiptData } from '../caixa/Receipt'

export function ComandaPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const db = useDb()
  const navigate = useNavigate()
  const { name: businessName } = useBusinessConfig()
  const { current } = useStaff()
  const [order, setOrder] = useState<Order | null>(null)
  const [items, setItems] = useState<OrderItem[]>([])
  const [lastReceipt, setLastReceipt] = useState<ReceiptData | null>(null)

  async function load() {
    if (!orderId) return
    const orders = await db.query<Order>('SELECT * FROM orders WHERE id = ?', [orderId])
    setOrder(orders[0] ?? null)
    setItems(await db.query<OrderItem>('SELECT * FROM order_items WHERE order_id = ? AND deleted = 0', [orderId]))
  }

  useEffect(() => {
    load()
  }, [db, orderId])

  useEffect(() => {
    if (!lastReceipt) return
    const clear = () => setLastReceipt(null)
    window.addEventListener('afterprint', clear)
    window.print()
    return () => window.removeEventListener('afterprint', clear)
  }, [lastReceipt])

  async function addItem(p: Product) {
    if (!order) return
    const now = new Date().toISOString()
    const deviceId = getDeviceId()
    await db.transaction(async () => {
      await db.exec(
        `INSERT INTO order_items (id, order_id, product_id, product_name, quantity, unit_price_cents, updated_at, device_id, deleted)
         VALUES (?, ?, ?, ?, 1, ?, ?, ?, 0)`,
        [uuidv4(), order.id, p.id, p.name, p.price_cents, now, deviceId],
      )
      await db.exec('UPDATE orders SET total_cents = total_cents + ?, updated_at = ?, device_id = ? WHERE id = ?', [
        p.price_cents,
        now,
        deviceId,
        order.id,
      ])
    })
    await load()
  }

  async function removeItem(item: OrderItem) {
    if (!order) return
    const now = new Date().toISOString()
    const deviceId = getDeviceId()
    await db.transaction(async () => {
      await db.exec('UPDATE order_items SET deleted = 1, updated_at = ?, device_id = ? WHERE id = ?', [now, deviceId, item.id])
      await db.exec('UPDATE orders SET total_cents = total_cents - ?, updated_at = ?, device_id = ? WHERE id = ?', [
        item.quantity * item.unit_price_cents,
        now,
        deviceId,
        order.id,
      ])
    })
    await load()
  }

  async function closeTable(method: PaymentMethod, installments: number | null) {
    if (!order || items.length === 0) return
    const now = new Date().toISOString()
    const deviceId = getDeviceId()
    const totalCents = items.reduce((sum, i) => sum + i.quantity * i.unit_price_cents, 0)

    await db.transaction(async () => {
      for (const item of items) {
        await db.exec('UPDATE products SET stock = stock - ?, updated_at = ?, device_id = ? WHERE id = ?', [
          item.quantity,
          now,
          deviceId,
          item.product_id,
        ])
      }
      await db.exec('UPDATE orders SET status = ?, staff_name = ?, total_cents = ?, updated_at = ?, device_id = ? WHERE id = ?', [
        'finalizada',
        current?.name ?? null,
        totalCents,
        now,
        deviceId,
        order.id,
      ])
      await db.exec(
        `INSERT INTO payments (id, order_id, method, amount_cents, installments, created_at, updated_at, device_id, deleted)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [uuidv4(), order.id, method, totalCents, installments, now, now, deviceId],
      )
    })

    setLastReceipt({
      businessName,
      createdAt: now,
      items: items.map((i) => ({ name: i.product_name, quantity: i.quantity, unitPriceCents: i.unit_price_cents })),
      totalCents,
      method,
      installments,
    })
    navigate('/')
  }

  if (!order) {
    return <div className="p-6 text-neutral-500">Carregando…</div>
  }

  const totalCents = items.reduce((sum, i) => sum + i.quantity * i.unit_price_cents, 0)

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="no-print mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-neutral-900">Mesa {order.table_number}</h1>
        <button onClick={() => navigate('/')} className="text-sm text-neutral-500 hover:underline">
          Voltar pras mesas
        </button>
      </div>

      <div className="mb-4">
        <ProductSearchInput onSelect={addItem} placeholder="Bipar código ou digitar item do cardápio" />
      </div>

      <table className="no-print mb-4 w-full border-collapse overflow-hidden rounded border border-neutral-200 bg-white text-sm">
        <thead className="bg-neutral-100 text-left text-neutral-600">
          <tr>
            <th className="px-3 py-2">Item</th>
            <th className="px-3 py-2">Unit.</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-t border-neutral-100">
              <td className="px-3 py-2">
                {item.quantity}x {item.product_name}
              </td>
              <td className="px-3 py-2">{centsToBRL(item.quantity * item.unit_price_cents)}</td>
              <td className="px-3 py-2 text-right">
                <button onClick={() => removeItem(item)} className="text-red-600 hover:underline">
                  Remover
                </button>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={3} className="px-3 py-6 text-center text-neutral-400">
                Nenhum item lançado.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="no-print flex items-center justify-between rounded border border-neutral-200 bg-white p-4">
        <span className="text-xl font-semibold">Total: {centsToBRL(totalCents)}</span>
        <PaymentButtons disabled={items.length === 0} onPay={closeTable} />
      </div>

      {lastReceipt && <Receipt data={lastReceipt} />}
    </div>
  )
}
