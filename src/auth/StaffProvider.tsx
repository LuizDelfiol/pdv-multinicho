import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useDb } from '../db/DbProvider'
import type { Staff, StaffRole } from '../db/schema'
import { getDeviceId } from '../shared/deviceId'
import { hashPin } from './roles'

const CURRENT_STAFF_KEY = 'pdv_current_staff_id'

interface StaffContextValue {
  current: Staff | null
  allStaff: Staff[]
  loading: boolean
  login: (pin: string) => Promise<boolean>
  logout: () => void
  createStaff: (name: string, role: StaffRole, pin: string) => Promise<void>
  removeStaff: (id: string) => Promise<void>
  setStaffPin: (id: string, pin: string) => Promise<void>
}

const StaffContext = createContext<StaffContextValue | null>(null)

export function StaffProvider({ children }: { children: ReactNode }) {
  const db = useDb()
  const [allStaff, setAllStaff] = useState<Staff[]>([])
  const [current, setCurrent] = useState<Staff | null>(null)
  const [loading, setLoading] = useState(true)

  const reloadStaff = useCallback(async () => {
    const rows = await db.query<Staff>('SELECT * FROM staff WHERE deleted = 0')
    setAllStaff(rows)
    return rows
  }, [db])

  useEffect(() => {
    reloadStaff().then((rows) => {
      const savedId = sessionStorage.getItem(CURRENT_STAFF_KEY)
      const found = savedId ? rows.find((s) => s.id === savedId) : undefined
      if (found) setCurrent(found)
      setLoading(false)
    })
  }, [reloadStaff])

  async function login(pin: string): Promise<boolean> {
    const hash = await hashPin(pin)
    // consulta o banco direto (não o `allStaff` do estado) pra não pegar um valor
    // desatualizado logo após createStaff() num mesmo gesto do usuário (closure antigo)
    const rows = await db.query<Staff>('SELECT * FROM staff WHERE deleted = 0 AND pin_hash = ?', [hash])
    const found = rows[0]
    if (!found) return false
    setCurrent(found)
    sessionStorage.setItem(CURRENT_STAFF_KEY, found.id)
    setAllStaff((prev) => (prev.some((s) => s.id === found.id) ? prev : [...prev, found]))
    return true
  }

  function logout() {
    setCurrent(null)
    sessionStorage.removeItem(CURRENT_STAFF_KEY)
  }

  async function createStaff(name: string, role: StaffRole, pin: string) {
    const hash = await hashPin(pin)
    const now = new Date().toISOString()
    await db.exec(
      'INSERT INTO staff (id, name, role, pin_hash, updated_at, device_id, deleted) VALUES (?, ?, ?, ?, ?, ?, 0)',
      [uuidv4(), name, role, hash, now, getDeviceId()],
    )
    await reloadStaff()
  }

  async function setStaffPin(id: string, pin: string) {
    const hash = await hashPin(pin)
    const now = new Date().toISOString()
    await db.exec('UPDATE staff SET pin_hash = ?, updated_at = ?, device_id = ? WHERE id = ?', [hash, now, getDeviceId(), id])
    await reloadStaff()
  }

  async function removeStaff(id: string) {
    const now = new Date().toISOString()
    await db.exec('UPDATE staff SET deleted = 1, updated_at = ? WHERE id = ?', [now, id])
    await reloadStaff()
    if (current?.id === id) logout()
  }

  return (
    <StaffContext.Provider value={{ current, allStaff, loading, login, logout, createStaff, removeStaff, setStaffPin }}>
      {children}
    </StaffContext.Provider>
  )
}

export function useStaff(): StaffContextValue {
  const ctx = useContext(StaffContext)
  if (!ctx) throw new Error('useStaff() precisa estar dentro de <StaffProvider>')
  return ctx
}
