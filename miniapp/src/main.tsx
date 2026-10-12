import React from 'react'
import ReactDOM from 'react-dom/client'
import { init } from '@telegram-apps/sdk'
import App from './App.tsx'
import './index.css'

// The SDK can parse init data without initialization, but bridge methods such
// as openInvoice require init() so the Telegram version and native events are
// registered before React checks method availability.
try {
  init()
} catch (error) {
  // The existing TelegramRequired screen handles non-Mini-App environments.
  console.warn('Telegram Mini Apps SDK initialization failed', error)
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
