import { mercadoTemplate } from './mercado'
import { restauranteTemplate } from './restaurante'
import type { BusinessTemplate } from './types'

export type { BusinessFlow, BusinessTemplate, NavLinkDef } from './types'

export const templates: Record<string, BusinessTemplate> = {
  mercado: mercadoTemplate,
  restaurante: restauranteTemplate,
}

export const defaultTemplate = mercadoTemplate
