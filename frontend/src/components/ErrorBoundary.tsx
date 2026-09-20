import type { ContextType, ErrorInfo, ReactNode } from 'react'
import { Component } from 'react'
import { LanguageContext } from './languageContext'
import { dictionaries } from '../lib/i18n'
import './ErrorBoundary.css'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Class components can't call hooks, so useTranslation() isn't available
  // here -- static contextType is the class-component equivalent for
  // consuming a Context. Falls back to the Swedish dictionary directly if
  // rendered outside a LanguageProvider (shouldn't happen in practice, since
  // main.tsx wraps this with one, but this component in particular must
  // never crash while already showing a crash screen).
  static contextType = LanguageContext
  declare context: ContextType<typeof LanguageContext>

  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled error', error, errorInfo)
  }

  render() {
    if (this.state.error) {
      const t = this.context?.t ?? dictionaries.sv
      return (
        <div className="error-boundary">
          <h1>{t.errorBoundary.title}</h1>
          <p>{t.errorBoundary.message}</p>
          <pre className="error-boundary__details">{this.state.error.message}</pre>
          <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>
            {t.errorBoundary.reload}
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
