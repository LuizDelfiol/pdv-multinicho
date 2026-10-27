import { centsToBRL, formatDateTime } from '../../shared/format'
import type { PaymentMethod } from '../../db/schema'

export interface ReceiptData {
  businessName: string
  createdAt: string
  items: { name: string; quantity: number; unitPriceCents: number }[]
  totalCents: number
  method: PaymentMethod
}

const methodLabel: Record<PaymentMethod, string> = {
  dinheiro: 'Dinheiro',
  cartao: 'Cartão',
  pix: 'Pix',
}

export function Receipt({ data }: { data: ReceiptData }) {
  return (
    <div className="print-only mx-auto w-[80mm] p-2 font-mono text-xs text-black">
      <p className="text-center font-bold">{data.businessName}</p>
      <p className="text-center">{formatDateTime(data.createdAt)}</p>
      <hr className="my-1 border-black" />
      {data.items.map((item, i) => (
        <div key={i} className="flex justify-between">
          <span>
            {item.quantity}x {item.name}
          </span>
          <span>{centsToBRL(item.quantity * item.unitPriceCents)}</span>
        </div>
      ))}
      <hr className="my-1 border-black" />
      <div className="flex justify-between font-bold">
        <span>Total</span>
        <span>{centsToBRL(data.totalCents)}</span>
      </div>
      <p>Pagamento: {methodLabel[data.method]}</p>
      <p className="mt-2 text-center">Obrigado pela compra!</p>
    </div>
  )
}
