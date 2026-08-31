import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { startViewportHeightSync } from './services/viewportHeight'
import { I18nProvider } from './i18n/I18nProvider.jsx'

startViewportHeightSync()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
)
