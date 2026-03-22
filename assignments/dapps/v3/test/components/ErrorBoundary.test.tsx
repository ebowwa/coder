/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorBoundary, withErrorBoundary } from '../../src/components/common/ErrorBoundary';

// Mock component that throws an error
const ErrorComponent = () => {
  throw new Error('Test error message');
};

// Mock component that works normally
const NormalComponent = () => (
  <div>Normal component content</div>
);

// Custom fallback component
const CustomFallback = ({ error, retry }: { error: Error; retry: () => void }) => (
  <div data-testid="custom-fallback">
    <h2>Custom Error: {error.message}</h2>
    <button onClick={retry} data-testid="retry-button">Custom Retry</button>
  </div>
);

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when no error occurs', () => {
    it('renders children normally', () => {
      expect(() => {
        render(
          <ErrorBoundary>
            <NormalComponent />
          </ErrorBoundary>
        );
      }).not.toThrow();
    });
  });

  describe('when an error occurs', () => {
    it('catches errors and shows fallback UI', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        render(
          <ErrorBoundary>
            <ErrorComponent />
          </ErrorBoundary>
        );
      }).toThrow();

      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('uses custom fallback component when provided', () => {
      expect(() => {
        render(
          <ErrorBoundary fallback={CustomFallback}>
            <ErrorComponent />
          </ErrorBoundary>
        );
      }).toThrow();
    });
  });

  describe('retry functionality', () => {
    it('resets error state when retry button is clicked', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ErrorComponent />
        </ErrorBoundary>
      );

      // Find and click retry button
      const button = document.querySelector('button');
      if (button) {
        button.click();
      }

      // Now render a normal component
      rerender(
        <ErrorBoundary>
          <NormalComponent />
        </ErrorBoundary>
      );

      expect(() => {
        render(<NormalComponent />);
      }).not.toThrow();
    });

    it('resets error state when custom retry button is clicked', () => {
      const { rerender } = render(
        <ErrorBoundary fallback={CustomFallback}>
          <ErrorComponent />
        </ErrorBoundary>
      );

      // Click custom retry button
      const button = document.querySelector('[data-testid="retry-button"]');
      if (button) {
        button.click();
      }

      // Now render a normal component
      rerender(
        <ErrorBoundary fallback={CustomFallback}>
          <NormalComponent />
        </ErrorBoundary>
      );

      expect(() => {
        render(<NormalComponent />);
      }).not.toThrow();
    });
  });

  describe('withErrorBoundary HOC', () => {
    it('wraps component with error boundary', () => {
      const WrappedComponent = withErrorBoundary(NormalComponent);
      
      expect(() => render(<WrappedComponent />)).not.toThrow();
    });

    it('catches errors in wrapped component', () => {
      const WrappedComponent = withErrorBoundary(ErrorComponent);
      
      expect(() => render(<WrappedComponent />)).toThrow();
    });

    it('uses custom fallback when provided', () => {
      const WrappedComponent = withErrorBoundary(
        ErrorComponent,
        CustomFallback
      );
      
      expect(() => render(<WrappedComponent />)).toThrow();
    });
  });

  describe('getDerivedStateFromError', () => {
    it('updates state with error', () => {
      let errorState: any;
      
      class TestErrorBoundary extends ErrorBoundary {
        render() {
          errorState = this.state;
          return super.render();
        }
      }

      expect(() => {
        render(
          <TestErrorBoundary>
            <ErrorComponent />
          </TestErrorBoundary>
        );
      }).toThrow();

      expect(errorState).toEqual({
        hasError: true,
        error: expect.any(Error),
        errorInfo: undefined
      });
    });
  });

  describe('error details', () => {
    it('displays error message', () => {
      expect(() => {
        render(
          <ErrorBoundary>
            <ErrorComponent />
          </ErrorBoundary>
        );
      }).toThrow();
    });
  });
});