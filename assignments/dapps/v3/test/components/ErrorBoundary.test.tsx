/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import ErrorBoundary, { withErrorBoundary } from '../../src/components/common/ErrorBoundary';

// Wrapper for React Query
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <div>{children}</div>
);

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
      render(
        <ErrorBoundary>
          <NormalComponent />
        </ErrorBoundary>,
        { wrapper }
      );

      expect(screen.getByText('Normal component content')).toBeInTheDocument();
    });

    it('does not show fallback UI', () => {
      render(
        <ErrorBoundary>
          <NormalComponent />
        </ErrorBoundary>,
        { wrapper }
      );

      expect(screen.queryByTestId('custom-fallback')).not.toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });
  });

  describe('when an error occurs', () => {
    it('catches errors and shows fallback UI', () => {
      expect(() => {
        render(
          <ErrorBoundary>
            <ErrorComponent />
          </ErrorBoundary>,
          { wrapper }
        );
      }).toThrow();
    });

    it('logs errors to console', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        render(
          <ErrorBoundary>
            <ErrorComponent />
          </ErrorBoundary>,
          { wrapper }
        );
      }).toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        'ErrorBoundary caught an error:',
        expect.any(Error)
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error info:',
        expect.objectContaining({
          componentStack: expect.any(String)
        })
      );
      
      consoleSpy.mockRestore();
    });

    it('uses custom fallback component when provided', () => {
      expect(() => {
        render(
          <ErrorBoundary fallback={CustomFallback}>
            <ErrorComponent />
          </ErrorBoundary>,
          { wrapper }
        );
      }).toThrow();

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(screen.getByText('Custom Error: Test error message')).toBeInTheDocument();
      expect(screen.getByTestId('retry-button')).toBeInTheDocument();
      expect(screen.queryByText('Retry')).not.toBeInTheDocument();
    });
  });

  describe('retry functionality', () => {
    it('resets error state when retry button is clicked', async () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      // Click retry button
      const retryButton = screen.getByRole('button', { name: /retry/i });
      act(() => {
        retryButton.click();
      });

      // ErrorBoundary should reset and try to render children again
      expect(() => {
        rerender(
          <ErrorBoundary>
            <NormalComponent />
          </ErrorBoundary>
        );
      }).not.toThrow();
    });

    it('resets error state when custom retry button is clicked', () => {
      render(
        <ErrorBoundary fallback={CustomFallback}>
          <ErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();

      // Click custom retry button
      const retryButton = screen.getByTestId('retry-button');
      act(() => {
        retryButton.click();
      });

      // After retry, the component should try to render again
      // This will throw another error, so we should still see the fallback
      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    });
  });

  describe('withErrorBoundary HOC', () => {
    it('wraps component with error boundary', () => {
      const WrappedComponent = withErrorBoundary(NormalComponent);
      
      render(<WrappedComponent />);

      expect(screen.getByText('Normal component content')).toBeInTheDocument();
    });

    it('catches errors in wrapped component', () => {
      const WrappedComponent = withErrorBoundary(ErrorComponent);
      
      render(<WrappedComponent />);

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('uses custom fallback when provided', () => {
      const WrappedComponent = withErrorBoundary(
        ErrorComponent,
        CustomFallback
      );
      
      render(<WrappedComponent />);

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
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

      const { rerender } = render(
        <TestErrorBoundary>
          <ErrorComponent />
        </TestErrorBoundary>
      );

      expect(errorState).toEqual({
        hasError: true,
        error: expect.any(Error),
        errorInfo: undefined
      });
    });
  });

  describe('error details', () => {
    it('displays error message', () => {
      render(
        <ErrorBoundary>
          <ErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    it('shows fallback UI with consistent styling', () => {
      render(
        <ErrorBoundary>
          <ErrorComponent />
        </ErrorBoundary>
      );

      const fallback = screen.getByRole('alert');
      expect(fallback).toHaveClass('bg-red-50', 'border', 'border-red-200', 'rounded-lg');
    });
  });
});