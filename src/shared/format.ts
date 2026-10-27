export function centsToBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export function brlToCents(value: string): number {
  const normalized = value.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')
  const asFloat = Number.parseFloat(normalized)
  return Number.isFinite(asFloat) ? Math.round(asFloat * 100) : 0
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR')
}

export function paymentMethodLabel(method: 'dinheiro' | 'cartao' | 'pix', installments?: number | null): string {
  const label = { dinheiro: 'Dinheiro', cartao: 'Cartão', pix: 'Pix' }[method]
  return method === 'cartao' && installments && installments > 1 ? `${label} ${installments}x` : label
}
