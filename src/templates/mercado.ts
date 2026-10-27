import type { BusinessTemplate } from './types'

export const mercadoTemplate: BusinessTemplate = {
  id: 'mercado',
  label: 'Mercado / Marcadinho',
  productLabel: 'Produto',
  flow: 'venda-direta',
  nav: [
    { to: '/', label: 'Caixa' },
    { to: '/catalogo', label: 'Catálogo' },
    { to: '/vendas', label: 'Vendas' },
    { to: '/config', label: 'Config' },
  ],
}
