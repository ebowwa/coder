import '@testing-library/jest-dom';
import { vi } from 'vitest';

vi.mock('wagmi', () => ({ useAccount: () => ({ address: undefined, isConnected: false }), useBalance: () => ({}), useConnect: () => ({}), useDisconnect: () => ({}), useReadContracts: () => ({}) }));
