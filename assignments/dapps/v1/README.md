# Crypto DApp

Web3 React components and hooks for blockchain interaction.

## Features

- **Wallet Connection**: MetaMask, WalletConnect, and other injected providers
- **Network Switching**: Multi-chain support (Ethereum, Polygon, Optimism, etc.)
- **Transaction Status**: Real-time transaction tracking
- **React Hooks**: Custom hooks for common Web3 patterns
- **TypeScript**: Full type safety
- **React 19**: Latest React features

## Installation

```bash
bun add @ebowwa/crypto-dapp
```

## Quick Start

```tsx
import { App } from '@ebowwa/crypto-dapp';
import '@ebowwa/crypto-dapp/src/App.css';

function MyApp() {
  return <App />;
}
```

## Components

### WalletButton

Connect/disconnect wallet with address display and block explorer links.

```tsx
import { WalletButton } from '@ebowwa/crypto-dapp/components';

<WalletButton />
```

### NetworkSwitcher

Switch between supported networks.

```tsx
import { NetworkSwitcher } from '@ebowwa/crypto-dapp/components';

<NetworkSwitcher
  networkChainId={1}
  onNetworkChange={(chainId) => console.log(chainId)}
/>
```

### TransactionStatus

Display pending transactions with hash and status.

```tsx
import { TransactionStatus } from '@ebowwa/crypto-dapp/components';

<TransactionStatus chainId={1} />
```

## Hooks

### useConnect

Connect wallet and manage connection state.

```tsx
import { useConnect } from '@ebowwa/crypto-dapp/hooks';

const { connect, disconnect, connector, isConnected } = useConnect();
```

### useAccount

Get account address and ENS name.

```tsx
import { useAccount } from '@ebowwa/crypto-dapp/hooks';

const { address, ensName } = useAccount();
```

### useContract

Interact with smart contracts.

```tsx
import { useContract } from '@ebowwa/crypto-dapp/hooks';

const contract = useContract({
  address: '0x...',
  abi: MyContractABI,
});
```

### useNFT

Read NFT metadata and balance.

```tsx
import { useNFT } from '@ebowwa/crypto-dapp/hooks';

const { balance, uri } = useNFT({
  address: '0x...',
  tokenId: 1,
});
```

### useToken

Read ERC20 token data.

```tsx
import { useToken } from '@ebowwa/crypto-dapp/hooks';

const { balance, symbol, decimals } = useToken({
  address: '0x...',
});
```

### useSimpleStorage

Simple key-value storage for the DApp.

```tsx
import { useSimpleStorage } from '@ebowwa/crypto-dapp/hooks';

const [value, setValue] = useSimpleStorage('key', 'default');
```

### useTheme

Dark/light theme toggle with localStorage persistence.

```tsx
import { useTheme } from '@ebowwa/crypto-dapp/hooks';

const [theme, toggleTheme] = useTheme();
```

### useLocalStorage

Generic localStorage hook.

```tsx
import { useLocalStorage } from '@ebowwa/crypto-dapp/hooks';

const [value, setValue] = useLocalStorage('key', defaultValue);
```

### useMediaQuery

Responsive design breakpoint detection.

```tsx
import { useMediaQuery } from '@ebowwa/crypto-dapp/hooks';

const isMobile = useMediaQuery('(max-width: 640px)');
```

### useDebounce

Debounce values for search inputs, etc.

```tsx
import { useDebounce } from '@ebowwa/crypto-dapp/hooks';

const debouncedValue = useDebounce(value, 300);
```

### useClickOutside

Detect clicks outside an element.

```tsx
import { useClickOutside } from '@ebowwa/crypto-dapp/hooks';

const ref = useRef();
useClickOutside(ref, () => console.log('clicked outside'));
```

### useKeyboardShortcut

Register keyboard shortcuts.

```tsx
import { useKeyboardShortcut } from '@ebowwa/crypto-dapp/hooks';

useKeyboardShortcut('Ctrl+K', () => console.log('shortcut triggered'));
```

## Supported Networks

- Ethereum Mainnet
- Polygon
- Optimism
- Arbitrum
- Base
- Sepolia (testnet)

## Development

```bash
# Dev server
bun run dev

# Build
bun run build

# Type check
bun run typecheck

# Tests
bun run test
```

## Architecture

```
src/
├── components/       # React components
│   ├── WalletButton.tsx
│   ├── NetworkSwitcher.tsx
│   └── TransactionStatus.tsx
├── hooks/           # Custom React hooks
│   ├── useConnect.ts
│   ├── useAccount.ts
│   ├── useContract.ts
│   └── ...
├── config/          # Chain and contract configs
├── providers/       # React context providers
├── utils/           # Utility functions
├── types/           # TypeScript types
└── web3/            # Web3 utilities
```

## License

MIT
