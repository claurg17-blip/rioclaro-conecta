// Punto de entrada del frontend: aquí React "monta" la app dentro de <div id="root"> (index.html)
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { AuthProvider } from './auth/AuthContext.jsx'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* BrowserRouter: permite tener varias páginas (/login, /cambiar-password, ...) */}
    <BrowserRouter>
      {/* AuthProvider va dentro del router porque logout() usa la navegación */}
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
