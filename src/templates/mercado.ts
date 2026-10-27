import type { BusinessTemplate } from './types'

export const mercadoTemplate: BusinessTemplate = {
  id: 'mercado',
  label: 'Mercado / Marcadinho',
  productLabel: 'Produto',
  flow: 'venda-direta',
  nav: [
    { to: '/', label: 'Caixa', minRole: 'operador' },
    { to: '/catalogo', label: 'Catálogo', minRole: 'gerente' },
    { to: '/vendas', label: 'Vendas', minRole: 'gerente' },
    { to: '/fechamento', label: 'Fechamento', minRole: 'gerente' },
    { to: '/config', label: 'Config', minRole: 'administrador' },
  ],
}
