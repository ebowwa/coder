# DApp Platform

A modern, composable DApp platform built with React, TypeScript, Hardhat, and ethers.js.

## Features

- ⚛️ React 18 with TypeScript
- 📦 Hardhat for smart contract development
- 🔌 ethers.js v6 for Web3 integration
- 🎨 Tailwind CSS for styling
- 🧪 Vitest + Testing Library for unit tests
- 📜 Hardhat for contract testing
- 🔥 Hot Module Replacement with Vite

## Quick Start

```bash
# Install dependencies
bun install

# Start local Hardhat node
bun run node

# In a new terminal, deploy contracts
bun run deploy

# Start development server
bun run dev
```

## Commands

### Development
- `bun run dev` - Start Vite dev server
- `bun run build` - Build for production
- `bun run preview` - Preview production build

### Smart Contracts
- `bun run compile` - Compile contracts
- `bun run node` - Start Hardhat local node
- `bun run deploy` - Deploy to local network
- `bun run deploy:testnet` - Deploy to Sepolia testnet

### Testing
- `bun run test` - Run Hardhat contract tests
- `bun run test:watch` - Watch mode for Hardhat tests
- `bun run test:coverage` - Generate coverage report
- `bun run test:unit` - Run Vitest unit tests
- `bun run test:unit:watch` - Vitest watch mode
- `bun run test:unit:coverage` - Vitest coverage
- `bun run test:all` - Run all tests

### Linting
- `bun run lint` - Run ESLint
- `bun run lint:fix` - Fix lint issues

## Project Structure

```
dapp/
├── contracts/           # Solidity contracts
│   └── SimpleStorage.sol
├── scripts/            # Deployment scripts
│   └── deploy.ts
├── test/               # Test files
│   ├── contracts/      # Hardhat contract tests
│   ├── components/     # Vitest component tests
│   ├── hooks/          # Hook tests
│   └── utils.ts        # Test utilities
├── src/
│   ├── components/     # React components
│   ├── hooks/          # Custom hooks
│   ├── providers/      # Context providers
│   ├── utils/          # Utility functions
│   ├── types/          # TypeScript types
│   ├── App.tsx         # Main app component
│   └── main.tsx        # Entry point
├── hardhat.config.ts   # Hardhat configuration
├── vitest.config.ts    # Vitest configuration
└── package.json
```

## Smart Contracts

### SimpleStorage

A simple storage contract with events.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SimpleStorage {
    uint256 private value;
    event ValueChanged(uint256 newValue);

    function get() public view returns (uint256) {
        return value;
    }

    function set(uint256 _value) public {
        value = _value;
        emit ValueChanged(_value);
    }
}
```

## React Integration

### useWeb3 Hook

```typescript
import { useWeb3 } from './hooks/useWeb3';

function MyComponent() {
  const { 
    isConnected, 
    account, 
    chainId, 
    connect, 
    disconnect 
  } = useWeb3();

  return (
    <div>
      {isConnected ? (
        <p>Connected: {account}</p>
      ) : (
        <button onClick={connect}>Connect Wallet</button>
      )}
    </div>
  );
}
```

### useSimpleStorage Hook

```typescript
import { useSimpleStorage } from './hooks/useSimpleStorage';

function StorageComponent() {
  const { value, setValue, isSettingValue } = useSimpleStorage({
    address: '0x...',
    abi: SimpleStorageABI,
  });

  return (
    <div>
      <p>Value: {value.toString()}</p>
      <button onClick={() => setValue(42n)} disabled={isSettingValue}>
        Set Value
      </button>
    </div>
  );
}
```

## Testing

### Contract Tests

```bash
bun run test
```

Tests verify:
- Contract deployment
- Read operations (get)
- Write operations (set)
- Event emission
- Access control
- Edge cases

### Component Tests

```bash
bun run test:unit
```

Tests cover:
- Component rendering
- User interactions
- State management
- Error handling

## Deployment

### Local Network

```bash
# Start Hardhat node
bun run node

# Deploy (in another terminal)
bun run deploy
```

### Sepolia Testnet

```bash
# Set environment variables
export SEPOLIA_RPC_URL="https://sepolia.infura.io/v3/YOUR_KEY"
export PRIVATE_KEY="your_private_key"

# Deploy
bun run deploy:testnet
```

### Verify Contract

```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

## Configuration

### Hardhat Config

Located in `hardhat.config.ts`:
- Solidity version: 0.8.20
- Networks: localhost, hardhat, sepolia
- Etherscan API key for verification

### Vite Config

Located in `vite.config.ts`:
- React plugin
- Path aliases (@/*)
- Build optimization

## License

MIT
