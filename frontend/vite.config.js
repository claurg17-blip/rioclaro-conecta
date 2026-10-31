// Configuración de Vite (la herramienta que compila y sirve el frontend)
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), // Soporte para React (JSX, recarga rápida)
    tailwindcss(), // Tailwind CSS 4: genera las clases que usamos en los componentes
  ],
})
