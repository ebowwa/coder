# Frontend Improvements

## 1. React Component Enhancements

### Current Issues in App.tsx:
- Inline styles everywhere (should use CSS modules or styled-components)
- No error boundaries
- Missing loading states
- No accessibility attributes (ARIA)
- Not responsive enough
- No internationalization support

### Proposed Changes:

```tsx
// App.tsx - Improved version
import { lazy, Suspense, type FC } from 'react';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoadingSpinner } from './components/LoadingSpinner';
import { useTheme } from './hooks/useTheme';
import { useTranslations } from './hooks/useTranslations';

const WalletButton = lazy(() => import('./components/WalletButton'));
const NetworkSwitcher = lazy(() => import('./components/NetworkSwitcher'));

export const App: FC = () => {
  const { theme } = useTheme();
  const { t } = useTranslations();

  return (
    <ErrorBoundary>
      <Layout>
        <section className="hero">
          <h1 className="hero-title" role="heading" aria-level={1}>
            {t('welcome')}
          </h1>
          <p className="hero-subtitle">
            {t('subtitle')}
          </p>
          <div className="hero-actions">
            <a href="#get-started" className="btn btn-primary" role="button">
              {t('getStarted')}
            </a>
            <a href="#learn-more" className="btn btn-secondary" role="button">
              {t('learnMore')}
            </a>
          </div>
        </section>

        <Suspense fallback={<LoadingSpinner />}>
          <section id="features" className="features-section">
            <h2>{t('features')}</h2>
            <FeaturesGrid />
          </section>
        </Suspense>
      </Layout>
    </ErrorBoundary>
  );
};

// Separate component for features
const FeaturesGrid: FC = () => {
  const { t } = useTranslations();
  const features = [
    {
      title: t('walletIntegration'),
      description: t('walletIntegrationDesc'),
      icon: '🔒',
    },
    // ...
  ];

  return (
    <div className="features-grid">
      {features.map((feature) => (
        <article
          key={feature.title}
          className="feature-card"
          role="article"
        >
          <div className="feature-icon" aria-hidden="true">
            {feature.icon}
          </div>
          <h3>{feature.title}</h3>
          <p>{feature.description}</p>
        </article>
      ))}
    </div>
  );
};
```

## 2. Web3Provider Improvements

### Current Issues:
- No reconnection strategy for network issues
- Missing transaction queue management
- No localStorage sync across tabs
- Lack of multicall support (gas savings)
- No request deduplication
- Missing optimistic updates

### Proposed Changes:

```tsx
// Enhanced Web3Provider with better state management
import { useCallback, useEffect, useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function Web3Provider({ children, autoConnect = true }: Web3ProviderProps) {
  const queryClient = useQueryClient();
  const reconnectAttempts = useRef(0);
  const [reconnectDelay, setReconnectDelay] = useState(1000);

  // Use React Query for caching
  const { data: balance, refetch: refetchBalance } = useQuery({
    queryKey: ['balance', account.address],
    queryFn: async () => {
      if (!account.address || !provider) return null;
      const balanceWei = await provider.getBalance(account.address);
      return formatUnits(balanceWei, 18);
    },
    enabled: !!account.address && !!provider,
    staleTime: 30_000, // 30 seconds
    refetchInterval: 15_000, // Poll every 15s
  });

  // Add reconnection strategy with exponential backoff
  const connectWithRetry = useCallback(async () => {
    try {
      await connect();
      reconnectAttempts.current = 0;
      setReconnectDelay(1000);
    } catch (error) {
      reconnectAttempts.current += 1;
      const delay = Math.min(1000 * 2 ** reconnectAttempts.current, 30000);
      setReconnectDelay(delay);
      setTimeout(() => connectWithRetry(), delay);
    }
  }, [connect]);

  // Add multicall support for batch reads
  const multicall = useCallback(async (
    calls: Array<{ address: string; abi: InterfaceAbi; functionName: string; args?: unknown[] }>
  ) => {
    if (!provider) throw new Error('No provider');

    const contract = new Contract(
      MULTICALL_ADDRESS,
      MULTICALL_ABI,
      provider
    );

    return await contract.aggregate.staticCall(calls);
  }, [provider]);

  // Add optimistic updates
  const updateBalanceOptimistically = useCallback((amount: string) => {
    queryClient.setQueryData(['balance', account.address], (old: string) => {
      return (parseFloat(old) + parseFloat(amount)).toString();
    });
  }, [queryClient, account.address]);

  return (
    <Web3Context.Provider value={{
      ...state,
      balance,
      multicall,
      updateBalanceOptimistically,
    }}>
      {children}
    </Web3Context.Provider>
  );
}
```

## 3. Hook Improvements

### useContract Enhancements:
```tsx
// Add automatic gas estimation
export function useContractWrite(args: UseContractWriteArgs) {
  const { address, abi, functionName } = args;

  const estimateGas = useCallback(async (...callArgs: unknown[]) => {
    if (!isConnected || !signer) throw new Error('Not connected');
    const contract = new Contract(address, abi, signer);
    const fn = contract.getFunction(functionName);
    return await fn.estimateGas(...callArgs);
  }, [address, abi, functionName, isConnected, signer]);

  // Add simulation before execution
  const simulate = useCallback(async (...callArgs: unknown[]) => {
    try {
      await estimateGas(...callArgs);
      return true;
    } catch {
      return false;
    }
  }, [estimateGas]);

  return {
    write,
    writeAsync,
    estimateGas,
    simulate,
    // ... other returns
  };
}
```

