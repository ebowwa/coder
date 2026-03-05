/**
 * Network Switcher Component
 * Dropdown for switching networks
 */

import { useState } from 'react';
import { useWeb3 } from '../providers/Web3Provider.tsx';
import { CHAINS, SUPPORTED_CHAIN_IDS, getChain } from '../config/chains.ts';

export interface NetworkSwitcherProps {
  className?: string;
  showIcon?: boolean;
}

export function NetworkSwitcher({ className = '', showIcon: _showIcon = false }: NetworkSwitcherProps) {
  const { chainId, switchChain, isSupportedChain } = useWeb3();
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  const currentChain = chainId ? getChain(chainId) : null;

  const handleSwitch = async (newChainId: number) => {
    setIsSwitching(true);
    try {
      await switchChain(newChainId);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to switch network:', error);
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <div className={`network-switcher ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSwitching}
        className={`network-button ${!isSupportedChain && chainId ? 'wrong-network' : ''}`}
      >
        {currentChain?.chainName ?? 'Select Network'}
        <span className="arrow">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <ul className="network-dropdown">
          {SUPPORTED_CHAIN_IDS.map((id) => {
            const chain = CHAINS[id];
            if (!chain) return null;
            const isCurrent = id === chainId;

            return (
              <li key={id}>
                <button
                  onClick={() => handleSwitch(id)}
                  disabled={isCurrent || isSwitching}
                  className={isCurrent ? 'current' : ''}
                >
                  {chain.chainName}
                  {isCurrent && ' ✓'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default NetworkSwitcher;
