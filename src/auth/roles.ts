import type { StaffRole } from '../db/schema'

const HIERARCHY: Record<StaffRole, number> = {
  operador: 0,
  gerente: 1,
  administrador: 2,
}

export function hasAccess(role: StaffRole, min: StaffRole): boolean {
  return HIERARCHY[role] >= HIERARCHY[min]
}

export async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(pin)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
