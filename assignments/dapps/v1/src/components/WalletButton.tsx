/**
 * Wallet Connect Component
 * Button for connecting/disconnecting wallet
 */

import { useConnect } from '../hooks/useConnect.ts';
import { useAccount } from '../hooks/useAccount.ts';

export interface WalletButtonProps {
  className?: string;
  showBalance?: boolean;
  showChain?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function WalletButton({
  className = '',
  showBalance = true,
  showChain = true,
  onConnect,
  onDisconnect,
}: WalletButtonProps) {
  const { isConnected, isConnecting, connect, disconnect, needsInstall, statusText } = useConnect();
  const { displayAddress, displayBalance, chainName, isSupportedChain } = useAccount();

  const handleClick = async () => {
    if (isConnected) {
      disconnect();
      onDisconnect?.();
    } else {
      await connect();
      onConnect?.();
    }
  };

  if (needsInstall) {
    return (
      <a
        href="https://metamask.io/download/"
        target="_blank"
        rel="noopener noreferrer"
        className={`wallet-button install ${className}`}
      >
        Install MetaMask
      </a>
    );
  }

  return (
    <div className={`wallet-button-container ${className}`}>
      <button
        onClick={handleClick}
        disabled={isConnecting}
        className={`wallet-button ${isConnected ? 'connected' : 'disconnected'} ${!isSupportedChain && isConnected ? 'wrong-network' : ''}`}
      >
        {isConnecting ? statusText : isConnected ? displayAddress : 'Connect Wallet'}
      </button>

      {isConnected && (
        <div className="wallet-info">
          {showChain && (
            <span className={`chain-name ${isSupportedChain ? '' : 'unsupported'}`}>
              {chainName}
              {!isSupportedChain && ' (Unsupported)'}
            </span>
          )}
          {showBalance && <span className="balance">{displayBalance}</span>}
        </div>
      )}
    </div>
  );
}

export default WalletButton;
