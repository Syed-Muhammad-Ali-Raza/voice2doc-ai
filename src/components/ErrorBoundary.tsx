import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  message: string
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || 'Something went wrong' }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Voice2Doc]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
          <h1 className="font-display text-2xl font-semibold text-ink dark:text-dark-ink">Something went wrong</h1>
          <p className="max-w-md text-sm text-muted">{this.state.message}</p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              this.setState({ hasError: false, message: '' })
              window.location.assign('/')
            }}
          >
            Back to home
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
