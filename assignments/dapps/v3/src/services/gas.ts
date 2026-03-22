import { createApiClient } from '../utils/api';
import type { GasPriceData } from '../hooks/useGasPrice';

// Using Etherscan gas price API as fallback
const etherscanApi = createApiClient(
  `https://api.etherscan.io/api?module=gastracker&action=gasoracle`
);

export async function fetchGasPrice(): Promise<GasPriceData> {
  try {
    const response = await etherscanApi.get<any>('');
    
    if (response.status === '1' && response.result) {
      const result = response.result;
      return {
        slow: {
          price: parseFloat(result.SafeGasPrice) || 20,
          time: '~30 sec',
        },
        average: {
          price: parseFloat(result.ProposeGasPrice) || 25,
          time: '~1 min',
        },
        fast: {
          price: parseFloat(result.FastGasPrice) || 30,
          time: '~30 sec',
        },
        baseFee: parseFloat(result?.UsdPrice) || undefined,
        lastBlock: parseInt(result.LastBlock) || undefined,
      };
    }
    
    // Fallback values
    return {
      slow: { price: 15, time: '~30 sec' },
      average: { price: 20, time: '~1 min' },
      fast: { price: 25, time: '~30 sec' },
    };
  } catch (error) {
    console.error('Failed to fetch gas prices:', error);
    return {
      slow: { price: 15, time: '~30 sec' },
      average: { price: 20, time: '~1 min' },
      fast: { price: 25, time: '~30 sec' },
    };
  }
}

export function calculateGasCost(gwei: number, gasLimit: number, ethPrice: number): {
  costWei: bigint;
  costEth: number;
  costUsd: number;
} {
  const costWei = BigInt(Math.floor(gwei * 1e9)) * BigInt(gasLimit);
  const costEth = Number(costWei) / 1e18;
  const costUsd = costEth * ethPrice;
  
  return { costWei, costEth, costUsd };
}
