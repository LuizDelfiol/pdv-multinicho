import { useState } from 'react'
import type { PaymentMethod } from '../db/schema'

interface PaymentButtonsProps {
  disabled: boolean
  onPay: (method: PaymentMethod, installments: number | null) => void
}

const INSTALLMENT_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1)

export function PaymentButtons({ disabled, onPay }: PaymentButtonsProps) {
  const [choosingInstallments, setChoosingInstallments] = useState(false)

  if (choosingInstallments) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-neutral-600">Em quantas vezes?</span>
        {INSTALLMENT_OPTIONS.map((n) => (
          <button
            key={n}
            onClick={() => {
              onPay('cartao', n)
              setChoosingInstallments(false)
            }}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            {n}x
          </button>
        ))}
        <button onClick={() => setChoosingInstallments(false)} className="rounded px-3 py-1.5 text-sm text-neutral-500 hover:bg-neutral-100">
          Voltar
        </button>
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      <button
        disabled={disabled}
        onClick={() => onPay('dinheiro', null)}
        className="rounded bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700 disabled:opacity-40"
      >
        Dinheiro
      </button>
      <button
        disabled={disabled}
        onClick={() => setChoosingInstallments(true)}
        className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-40"
      >
        Cartão
      </button>
      <button
        disabled={disabled}
        onClick={() => onPay('pix', null)}
        className="rounded bg-purple-600 px-4 py-2 font-medium text-white hover:bg-purple-700 disabled:opacity-40"
      >
        Pix
      </button>
    </div>
  )
}
