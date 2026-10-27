import type { BusinessTemplate } from './types'

export const restauranteTemplate: BusinessTemplate = {
  id: 'restaurante',
  label: 'Restaurante',
  productLabel: 'Item do cardápio',
  flow: 'mesa-comanda',
  nav: [
    { to: '/', label: 'Mesas', minRole: 'operador' },
    { to: '/catalogo', label: 'Cardápio', minRole: 'gerente' },
    { to: '/vendas', label: 'Vendas', minRole: 'gerente' },
    { to: '/fechamento', label: 'Fechamento', minRole: 'gerente' },
    { to: '/config', label: 'Config', minRole: 'administrador' },
  ],
}
