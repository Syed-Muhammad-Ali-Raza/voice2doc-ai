import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { SessionBootstrap } from './components/SessionBootstrap'
import './index.css'
import { useSettingsStore } from './store/auth'

function ThemeBoot() {
  const hydrateTheme = useSettingsStore((s) => s.hydrateTheme)
  useEffect(() => {
    hydrateTheme()
  }, [hydrateTheme])
  return (
    <SessionBootstrap>
      <App />
    </SessionBootstrap>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeBoot />
    </ErrorBoundary>
  </StrictMode>,
)
