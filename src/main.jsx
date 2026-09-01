import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

requestAnimationFrame(() => {
  const preloader = document.getElementById('pre-react-loader')
  if (!preloader) return

  preloader.style.opacity = '0'
  preloader.style.transition = 'opacity 180ms ease-out'

  window.setTimeout(() => {
    preloader.remove()
  }, 200)
})
