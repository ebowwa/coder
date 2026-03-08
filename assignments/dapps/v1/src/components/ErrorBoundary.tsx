/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the component tree
 */

import { type FC, type ReactNode, Component, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: FC<{ error: Error; retry: () => void }>;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // TODO: Send to error reporting service
    // logErrorToService(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback ?? DefaultErrorFallback;
      return (
        <FallbackComponent
          error={this.state.error ?? new Error('Unknown error')}
          retry={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

const DefaultErrorFallback: FC<{ error: Error; retry: () => void }> = ({
  error,
  retry,
}) => (
  <div className="error-boundary">
    <div className="error-boundary-content">
      <div className="error-icon">⚠️</div>
      <h2 className="error-title">Something went wrong</h2>
      <p className="error-message">{error.message}</p>
      {import.meta.env.DEV && (
        <details className="error-details">
          <summary>Error details</summary>
          <pre>{error.stack}</pre>
        </details>
      )}
      <div className="error-actions">
        <button onClick={retry} className="btn btn-primary">
          Try Again
        </button>
        <button onClick={() => window.location.reload()} className="btn btn-secondary">
          Reload Page
        </button>
      </div>
    </div>
  </div>
);
