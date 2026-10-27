import { useRef, useState } from 'react'
import { useDb } from '../db/DbProvider'
import type { Product } from '../db/schema'
import { centsToBRL } from './format'
import { normalize } from './text'

interface ProductSearchInputProps {
  onSelect: (product: Product) => void
  placeholder?: string
}

export function ProductSearchInput({ onSelect, placeholder }: ProductSearchInputProps) {
  const db = useDb()
  const inputRef = useRef<HTMLInputElement>(null)
  const [searchInput, setSearchInput] = useState('')
  const [matches, setMatches] = useState<Product[]>([])

  function select(p: Product) {
    onSelect(p)
    setSearchInput('')
    setMatches([])
    inputRef.current?.focus()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const term = searchInput.trim()
    if (!term) return

    const byCode = await db.query<Product>('SELECT * FROM products WHERE deleted = 0 AND code = ? LIMIT 1', [term])
    if (byCode[0]) {
      select(byCode[0])
      return
    }

    const all = await db.query<Product>('SELECT * FROM products WHERE deleted = 0')
    const needle = normalize(term)
    const byName = all.filter((p) => normalize(p.name).includes(needle)).slice(0, 8)
    if (byName.length === 1) {
      select(byName[0])
    } else {
      setMatches(byName)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="no-print">
      <input
        ref={inputRef}
        autoFocus
        className="w-full rounded border border-neutral-300 px-3 py-2 text-lg"
        placeholder={placeholder ?? 'Bipar código de barras ou digitar nome'}
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
      />
      {matches.length > 0 && (
        <ul className="mt-1 rounded border border-neutral-200 bg-white shadow-sm">
          {matches.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => select(p)}
                className="flex w-full justify-between px-3 py-2 text-left hover:bg-neutral-100"
              >
                <span>{p.name}</span>
                <span>{centsToBRL(p.price_cents)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  )
}
