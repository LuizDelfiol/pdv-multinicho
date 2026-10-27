import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.tsx'
import { DbProvider } from './db/DbProvider.tsx'
import { BusinessConfigProvider } from './shared/BusinessConfigProvider.tsx'
import { SyncProvider } from './sync/SyncProvider.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <DbProvider>
        <BusinessConfigProvider>
          <SyncProvider>
            <App />
          </SyncProvider>
        </BusinessConfigProvider>
      </DbProvider>
    </HashRouter>
  </StrictMode>,
)
