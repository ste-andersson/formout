import { SignedIn, UserButton } from '@clerk/clerk-react'
import { Link, useLocation } from 'react-router'
import { SettingsMenu } from './SettingsMenu'
import { useTranslation } from './languageContext'
import './Header.css'

export function Header() {
  const location = useLocation()
  const isAdminSection = location.pathname.startsWith('/admin')
  const { t } = useTranslation()

  return (
    <header className="app-header">
      <div className="app-header__start">
        <Link to="/" className="app-header__brand">
          <span className="app-header__logo-stack">
            <img src="/logo-wide-no-o.webp" alt="Formout" className="app-header__logo" />
            <span className="app-header__logo-o" aria-hidden="true" />
          </span>
        </Link>
        <nav className="app-header__tabs" aria-label={t.header.mainNav}>
          <Link to="/" className="app-header__tab" data-active={!isAdminSection || undefined}>
            {t.header.fillIn}
          </Link>
          <Link to="/admin" className="app-header__tab" data-active={isAdminSection || undefined}>
            {t.header.create}
          </Link>
        </nav>
      </div>
      <div className="app-header__actions">
        <SettingsMenu />
        <SignedIn>
          <UserButton />
        </SignedIn>
      </div>
    </header>
  )
}
