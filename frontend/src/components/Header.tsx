import { Link } from 'react-router'
import './Header.css'

export function Header() {
  return (
    <header className="app-header">
      <Link to="/" className="app-header__brand">
        Formout
      </Link>
      <Link to="/admin" className="app-header__admin-link">
        Admin
      </Link>
    </header>
  )
}
