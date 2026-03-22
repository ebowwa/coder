import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { checkVerification, verifyContract } from '../services/etherscan';
import type { VerificationStatus } from '../types/portfolio';

export function useContractVerification(address: `0x${string}`, chainId: number) {
  return useQuery({
    queryKey: ['verification', address, chainId],
    queryFn: async (): Promise<VerificationStatus> => {
      const result = await checkVerification(address, chainId);
      return { address, isVerified: result.verified, codeHash: result.sourceCode?.slice(0, 32) };
    },
    enabled: !!address && !!chainId,
  });
}

export function useVerifyContract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ address, sourceCode, chainId }: { address: `0x${string}`; sourceCode: string; chainId: number }) =>
      verifyContract(address, sourceCode, chainId),
    onSuccess: (_, { address, chainId }) => {
      queryClient.invalidateQueries({ queryKey: ['verification', address, chainId] });
    },
  });
}
