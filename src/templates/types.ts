import type { StaffRole } from '../db/schema'

export type BusinessFlow = 'venda-direta' | 'mesa-comanda'

export interface NavLinkDef {
  to: string
  label: string
  minRole: StaffRole
}

export interface BusinessTemplate {
  id: string
  label: string
  productLabel: string
  flow: BusinessFlow
  nav: NavLinkDef[]
}
