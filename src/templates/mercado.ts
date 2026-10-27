export interface BusinessTemplate {
  id: string
  label: string
  productLabel: string
}

export const mercadoTemplate: BusinessTemplate = {
  id: 'mercado',
  label: 'Mercado / Marcadinho',
  productLabel: 'Produto',
}

// Único template implementado por ora. Outros nichos (restaurante, barbearia,
// sorveteria) entram aqui depois como novas entradas desse mapa.
export const templates: Record<string, BusinessTemplate> = {
  mercado: mercadoTemplate,
}
