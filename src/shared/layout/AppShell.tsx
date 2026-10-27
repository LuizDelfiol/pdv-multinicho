import { NavLink, Outlet } from 'react-router-dom'
import { useBusinessConfig } from '../BusinessConfigProvider'

export function AppShell() {
  const { template } = useBusinessConfig()

  return (
    <div className="flex h-screen flex-col">
      <nav className="no-print flex gap-1 border-b border-neutral-200 bg-white px-4 py-2">
        {template.nav.map((link) => (
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
      </nav>
      <main className="flex-1 overflow-auto bg-neutral-50">
        <Outlet />
      </main>
    </div>
  )
}
