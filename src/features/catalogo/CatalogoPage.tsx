import { useEffect, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useDb } from '../../db/DbProvider'
import type { Product } from '../../db/schema'
import { getDeviceId } from '../../shared/deviceId'
import { brlToCents, centsToBRL } from '../../shared/format'

const emptyForm = { id: null as string | null, code: '', name: '', price: '', stock: '1', unit: 'un' }

export function CatalogoPage() {
  const db = useDb()
  const [products, setProducts] = useState<Product[]>([])
  const [form, setForm] = useState(emptyForm)

  async function load() {
    const rows = await db.query<Product>('SELECT * FROM products WHERE deleted = 0 ORDER BY name')
    setProducts(rows)
  }

  useEffect(() => {
    load()
  }, [db])

  function startEdit(p: Product) {
    setForm({
      id: p.id,
      code: p.code ?? '',
      name: p.name,
      price: (p.price_cents / 100).toFixed(2).replace('.', ','),
      stock: String(p.stock),
      unit: p.unit,
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const now = new Date().toISOString()
    const deviceId = getDeviceId()
    const priceCents = brlToCents(form.price)
    const stock = Number.parseFloat(form.stock.replace(',', '.')) || 0

    if (form.id) {
      await db.exec(
        `UPDATE products SET code = ?, name = ?, price_cents = ?, stock = ?, unit = ?, updated_at = ?, device_id = ?
         WHERE id = ?`,
        [form.code || null, form.name, priceCents, stock, form.unit, now, deviceId, form.id],
      )
    } else {
      await db.exec(
        `INSERT INTO products (id, code, name, price_cents, stock, unit, updated_at, device_id, deleted)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [uuidv4(), form.code || null, form.name, priceCents, stock, form.unit, now, deviceId],
      )
    }
    setForm(emptyForm)
    await load()
  }

  async function handleDelete(id: string) {
    await db.exec('UPDATE products SET deleted = 1, updated_at = ? WHERE id = ?', [
      new Date().toISOString(),
      id,
    ])
    await load()
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-4 text-lg font-semibold text-neutral-900">Catálogo de produtos</h1>

      <form onSubmit={handleSubmit} className="mb-6 grid grid-cols-6 gap-2 rounded border border-neutral-200 bg-white p-4">
        <input
          className="col-span-1 rounded border border-neutral-300 px-2 py-1.5"
          placeholder="Código de barras"
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
        />
        <input
          className="col-span-2 rounded border border-neutral-300 px-2 py-1.5"
          placeholder="Nome do produto"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          className="col-span-1 rounded border border-neutral-300 px-2 py-1.5"
          placeholder="Preço (R$)"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
          required
        />
        <input
          className="col-span-1 rounded border border-neutral-300 px-2 py-1.5"
          placeholder="Estoque"
          value={form.stock}
          onChange={(e) => setForm({ ...form, stock: e.target.value })}
        />
        <select
          className="col-span-1 rounded border border-neutral-300 px-2 py-1.5"
          value={form.unit}
          onChange={(e) => setForm({ ...form, unit: e.target.value })}
        >
          <option value="un">un</option>
          <option value="kg">kg</option>
        </select>
        <div className="col-span-6 flex gap-2">
          <button type="submit" className="rounded bg-neutral-900 px-4 py-1.5 font-medium text-white hover:bg-neutral-800">
            {form.id ? 'Salvar alteração' : 'Adicionar produto'}
          </button>
          {form.id && (
            <button type="button" onClick={() => setForm(emptyForm)} className="rounded px-4 py-1.5 text-neutral-600 hover:bg-neutral-100">
              Cancelar
            </button>
          )}
        </div>
      </form>

      <table className="w-full border-collapse overflow-hidden rounded border border-neutral-200 bg-white text-sm">
        <thead className="bg-neutral-100 text-left text-neutral-600">
          <tr>
            <th className="px-3 py-2">Código</th>
            <th className="px-3 py-2">Nome</th>
            <th className="px-3 py-2">Preço</th>
            <th className="px-3 py-2">Estoque</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} className="border-t border-neutral-100">
              <td className="px-3 py-2 text-neutral-500">{p.code ?? '—'}</td>
              <td className="px-3 py-2">{p.name}</td>
              <td className="px-3 py-2">{centsToBRL(p.price_cents)}</td>
              <td className="px-3 py-2">
                {p.stock} {p.unit}
              </td>
              <td className="px-3 py-2 text-right">
                <button onClick={() => startEdit(p)} className="mr-2 text-neutral-600 hover:underline">
                  Editar
                </button>
                <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:underline">
                  Excluir
                </button>
              </td>
            </tr>
          ))}
          {products.length === 0 && (
            <tr>
              <td colSpan={5} className="px-3 py-6 text-center text-neutral-400">
                Nenhum produto cadastrado ainda.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
