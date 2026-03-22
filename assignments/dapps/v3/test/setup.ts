import '@testing-library/jest-dom/vitest';
import { vi, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

vi.mock('wagmi', () => ({
  useAccount: vi.fn(() => ({ address: undefined, isConnected: false })),
  useBalance: vi.fn(() => ({ data: undefined })),
  useConnect: vi.fn(() => ({ connect: vi.fn(), connectors: [] })),
  useDisconnect: vi.fn(() => ({ disconnect: vi.fn() })),
  useReadContracts: vi.fn(() => ({ data: [] })),
  WagmiProvider: ({ children }: any) => children,
  createConfig: vi.fn(() => ({})),
  http: vi.fn(),
}));

vi.mock('viem', () => ({ formatEther: vi.fn((v) => String(v / 10n**18n)), erc20Abi: [] }));
vi.mock('viem/chains', () => ({ mainnet: { id: 1, name: 'Ethereum' } }));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: undefined, isLoading: false })),
  useMutation: vi.fn(() => ({ mutate: vi.fn() })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
  QueryClient: vi.fn(() => ({})),
  QueryClientProvider: ({ children }: any) => children,
}));

vi.mock('lightweight-charts', () => ({ createChart: vi.fn() }));
