import type { BusinessTemplate } from './types'

export const restauranteTemplate: BusinessTemplate = {
  id: 'restaurante',
  label: 'Restaurante',
  productLabel: 'Item do cardápio',
  flow: 'mesa-comanda',
  nav: [
    { to: '/', label: 'Mesas' },
    { to: '/catalogo', label: 'Cardápio' },
    { to: '/vendas', label: 'Vendas' },
    { to: '/config', label: 'Config' },
  ],
}
