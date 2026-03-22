# DeFi Dashboard Implementation Plan

## Overview

Build a comprehensive DeFi dashboard extending the existing dapps infrastructure (v2) with market tracking, wallet integration, and automated verification.

---

## Architecture

### Tech Stack (Extends v2)
- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Web3**: wagmi + viem + ethers.js v6
- **State**: TanStack Query (react-query)
- **Testing**: Vitest + Testing Library + Playwright (e2e)
- **Contracts**: Hardhat + Solidity 0.8.20

### Directory Structure (v3)
```
v3/
├── src/
│   ├── components/
│   │   ├── dashboard/         # Dashboard-specific components
│   │   │   ├── MarketOverview.tsx
│   │   │   ├── PriceChart.tsx
│   │   │   ├── PortfolioSummary.tsx
│   │   │   ├── TokenList.tsx
│   │   │   └── YieldMetrics.tsx
│   │   ├── wallet/
│   │   │   ├── WalletConnect.tsx
│   │   │   ├── AccountBalance.tsx
│   │   │   ├── TransactionHistory.tsx
│   │   │   └── TokenBalances.tsx
│   │   └── verification/
│   │       ├── VerificationStatus.tsx
│   │       └── ContractVerifier.tsx
│   ├── hooks/
│   │   ├── useMarketData.ts
│   │   ├── useTokenPrices.ts
│   │   ├── usePortfolio.ts
│   │   ├── useYieldData.ts
│   │   └── useContractVerification.ts
│   ├── services/
│   │   ├── coingecko.ts       # Price API
│   │   ├── defillama.ts       # Yield/TVL data
│   │   └── etherscan.ts       # Contract verification
│   ├── lib/
│   │   ├── api.ts
│   │   └── verification.ts
│   └── types/
│       ├── market.ts
│       └── portfolio.ts
├── contracts/
│   └── verification/
│       ├── PriceOracle.sol
│       └── VerificationRegistry.sol
├── scripts/
│   └── verify-contracts.ts
├── test/
│   ├── e2e/
│   │   └── dashboard.spec.ts
│   └── integration/
│       └── market-data.test.ts
└── vercel.json               # Deployment config
```

---

## Phase 1: Market Tracking

### 1.1 Price Data Integration
- [ ] Create `useTokenPrices` hook with CoinGecko API
- [ ] Implement caching with TanStack Query (5min stale time)
- [ ] Add WebSocket fallback for real-time updates
- [ ] Support multi-chain token addresses

### 1.2 Market Overview Component
- [ ] Top 50 tokens by market cap
- [ ] 24h price change indicators
- [ ] Sparkline mini-charts (7d)
- [ ] Search/filter functionality

### 1.3 Price Charts
- [ ] Candlestick chart integration (lightweight-charts)
- [ ] Multiple timeframes (1h, 24h, 7d, 30d)
- [ ] Volume overlay
- [ ] Crosshair tooltips

### 1.4 Yield Metrics
- [ ] DeFiLlama API integration
- [ ] Top protocols by TVL
- [ ] APY tracking for major pools
- [ ] Chain-specific yield data

---

## Phase 2: Wallet Integration

### 2.1 Enhanced Connection
- [ ] Multi-wallet support (MetaMask, WalletConnect, Coinbase)
- [ ] Auto-reconnect on page load
- [ ] Connection status persistence
- [ ] Network mismatch handling

### 2.2 Portfolio View
- [ ] Aggregate token balances across chains
- [ ] USD valuation with live prices
- [ ] PnL calculation (cost basis tracking)
- [ ] Historical portfolio value chart

### 2.3 Transaction Management
- [ ] Pending transaction tracking
- [ ] Transaction history with filters
- [ ] Gas estimation display
- [ ] Transaction replacement/cancel support

### 2.4 Token Operations
- [ ] Token approval management
- [ ] Batch approve/revocation
- [ ] Native token transfers
- [ ] ERC-20 transfer with gasless option

---

## Phase 3: Automated Verification

### 3.1 Contract Verification System
- [ ] Hardhat verify integration
- [ ] Multi-explorer support (Etherscan, Arbiscan, etc.)
- [ ] Verification status tracking
- [ ] Auto-verify on deployment

### 3.2 Verification Registry Contract
```solidity
contract VerificationRegistry {
    struct Verification {
        bytes32 codeHash;
        address verifier;
        uint256 timestamp;
        bool isValid;
    }
    
    mapping(address => Verification) public verifications;
    event Verified(address indexed contract, bytes32 codeHash);
}
```

### 3.3 CI/CD Integration
- [ ] GitHub Action for auto-verification
- [ ] Pre-deployment verification checks
- [ ] Post-deployment verification confirmation
- [ ] Verification status badges

### 3.4 Verification Dashboard
- [ ] Contract list with verification status
- [ ] Source code viewer
- [ ] ABI explorer
- [ ] Read/Write contract interface

---

## Implementation Timeline

| Phase | Tasks | Duration |
|-------|-------|----------|
| 1.1-1.2 | Price data + Market overview | 2 days |
| 1.3-1.4 | Charts + Yield metrics | 2 days |
| 2.1-2.2 | Wallet connection + Portfolio | 2 days |
| 2.3-2.4 | Transactions + Token ops | 2 days |
| 3.1-3.2 | Contract verification | 2 days |
| 3.3-3.4 | CI/CD + Dashboard | 1 day |

**Total: ~11 days**

---

## API Integrations

| Service | Purpose | Rate Limit |
|---------|---------|------------|
| CoinGecko | Token prices | 10-50/min |
| DeFiLlama | TVL/Yield data | 300/min |
| Etherscan | Contract verification | 5/sec |
| WalletConnect | Wallet connections | Unlimited |

---

## Testing Strategy

### Unit Tests
- Component rendering
- Hook logic
- API response parsing
- Utility functions

### Integration Tests
- API endpoints with mock servers
- Wallet connection flows
- Transaction simulation

### E2E Tests (Playwright)
- Full dashboard load
- Wallet connect flow
- Market data refresh
- Contract verification flow

---

## Security Considerations

1. **API Keys**: Store in Doppler/environment variables
2. **RPC Endpoints**: Use authenticated providers
3. **Contract Verification**: Verify bytecode matches source
4. **Wallet**: Never store private keys, use wallet providers only
5. **Rate Limiting**: Implement request queuing for APIs

---

## Dependencies to Add

```json
{
  "dependencies": {
    "lightweight-charts": "^4.1.0",
    "@walletconnect/web3-provider": "^1.8.0",
    "@web3-onboard/core": "^2.21.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.42.0",
    "msw": "^2.2.0"
  }
}
```

---

## Success Metrics

- [ ] Page load < 2s
- [ ] Price updates < 5s latency
- [ ] Wallet connect < 3 clicks
- [ ] 100% contract verification rate
- [ ] Test coverage > 80%

---

## Next Steps

1. Create v3 directory structure
2. Set up CoinGecko API integration
3. Build MarketOverview component
4. Implement wallet multi-connect
5. Set up verification registry contract
