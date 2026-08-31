import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react'
import { Link } from 'react-router'
import './Header.css'

export function Header() {
  return (
    <header className="app-header">
      <Link to="/" className="app-header__brand">
        Formout
      </Link>
      <div className="app-header__actions">
        <SignedOut>
          <SignInButton mode="modal">
            <button type="button" className="app-header__admin-link">
              Admin
            </button>
          </SignInButton>
        </SignedOut>
        <SignedIn>
          <Link to="/admin" className="app-header__admin-link">
            Admin
          </Link>
          <UserButton />
        </SignedIn>
      </div>
    </header>
  )
}
