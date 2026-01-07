import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

// Context Providers
import { AuthProvider } from './contexts/AuthContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { PublicSiteProvider } from './contexts/PublicSiteContext'

// Error Boundary
import ErrorBoundary from './components/common/ErrorBoundary'
import { DebugPanel } from './components/system/DebugPanel'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <PublicSiteProvider>
            <AuthProvider>
              <NotificationProvider>
                <App />
                <DebugPanel />
              </NotificationProvider>
            </AuthProvider>
          </PublicSiteProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
