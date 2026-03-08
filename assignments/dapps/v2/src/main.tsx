import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from './wagmi.ts';
import { Web3Provider } from './providers/Web3Provider.tsx';

// Create QueryClient for wagmi
const queryClient = new QueryClient();

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);

root.render(
  <WagmiProvider config={config}>
    <QueryClientProvider client={queryClient}>
      <Web3Provider>
        <ErrorBoundary
          fallback={({ error, retry }) => (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '100vh',
              padding: '2rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💥</div>
              <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
                Something went wrong
              </h1>
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem', maxWidth: '500px' }}>
                {error.message}
              </p>
              <button
                onClick={retry}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'var(--color-accent)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              >
                Try Again
              </button>
            </div>
          )}
        >
          <App />
        </ErrorBoundary>
      </Web3Provider>
    </QueryClientProvider>
  </WagmiProvider>
);
