import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { useDb } from '../db/DbProvider'
import type { BusinessConfig } from '../db/schema'
import { defaultTemplate, templates, type BusinessTemplate } from '../templates'

interface BusinessConfigValue {
  name: string
  template: BusinessTemplate
  reload: () => Promise<void>
}

const BusinessConfigContext = createContext<BusinessConfigValue | null>(null)

export function BusinessConfigProvider({ children }: { children: ReactNode }) {
  const db = useDb()
  const [name, setName] = useState('PDV')
  const [template, setTemplate] = useState<BusinessTemplate>(defaultTemplate)

  const reload = useCallback(async () => {
    const rows = await db.query<BusinessConfig>('SELECT * FROM business_config WHERE id = ?', ['default'])
    if (rows[0]) {
      setName(rows[0].name)
      setTemplate(templates[rows[0].business_type] ?? defaultTemplate)
    }
  }, [db])

  useEffect(() => {
    reload()
  }, [reload])

  return <BusinessConfigContext.Provider value={{ name, template, reload }}>{children}</BusinessConfigContext.Provider>
}

export function useBusinessConfig(): BusinessConfigValue {
  const ctx = useContext(BusinessConfigContext)
  if (!ctx) throw new Error('useBusinessConfig() precisa estar dentro de <BusinessConfigProvider>')
  return ctx
}
