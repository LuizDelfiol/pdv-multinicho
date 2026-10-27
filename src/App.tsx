import { Route, Routes } from 'react-router-dom'
import { CaixaPage } from './features/caixa/CaixaPage'
import { CatalogoPage } from './features/catalogo/CatalogoPage'
import { ConfigPage } from './features/config/ConfigPage'
import { VendasPage } from './features/vendas/VendasPage'
import { AppShell } from './shared/layout/AppShell'

function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<CaixaPage />} />
        <Route path="/catalogo" element={<CatalogoPage />} />
        <Route path="/vendas" element={<VendasPage />} />
        <Route path="/config" element={<ConfigPage />} />
      </Route>
    </Routes>
  )
}

export default App
