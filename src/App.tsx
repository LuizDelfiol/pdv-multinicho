import { Route, Routes } from 'react-router-dom'
import { LoginGate } from './auth/LoginGate'
import { RequireRole } from './auth/RequireRole'
import { CaixaPage } from './features/caixa/CaixaPage'
import { CatalogoPage } from './features/catalogo/CatalogoPage'
import { ConfigPage } from './features/config/ConfigPage'
import { FechamentoPage } from './features/fechamento/FechamentoPage'
import { ComandaPage } from './features/mesas/ComandaPage'
import { MesasPage } from './features/mesas/MesasPage'
import { TrocaPage } from './features/vendas/TrocaPage'
import { VendasPage } from './features/vendas/VendasPage'
import { useBusinessConfig } from './shared/BusinessConfigProvider'
import { AppShell } from './shared/layout/AppShell'

function App() {
  const { template } = useBusinessConfig()
  const isMesaComanda = template.flow === 'mesa-comanda'

  return (
    <LoginGate>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={isMesaComanda ? <MesasPage /> : <CaixaPage />} />
          {isMesaComanda && <Route path="/comanda/:orderId" element={<ComandaPage />} />}
          <Route
            path="/catalogo"
            element={
              <RequireRole min="gerente">
                <CatalogoPage />
              </RequireRole>
            }
          />
          <Route
            path="/vendas"
            element={
              <RequireRole min="gerente">
                <VendasPage />
              </RequireRole>
            }
          />
          <Route
            path="/troca/:orderId"
            element={
              <RequireRole min="gerente">
                <TrocaPage />
              </RequireRole>
            }
          />
          <Route
            path="/fechamento"
            element={
              <RequireRole min="gerente">
                <FechamentoPage />
              </RequireRole>
            }
          />
          <Route
            path="/config"
            element={
              <RequireRole min="administrador">
                <ConfigPage />
              </RequireRole>
            }
          />
        </Route>
      </Routes>
    </LoginGate>
  )
}

export default App
