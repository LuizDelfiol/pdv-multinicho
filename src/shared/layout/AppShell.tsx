import { NavLink, Outlet } from 'react-router-dom'
import { hasAccess } from '../../auth/roles'
import { useStaff } from '../../auth/StaffProvider'
import { useBusinessConfig } from '../BusinessConfigProvider'

const ROLE_LABEL = { operador: 'Operador', gerente: 'Gerente', administrador: 'Administrador' } as const

export function AppShell() {
  const { template } = useBusinessConfig()
  const { current, logout } = useStaff()

  const visibleNav = template.nav.filter((link) => current && hasAccess(current.role, link.minRole))

  return (
    <div className="flex h-screen flex-col">
      <nav className="no-print flex items-center justify-between gap-1 border-b border-neutral-200 bg-white px-4 py-2">
        <div className="flex gap-1">
          {visibleNav.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `rounded px-3 py-1.5 text-sm font-medium ${
                  isActive ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>
        {current && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-neutral-600">
              {current.name} ({ROLE_LABEL[current.role]})
            </span>
            <button onClick={logout} className="rounded px-2 py-1 text-neutral-500 hover:bg-neutral-100">
              Trocar operador
            </button>
          </div>
        )}
      </nav>
      <main className="flex-1 overflow-auto bg-neutral-50">
        <Outlet />
      </main>
    </div>
  )
}
