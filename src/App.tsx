import { Route, Routes } from 'react-router-dom'
import { CaixaPage } from './features/caixa/CaixaPage'
import { CatalogoPage } from './features/catalogo/CatalogoPage'
import { ConfigPage } from './features/config/ConfigPage'
import { FechamentoPage } from './features/fechamento/FechamentoPage'
import { ComandaPage } from './features/mesas/ComandaPage'
import { MesasPage } from './features/mesas/MesasPage'
import { VendasPage } from './features/vendas/VendasPage'
import { useBusinessConfig } from './shared/BusinessConfigProvider'
import { AppShell } from './shared/layout/AppShell'

function App() {
  const { template } = useBusinessConfig()
  const isMesaComanda = template.flow === 'mesa-comanda'

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={isMesaComanda ? <MesasPage /> : <CaixaPage />} />
        {isMesaComanda && <Route path="/comanda/:orderId" element={<ComandaPage />} />}
        <Route path="/catalogo" element={<CatalogoPage />} />
        <Route path="/vendas" element={<VendasPage />} />
        <Route path="/fechamento" element={<FechamentoPage />} />
        <Route path="/config" element={<ConfigPage />} />
      </Route>
    </Routes>
  )
}

export default App
