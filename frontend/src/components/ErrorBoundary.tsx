import type { ErrorInfo, ReactNode } from 'react'
import { Component } from 'react'
import './ErrorBoundary.css'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled error', error, errorInfo)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="error-boundary">
          <h1>Något gick fel</h1>
          <p>Sidan kraschade oväntat. Ladda om för att försöka igen.</p>
          <pre className="error-boundary__details">{this.state.error.message}</pre>
          <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>
            Ladda om
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
