export type BusinessFlow = 'venda-direta' | 'mesa-comanda'

export interface NavLinkDef {
  to: string
  label: string
}

export interface BusinessTemplate {
  id: string
  label: string
  productLabel: string
  flow: BusinessFlow
  nav: NavLinkDef[]
}