### useToken Enhancements:
```tsx
// Add permit (gasless approval) support
export function useToken(options: UseTokenOptions = {}) {
  const [permitSignature, setPermitSignature] = useState<PermitSignature | null>(null);

  const signPermit = useCallback(async (
    spender: string,
    amount: string,
    deadline: number
  ) => {
    if (!signer) throw new Error('No signer');
    if (!decimals) throw new Error('Decimals not loaded');

    const value = parseUnits(amount, decimals);
    const nonce = await contract?.getNonce(address);

    const domain = {
      name: await contract?.name(),
      version: '1',
      chainId,
      verifyingContract: contractAddress,
    };

    const types = {
      Permit: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    };

    const values = { owner: address, spender, value, nonce, deadline };
    const signature = await signer.signTypedData(domain, types, values);
    setPermitSignature({ ...values, signature });
    return signature;
  }, [signer, decimals, chainId, contractAddress, address]);

  return {
    // ... existing returns
    signPermit,
    permitSignature,
  };
}
```

## 4. Performance Optimizations

```tsx
// Add virtualization for large lists
import { useVirtualizer } from '@tanstack/react-virtual';

export function TokenList({ tokens }: { tokens: Token[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: tokens.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 10,
  });

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
        {rowVirtualizer.getVirtualItems().map((virtualRow) => (
          <TokenRow
            key={virtualRow.key}
            token={tokens[virtualRow.index]}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// Add request deduplication
const pendingRequests = new Map<string, Promise<any>>();

export async function deduplicatedRequest<T>(
  key: string,
  fn: () => Promise<T>
): Promise<T> {
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }

  const promise = fn().finally(() => {
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, promise);
  return promise;
}
```

## 5. Error Handling & User Experience

```tsx
// Error Boundary Component
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Send to error tracking service
    this.reportError(error, errorInfo);
  }

  reportError(error: Error, errorInfo: ErrorInfo) {
    // Send to Sentry, Bugsnag, etc.
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }
    return this.children;
  }
}

// Toast Notifications
import { toast } from 'react-hot-toast';

export function useTransactionToast() {
  const showToast = useCallback((
    type: 'pending' | 'success' | 'error',
    message: string
  ) => {
    switch (type) {
      case 'pending':
        toast.loading(message, { id: message });
        break;
      case 'success':
        toast.success(message, { id: message });
        break;
      case 'error':
        toast.error(message, { id: message });
        break;
    }
  }, []);

  return { showToast };
}
```

## 6. Testing Strategy

```tsx
// Component Testing with React Testing Library
import { render, screen, waitFor } from '@testing-library/react';
import { Web3Provider } from './providers/Web3Provider';

describe('WalletButton', () => {
  it('should connect wallet on click', async () => {
    const mockConnect = vi.fn();
    render(
      <Web3Provider>
        <WalletButton onConnect={mockConnect} />
      </Web3Provider>
    );

    const button = screen.getByRole('button', { name: /connect/i });
    button.click();

    await waitFor(() => {
      expect(mockConnect).toHaveBeenCalled();
    });
  });
});

// Hook Testing
import { renderHook, act } from '@testing-library/react';
import { useToken } from './hooks/useToken';

describe('useToken', () => {
  it('should fetch token balance', async () => {
    const { result } = renderHook(() => useToken());

    await act(async () => {
      await result.current.refetchBalance();
    });

    expect(result.current.balance).toBeDefined();
  });
});
```

## 7. Accessibility Improvements

```tsx
// Add focus trap for modals
import { useFocusTrap } from './hooks/useFocusTrap';

export function Modal({ children, onClose }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <h2 id="modal-title">{title}</h2>
      {children}
    </div>
  );
}

// Add screen reader announcements
export function LiveAnnouncement({ message }: { message: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}
```

## 8. Internationalization

```tsx
// i18n setup
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n.use(initReactI18next).init({
  resources: {
    en: {
      translation: {
        welcome: 'Welcome to CryptoDApp',
        connectWallet: 'Connect Wallet',
        // ...
      },
    },
    es: {
      translation: {
        welcome: 'Bienvenido a CryptoDApp',
        connectWallet: 'Conectar Billetera',
        // ...
      },
    },
  },
  lng: 'en',
  fallbackLng: 'en',
});

// Language switcher
export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <select
      value={i18n.language}
      onChange={(e) => i18n.changeLanguage(e.target.value)}
    >
      <option value="en">English</option>
      <option value="es">Español</option>
      <option value="zh">中文</option>
    </select>
  );
}
```

## 9. State Management

```tsx
// Add Zustand for global state
import create from 'zustand';

interface AppState {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  recentTransactions: Transaction[];
  addTransaction: (tx: Transaction) => void;
}

export const useAppStore = create<AppState>((set) => ({
  theme: 'dark',
  setTheme: (theme) => set({ theme }),
  recentTransactions: [],
  addTransaction: (tx) =>
    set((state) => ({
      recentTransactions: [tx, ...state.recentTransactions].slice(0, 10),
    })),
}));
```

## 10. Deployment & CI/CD

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun test
      - run: bun run lint
      - run: bun run type-check

  build:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run build
```

## 11. Monitoring & Analytics

```tsx
// Add performance monitoring
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

export function reportWebVitals() {
  getCLS(console.log);
  getFID(console.log);
  getFCP(console.log);
  getLCP(console.log);
  getTTFB(console.log);
}

// Track Web3 events
export function useWeb3Analytics() {
  const trackTransaction = useCallback((tx: {
    hash: string;
    from: string;
    to: string;
    value: string;
  }) => {
    // Send to analytics service
    window.gtag?.('event', 'transaction', {
      transaction_hash: tx.hash,
      value: tx.value,
    });
  }, []);

  return { trackTransaction };
}
```
