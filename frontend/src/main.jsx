import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './store/store.js'
import { loginSuccess } from './store/slices/authSlice'
import './index.css'
import App from './App.jsx'
import OmnidimensionWidget from './components/OmnidimensionWidget.jsx'

try {
  const t = localStorage.getItem('medscan_token')
  const raw = localStorage.getItem('medscan_user')
  if (t && raw) store.dispatch(loginSuccess(JSON.parse(raw)))
} catch {
  /* ignore */
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <OmnidimensionWidget />
      <App />
    </Provider>
  </StrictMode>,
)
