import { useYieldData } from '../../hooks/useYieldData';
import { formatNumber } from '../../utils/format';

export function YieldMetrics({ chain }: { chain?: string }) {
  const { data: yields, isLoading } = useYieldData(chain);

  if (isLoading) return <div className="animate-pulse h-64 bg-gray-800 rounded-lg" />;

  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <h2 className="text-xl font-bold mb-4">Top Yields {chain && `on ${chain}`}</h2>
      <div className="space-y-2">
        {yields?.slice(0, 10).map((y, i) => (
          <div key={i} className="flex justify-between p-2 bg-gray-800 rounded">
            <div>
              <span className="font-medium">{y.project}</span>
              <span className="text-gray-400 text-sm ml-2">{y.chain}</span>
            </div>
            <div className="text-right">
              <span className="text-green-500">{y.apy.toFixed(2)}%</span>
              <span className="text-gray-400 text-sm ml-2">${formatNumber(y.tvl)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
