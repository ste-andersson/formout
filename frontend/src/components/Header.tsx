import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react'
import { Link, useLocation } from 'react-router'
import { AppearancePicker } from './AppearancePicker'
import './Header.css'

export function Header() {
  const location = useLocation()
  const isAdminSection = location.pathname.startsWith('/admin')

  return (
    <header className="app-header">
      <div className="app-header__start">
        <Link to="/" className="app-header__brand">
          <span className="app-header__logo-stack">
            <img src="/logo-wide-no-o.webp" alt="Formout" className="app-header__logo" />
            <span className="app-header__logo-o" aria-hidden="true" />
          </span>
        </Link>
        <nav className="app-header__tabs" aria-label="Huvudnavigering">
          <Link to="/" className="app-header__tab" data-active={!isAdminSection || undefined}>
            Fyll i
          </Link>
          <SignedOut>
            <SignInButton mode="modal">
              <button type="button" className="app-header__tab">
                Skapa
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Link to="/admin" className="app-header__tab" data-active={isAdminSection || undefined}>
              Skapa
            </Link>
          </SignedIn>
        </nav>
      </div>
      <div className="app-header__actions">
        <AppearancePicker />
        <SignedIn>
          <UserButton />
        </SignedIn>
      </div>
    </header>
  )
}
