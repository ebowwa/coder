/**
 * NFT Gallery Component
 * Displays a grid of NFTs owned by the connected wallet
 */

import { useState } from 'react';
import { useNFT, type OwnedNFT } from '../hooks/useNFT.ts';
import { Spinner } from './Spinner.tsx';
import { SkeletonCard } from './Skeleton.tsx';

export interface NFTGalleryProps {
  /** Optional custom contract address */
  contractAddress?: string;
  /** Callback when an NFT is selected */
  onSelect?: (nft: OwnedNFT) => void;
  /** Number of columns in the grid (default: 3) */
  columns?: 2 | 3 | 4;
  /** Show collection info header */
  showHeader?: boolean;
  /** Max number of NFTs to display */
  limit?: number;
  /** Additional className */
  className?: string;
}

export function NFTGallery({
  contractAddress,
  onSelect,
  columns = 3,
  showHeader = true,
  limit,
  className = '',
}: NFTGalleryProps) {
  const {
    name,
    symbol,
    ownedNFTs,
    isLoadingOwnedNFTs,
    isLoadingInfo,
    isLoadingBalance,
    ownedNFTsError,
    infoError,
    balance,
    isContractDeployed,
  } = useNFT({ address: contractAddress });

  const [selectedTokenId, setSelectedTokenId] = useState<bigint | null>(null);

  // Handle NFT selection
  const handleSelect = (nft: OwnedNFT) => {
    setSelectedTokenId(nft.tokenId);
    onSelect?.(nft);
  };

  // Grid column classes
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  };

  // Loading state
  const isLoading = isLoadingOwnedNFTs || isLoadingInfo || isLoadingBalance;

  // Limit NFTs displayed
  const displayNFTs = limit ? ownedNFTs.slice(0, limit) : ownedNFTs;

  // Not connected / not deployed state
  if (!isContractDeployed) {
    return (
      <div className={`nft-gallery ${className}`}>
        <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-8 text-center">
          <div className="text-gray-400 dark:text-gray-500 mb-2">
            <svg
              className="mx-auto h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            NFT contract not deployed on this network
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (ownedNFTsError || infoError) {
    return (
      <div className={`nft-gallery ${className}`}>
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm font-medium">
              {(ownedNFTsError || infoError)?.message || 'Failed to load NFTs'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`nft-gallery ${className}`}>
      {/* Collection Header */}
      {showHeader && (
        <div className="mb-6">
          {isLoading ? (
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-2" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32" />
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                {name || 'NFT Collection'}
                {symbol && (
                  <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                    ({symbol})
                  </span>
                )}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {balance !== undefined ? `${balance} NFT${balance !== 1 ? 's' : ''} owned` : 'No NFTs owned'}
              </p>
            </>
          )}
        </div>
      )}

      {/* Loading State */}
      {isLoading && ownedNFTs.length === 0 && (
        <div className={`grid gap-4 ${gridCols[columns]}`}>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && ownedNFTs.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-12 text-center">
          <div className="text-gray-400 dark:text-gray-500 mb-3">
            <svg
              className="mx-auto h-16 w-16"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
            No NFTs Found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            You don't own any NFTs from this collection yet.
          </p>
        </div>
      )}

      {/* NFT Grid */}
      {displayNFTs.length > 0 && (
        <div className={`grid gap-4 ${gridCols[columns]}`}>
          {displayNFTs.map((nft) => (
            <NFTCard
              key={nft.tokenId.toString()}
              nft={nft}
              isSelected={selectedTokenId === nft.tokenId}
              onClick={() => handleSelect(nft)}
            />
          ))}
        </div>
      )}

      {/* Load More Indicator */}
      {limit && ownedNFTs.length > limit && (
        <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          Showing {limit} of {ownedNFTs.length} NFTs
        </div>
      )}
    </div>
  );
}

// Individual NFT Card Component
interface NFTCardProps {
  nft: OwnedNFT;
  isSelected: boolean;
  onClick: () => void;
}

function NFTCard({ nft, isSelected, onClick }: NFTCardProps) {
  const [imageError, setImageError] = useState(false);

  // Get image URL from metadata or use placeholder
  const imageUrl = nft.metadata?.image && !imageError
    ? nft.metadata.image
    : null;

  return (
    <div
      onClick={onClick}
      className={`
        group relative rounded-xl overflow-hidden cursor-pointer
        bg-white dark:bg-gray-800 
        border-2 transition-all duration-200
        hover:shadow-lg hover:scale-[1.02]
        ${isSelected
          ? 'border-indigo-500 dark:border-indigo-400 ring-2 ring-indigo-500/20'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
        }
      `}
    >
      {/* Image Container */}
      <div className="aspect-square w-full bg-gray-100 dark:bg-gray-700 relative overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={nft.metadata?.name || `NFT #${nft.tokenId}`}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          // Placeholder
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-gray-400 dark:text-gray-500">
              <svg
                className="h-16 w-16"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>
        )}

        {/* Token ID Badge */}
        <div className="absolute top-2 right-2 px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm">
          <span className="text-xs font-medium text-white">
            #{nft.tokenId.toString()}
          </span>
        </div>

        {/* Selected Indicator */}
        {isSelected && (
          <div className="absolute top-2 left-2">
            <div className="h-6 w-6 rounded-full bg-indigo-500 flex items-center justify-center">
              <svg
                className="h-4 w-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Name */}
        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
          {nft.metadata?.name || `NFT #${nft.tokenId}`}
        </h3>

        {/* Description */}
        {nft.metadata?.description && (
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {nft.metadata.description}
          </p>
        )}

        {/* Attributes Preview */}
        {nft.metadata?.attributes && nft.metadata.attributes.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {nft.metadata.attributes.slice(0, 3).map((attr, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                {attr.value}
              </span>
            ))}
            {nft.metadata.attributes.length > 3 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs text-gray-500 dark:text-gray-400">
                +{nft.metadata.attributes.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default NFTGallery;
