import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import type { StaffRole } from '../db/schema'
import { hasAccess } from './roles'
import { useStaff } from './StaffProvider'

export function RequireRole({ min, children }: { min: StaffRole; children: ReactNode }) {
  const { current } = useStaff()
  if (!current || !hasAccess(current.role, min)) return <Navigate to="/" replace />
  return <>{children}</>
}
