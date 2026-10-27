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
