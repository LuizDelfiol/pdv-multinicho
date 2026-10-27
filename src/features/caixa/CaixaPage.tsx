import { useEffect, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useStaff } from '../../auth/StaffProvider'
import { useDb } from '../../db/DbProvider'
import type { PaymentMethod, Product } from '../../db/schema'
import { useBusinessConfig } from '../../shared/BusinessConfigProvider'
import { getDeviceId } from '../../shared/deviceId'
import { centsToBRL } from '../../shared/format'
import { ProductSearchInput } from '../../shared/ProductSearchInput'
import { Receipt, type ReceiptData } from './Receipt'

interface CartLine {
  productId: string
  name: string
  unitPriceCents: number
  quantity: number
  availableStock: number
}

export function CaixaPage() {
  const db = useDb()
  const { name: businessName } = useBusinessConfig()
  const { current } = useStaff()
  const [cart, setCart] = useState<CartLine[]>([])
  const [lastReceipt, setLastReceipt] = useState<ReceiptData | null>(null)

  useEffect(() => {
    if (!lastReceipt) return
    const clear = () => setLastReceipt(null)
    window.addEventListener('afterprint', clear)
    window.print()
    return () => window.removeEventListener('afterprint', clear)
  }, [lastReceipt])

  function addToCart(p: Product) {
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === p.id)
      if (existing) {
        return prev.map((l) => (l.productId === p.id ? { ...l, quantity: l.quantity + 1 } : l))
      }
      return [...prev, { productId: p.id, name: p.name, unitPriceCents: p.price_cents, quantity: 1, availableStock: p.stock }]
    })
  }

  function updateQuantity(productId: string, quantity: number) {
    setCart((prev) =>
      quantity <= 0 ? prev.filter((l) => l.productId !== productId) : prev.map((l) => (l.productId === productId ? { ...l, quantity } : l)),
    )
  }

  const totalCents = cart.reduce((sum, l) => sum + l.quantity * l.unitPriceCents, 0)

  async function finalize(method: PaymentMethod) {
    if (cart.length === 0) return
    const now = new Date().toISOString()
    const deviceId = getDeviceId()
    const orderId = uuidv4()

    await db.transaction(async () => {
      await db.exec(
        `INSERT INTO orders (id, status, staff_name, total_cents, created_at, updated_at, device_id, deleted)
         VALUES (?, 'finalizada', ?, ?, ?, ?, ?, 0)`,
        [orderId, current?.name ?? null, totalCents, now, now, deviceId],
      )
      for (const line of cart) {
        await db.exec(
          `INSERT INTO order_items (id, order_id, product_id, product_name, quantity, unit_price_cents, updated_at, device_id, deleted)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
          [uuidv4(), orderId, line.productId, line.name, line.quantity, line.unitPriceCents, now, deviceId],
        )
        await db.exec('UPDATE products SET stock = stock - ?, updated_at = ? WHERE id = ?', [
          line.quantity,
          now,
          line.productId,
        ])
      }
      await db.exec(
        `INSERT INTO payments (id, order_id, method, amount_cents, created_at, updated_at, device_id, deleted)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
        [uuidv4(), orderId, method, totalCents, now, now, deviceId],
      )
    })

    setLastReceipt({
      businessName,
      createdAt: now,
      items: cart.map((l) => ({ name: l.name, quantity: l.quantity, unitPriceCents: l.unitPriceCents })),
      totalCents,
      method,
    })
    setCart([])
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-4">
        <ProductSearchInput onSelect={addToCart} />
      </div>

      <table className="no-print mb-4 w-full border-collapse overflow-hidden rounded border border-neutral-200 bg-white text-sm">
        <thead className="bg-neutral-100 text-left text-neutral-600">
          <tr>
            <th className="px-3 py-2">Produto</th>
            <th className="px-3 py-2">Qtd</th>
            <th className="px-3 py-2">Unit.</th>
            <th className="px-3 py-2">Subtotal</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {cart.map((line) => (
            <tr key={line.productId} className="border-t border-neutral-100">
              <td className="px-3 py-2">{line.name}</td>
              <td className="px-3 py-2">
                <input
                  type="number"
                  min={0}
                  className={`w-16 rounded border px-1 py-0.5 ${
                    line.quantity > line.availableStock ? 'border-amber-500 bg-amber-50' : 'border-neutral-300'
                  }`}
                  value={line.quantity}
                  onChange={(e) => updateQuantity(line.productId, Number.parseFloat(e.target.value) || 0)}
                />
                {line.quantity > line.availableStock && (
                  <p className="mt-0.5 text-xs text-amber-600">só {line.availableStock} em estoque</p>
                )}
              </td>
              <td className="px-3 py-2">{centsToBRL(line.unitPriceCents)}</td>
              <td className="px-3 py-2">{centsToBRL(line.quantity * line.unitPriceCents)}</td>
              <td className="px-3 py-2 text-right">
                <button onClick={() => updateQuantity(line.productId, 0)} className="text-red-600 hover:underline">
                  Remover
                </button>
              </td>
            </tr>
          ))}
          {cart.length === 0 && (
            <tr>
              <td colSpan={5} className="px-3 py-6 text-center text-neutral-400">
                Carrinho vazio.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="no-print flex items-center justify-between rounded border border-neutral-200 bg-white p-4">
        <span className="text-xl font-semibold">Total: {centsToBRL(totalCents)}</span>
        <div className="flex gap-2">
          <button
            disabled={cart.length === 0}
            onClick={() => finalize('dinheiro')}
            className="rounded bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700 disabled:opacity-40"
          >
            Dinheiro
          </button>
          <button
            disabled={cart.length === 0}
            onClick={() => finalize('cartao')}
            className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-40"
          >
            Cartão
          </button>
          <button
            disabled={cart.length === 0}
            onClick={() => finalize('pix')}
            className="rounded bg-purple-600 px-4 py-2 font-medium text-white hover:bg-purple-700 disabled:opacity-40"
          >
            Pix
          </button>
        </div>
      </div>

      {lastReceipt && <Receipt data={lastReceipt} />}
    </div>
  )
}
