import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import App from './App'
import './styles/global.css'

const root = document.getElementById('root')!

// Apply theme before paint to prevent flash
const stored = localStorage.getItem('theme')
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
const theme = stored === 'light' || stored === 'dark' ? stored : prefersDark ? 'dark' : 'light'
document.documentElement.setAttribute('data-theme', theme)

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
