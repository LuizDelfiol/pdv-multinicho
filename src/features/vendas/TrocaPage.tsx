import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { useStaff } from '../../auth/StaffProvider'
import { useDb } from '../../db/DbProvider'
import type { Order, OrderItem, PaymentMethod, Product } from '../../db/schema'
import { getDeviceId } from '../../shared/deviceId'
import { centsToBRL, formatDateTime } from '../../shared/format'
import { PaymentButtons } from '../../shared/PaymentButtons'
import { ProductSearchInput } from '../../shared/ProductSearchInput'

interface NewLine {
  productId: string
  name: string
  unitPriceCents: number
  quantity: number
}

export function TrocaPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const db = useDb()
  const navigate = useNavigate()
  const { current } = useStaff()
  const [order, setOrder] = useState<Order | null>(null)
  const [originalItems, setOriginalItems] = useState<OrderItem[]>([])
  const [returning, setReturning] = useState<Record<string, number>>({})
  const [newItems, setNewItems] = useState<NewLine[]>([])

  async function load() {
    if (!orderId) return
    const orders = await db.query<Order>('SELECT * FROM orders WHERE id = ?', [orderId])
    setOrder(orders[0] ?? null)
    setOriginalItems(await db.query<OrderItem>('SELECT * FROM order_items WHERE order_id = ? AND deleted = 0', [orderId]))
  }

  useEffect(() => {
    load()
  }, [db, orderId])

  function setReturnQty(itemId: string, qty: number, max: number) {
    setReturning((prev) => ({ ...prev, [itemId]: Math.max(0, Math.min(qty, max)) }))
  }

  function addNewItem(p: Product) {
    setNewItems((prev) => {
      const existing = prev.find((l) => l.productId === p.id)
      if (existing) return prev.map((l) => (l.productId === p.id ? { ...l, quantity: l.quantity + 1 } : l))
      return [...prev, { productId: p.id, name: p.name, unitPriceCents: p.price_cents, quantity: 1 }]
    })
  }

  function removeNewItem(productId: string) {
    setNewItems((prev) => prev.filter((l) => l.productId !== productId))
  }

  const returnedTotal = originalItems.reduce((sum, i) => sum + (returning[i.id] ?? 0) * i.unit_price_cents, 0)
  const newTotal = newItems.reduce((sum, l) => sum + l.quantity * l.unitPriceCents, 0)
  const diff = newTotal - returnedTotal
  const hasAnyLine = returnedTotal > 0 || newTotal > 0

  async function confirmExchange(method: PaymentMethod | null, installments: number | null) {
    if (!order || !hasAnyLine) return
    const now = new Date().toISOString()
    const deviceId = getDeviceId()
    const newOrderId = uuidv4()

    const lines = [
      ...originalItems
        .filter((i) => (returning[i.id] ?? 0) > 0)
        .map((i) => ({
          productId: i.product_id,
          productName: i.product_name,
          unitPriceCents: i.unit_price_cents,
          quantity: -(returning[i.id] ?? 0),
        })),
      ...newItems.map((l) => ({ productId: l.productId, productName: l.name, unitPriceCents: l.unitPriceCents, quantity: l.quantity })),
    ]

    await db.transaction(async () => {
      await db.exec(
        `INSERT INTO orders (id, status, staff_name, total_cents, exchange_of_order_id, created_at, updated_at, device_id, deleted)
         VALUES (?, 'finalizada', ?, ?, ?, ?, ?, ?, 0)`,
        [newOrderId, current?.name ?? null, diff, order.id, now, now, deviceId],
      )
      for (const line of lines) {
        await db.exec(
          `INSERT INTO order_items (id, order_id, product_id, product_name, quantity, unit_price_cents, updated_at, device_id, deleted)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
          [uuidv4(), newOrderId, line.productId, line.productName, line.quantity, line.unitPriceCents, now, deviceId],
        )
        await db.exec('UPDATE products SET stock = stock - ?, updated_at = ? WHERE id = ?', [line.quantity, now, line.productId])
      }
      if (diff !== 0 && method) {
        await db.exec(
          `INSERT INTO payments (id, order_id, method, amount_cents, installments, created_at, updated_at, device_id, deleted)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
          [uuidv4(), newOrderId, method, diff, installments, now, now, deviceId],
        )
      }
    })

    navigate('/vendas')
  }

  if (!order) {
    return <div className="p-6 text-neutral-500">Carregando…</div>
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-neutral-900">Troca — venda de {formatDateTime(order.created_at)}</h1>
        <Link to="/vendas" className="text-sm text-neutral-500 hover:underline">
          Voltar
        </Link>
      </div>

      <div className="mb-4 rounded border border-neutral-200 bg-white p-4">
        <h2 className="mb-2 font-medium text-neutral-900">O que volta</h2>
        {originalItems.map((item) => (
          <div key={item.id} className="flex items-center justify-between py-1 text-sm">
            <span>
              {item.product_name} <span className="text-neutral-400">({centsToBRL(item.unit_price_cents)} un.)</span>
            </span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={item.quantity}
                className="w-16 rounded border border-neutral-300 px-1 py-0.5"
                value={returning[item.id] ?? 0}
                onChange={(e) => setReturnQty(item.id, Number.parseFloat(e.target.value) || 0, item.quantity)}
              />
              <span className="text-neutral-400">de {item.quantity}</span>
            </div>
          </div>
        ))}
        {originalItems.length === 0 && <p className="text-sm text-neutral-400">Essa venda não tem itens ativos pra devolver.</p>}
      </div>

      <div className="mb-4 rounded border border-neutral-200 bg-white p-4">
        <h2 className="mb-2 font-medium text-neutral-900">O que leva no lugar</h2>
        <ProductSearchInput onSelect={addNewItem} />
        {newItems.map((line) => (
          <div key={line.productId} className="mt-2 flex items-center justify-between text-sm">
            <span>
              {line.quantity}x {line.name}
            </span>
            <div className="flex items-center gap-2">
              <span>{centsToBRL(line.quantity * line.unitPriceCents)}</span>
              <button onClick={() => removeNewItem(line.productId)} className="text-red-600 hover:underline">
                Remover
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded border border-neutral-200 bg-white p-4">
        <div className="mb-1 flex justify-between text-sm text-neutral-600">
          <span>Devolvido</span>
          <span>{centsToBRL(returnedTotal)}</span>
        </div>
        <div className="mb-3 flex justify-between text-sm text-neutral-600">
          <span>Novo</span>
          <span>{centsToBRL(newTotal)}</span>
        </div>
        <div className="mb-4 flex justify-between border-t border-neutral-200 pt-3 font-semibold">
          <span>{diff > 0 ? 'Cliente paga' : diff < 0 ? 'Devolver ao cliente' : 'Sem diferença'}</span>
          <span>{centsToBRL(Math.abs(diff))}</span>
        </div>

        {diff === 0 ? (
          <button
            disabled={!hasAnyLine}
            onClick={() => confirmExchange(null, null)}
            className="w-full rounded bg-neutral-900 px-4 py-2 font-medium text-white hover:bg-neutral-800 disabled:opacity-40"
          >
            Confirmar troca
          </button>
        ) : (
          <PaymentButtons disabled={!hasAnyLine} onPay={confirmExchange} />
        )}
      </div>
    </div>
  )
}
