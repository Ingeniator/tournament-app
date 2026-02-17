// Telegram's in-app browser lacks Web Share API and blocks downloads.
// Redirect to the system browser where everything works normally.
if (/Telegram/i.test(navigator.userAgent) && !window.Telegram?.WebApp) {
  window.open(window.location.href, '_blank');
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
