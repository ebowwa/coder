/**
 * Transaction Status Component
 * Display transaction progress
 */

import { useWeb3 } from '../providers/Web3Provider.tsx';
import type { TransactionStatus as TxStatus, TransactionReceipt } from '../types/web3.ts';
import { getBlockExplorerAddressUrl } from '../config/chains.ts';

export interface TransactionStatusProps {
  hash: string | null;
  status: TxStatus;
  receipt?: TransactionReceipt | null;
  error?: Error | null;
  className?: string;
  showExplorerLink?: boolean;
}

export function TransactionStatus({
  hash,
  status,
  receipt,
  error,
  className = '',
  showExplorerLink = true,
}: TransactionStatusProps) {
  const { chainId } = useWeb3();

  if (!hash && status === 'idle') return null;

  const getStatusColor = () => {
    switch (status) {
      case 'pending':
      case 'confirming':
        return 'yellow';
      case 'success':
        return 'green';
      case 'error':
        return 'red';
      default:
        return 'gray';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'pending':
        return 'Pending...';
      case 'confirming':
        return 'Confirming...';
      case 'success':
        return 'Confirmed!';
      case 'error':
        return 'Failed';
      default:
        return '';
    }
  };

  const explorerUrl = hash && chainId ? getBlockExplorerAddressUrl(chainId, hash) : null;

  return (
    <div className={`transaction-status ${getStatusColor()} ${className}`}>
      <div className="status-header">
        <span className="status-indicator" />
        <span className="status-text">{getStatusText()}</span>
      </div>

      {hash && (
        <div className="tx-hash">
          <span>Tx: </span>
          <code>{hash.slice(0, 10)}...{hash.slice(-8)}</code>
          {showExplorerLink && explorerUrl && (
            <a href={explorerUrl} target="_blank" rel="noopener noreferrer">
              View
            </a>
          )}
        </div>
      )}

      {receipt && (
        <div className="tx-details">
          <span>Block: {receipt.blockNumber}</span>
          <span>Gas: {receipt.gasUsed.toString()}</span>
        </div>
      )}

      {error && (
        <div className="tx-error">
          {error.message}
        </div>
      )}
    </div>
  );
}

export default TransactionStatus;
