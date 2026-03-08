/**
 * Main App Component
 * Demonstrates Wallet + Network + Transaction components
 */

import { WalletButton } from './components/WalletButton.tsx';
import { NetworkSwitcher } from './components/NetworkSwitcher.tsx';
import { TransactionStatus } from './components/TransactionStatus.tsx';
import { useState } from 'react';

interface AppState {
  networkChainId?: number;
}

export function App() {
  const [state, setState] = useState<AppState>({});

  return (
    <div className="app">
      <header className="app-header">
        <h1>Web3 Demo App</h1>
        <div className="controls">
          <WalletButton />
          <NetworkSwitcher
            networkChainId={state.networkChainId}
            onNetworkChange={(chainId) => setState({ ...state, networkChainId: chainId })}
          />
        </div>
      </header>

      <main className="app-main">
        <section className="card">
          <h2>Transaction Status</h2>
          <TransactionStatus
            chainId={state.networkChainId}
          />
        </section>

        <section className="card">
          <h2>Instructions</h2>
          <ul>
            <li>Connect your wallet using the button above</li>
            <li>Switch networks using the network switcher</li>
            <li>View pending transactions in the status panel</li>
          </ul>
        </section>
      </main>

      <footer className="app-footer">
        <p>Built with React + wagmi + viem</p>
      </footer>
    </div>
  );
}
