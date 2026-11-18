import { useEffect, useState } from 'react'
import EncryptPage from './pages/EncryptPage.jsx'
import DecryptPage from './pages/DecryptPage.jsx'
import LookupPage from './pages/LookupPage.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'
import './App.css'

const PAGES = {
  '#/encrypt': { label: 'Encrypt', Component: EncryptPage },
  '#/decrypt': { label: 'Decrypt', Component: DecryptPage },
  '#/lookup': { label: 'Look up', Component: LookupPage },
}
const DEFAULT_ROUTE = '#/encrypt'

function useHashRoute() {
  const read = () => (PAGES[window.location.hash] ? window.location.hash : DEFAULT_ROUTE)
  const [route, setRoute] = useState(read)
  useEffect(() => {
    const onChange = () => setRoute(read())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

export default function App() {
  const route = useHashRoute()
  const { Component } = PAGES[route]

  return (
    <div className="app">
      <header>
        <h1>Secure Messaging</h1>
        <nav>
          {Object.entries(PAGES).map(([hash, { label }]) => (
            <a key={hash} href={hash} className={hash === route ? 'active' : undefined}>
              {label}
            </a>
          ))}
        </nav>
      </header>
      <main>
        {/* keyed by route so switching pages also clears a crashed state */}
        <ErrorBoundary key={route}>
          <Component />
        </ErrorBoundary>
      </main>
    </div>
  )
}
