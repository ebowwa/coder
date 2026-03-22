const EXPLORER_APIS: Record<number, string> = {
  1: 'https://api.etherscan.io/api',
  42161: 'https://api.arbiscan.io/api',
  10: 'https://api-optimistic.etherscan.io/api',
  137: 'https://api.polygonscan.com/api',
};

export interface VerificationResult {
  verified: boolean;
  sourceCode?: string;
  abi?: any[];
}

export async function checkVerification(address: `0x${string}`, chainId: number): Promise<VerificationResult> {
  const apiUrl = EXPLORER_APIS[chainId];
  if (!apiUrl) return { verified: false };
  
  const apiKey = process.env[`ETHERSCAN_API_KEY_${chainId}`] || process.env.ETHERSCAN_API_KEY || '';
  const res = await fetch(`${apiUrl}?module=contract&action=getsourcecode&address=${address}&apikey=${apiKey}`);
  
  if (!res.ok) return { verified: false };
  const data = await res.json();
  
  if (data.status === '1' && data.result[0]?.SourceCode) {
    return { verified: true, sourceCode: data.result[0].SourceCode, abi: JSON.parse(data.result[0].ABI) };
  }
  return { verified: false };
}

export async function verifyContract(address: `0x${string}`, sourceCode: string, chainId: number): Promise<boolean> {
  const apiUrl = EXPLORER_APIS[chainId];
  if (!apiUrl) return false;
  
  const apiKey = process.env[`ETHERSCAN_API_KEY_${chainId}`] || process.env.ETHERSCAN_API_KEY || '';
  const res = await fetch(`${apiUrl}?module=contract&action=verifysourcecode&address=${address}&sourceCode=${encodeURIComponent(sourceCode)}&apikey=${apiKey}`, {
    method: 'POST',
  });
  
  if (!res.ok) return false;
  const data = await res.json();
  return data.status === '1';
}
