import { useState } from 'react';
import { useYieldProjection } from '../../hooks/useYieldCalculator';

export function YieldCalculator() {
  const [principal, setPrincipal] = useState('1000');
  const [apy, setApy] = useState('5');
  const [compoundFreq, setCompoundFreq] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');

  const principalNum = parseFloat(principal) || 0;
  const apyNum = parseFloat(apy) || 0;

  const projections = useYieldProjection({
    principal: principalNum,
    apy: apyNum,
    compoundFrequency: compoundFreq,
  });

  const yearlyProjection = projections.find(p => p.days === 365);

  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <h2 className="text-xl font-bold mb-4">Yield Calculator</h2>

      <div className="space-y-3 mb-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Principal Amount (USD)</label>
          <input
            type="number"
            value={principal}
            onChange={e => setPrincipal(e.target.value)}
            className="w-full p-2 bg-gray-800 rounded text-white"
            placeholder="1000"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">APY (%)</label>
          <input
            type="number"
            value={apy}
            onChange={e => setApy(e.target.value)}
            className="w-full p-2 bg-gray-800 rounded text-white"
            placeholder="5"
            step="0.1"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Compound Frequency</label>
          <select
            value={compoundFreq}
            onChange={e => setCompoundFreq(e.target.value as any)}
            className="w-full p-2 bg-gray-800 rounded text-white"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
      </div>

      {yearlyProjection && yearlyProjection.profit > 0 && (
        <div className="p-3 bg-green-900/20 border border-green-700 rounded mb-4">
          <div className="text-sm text-gray-400">Projected Annual Earnings</div>
          <div className="text-2xl font-bold text-green-500">
            +${yearlyProjection.profit.toFixed(2)}
          </div>
          <div className="text-sm text-gray-400">
            ({yearlyProjection.profitPercent.toFixed(2)}% APY)
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="text-sm font-medium text-gray-400 mb-2">Projections</div>
        {projections.map(proj => (
          <div key={proj.period} className="flex justify-between text-sm p-2 bg-gray-800 rounded">
            <span className="text-gray-400">{proj.period}</span>
            <span className="font-medium">
              ${proj.totalValue.toFixed(2)}
              {proj.profit > 0 && (
                <span className="text-green-500 ml-2">
                  (+${proj.profit.toFixed(2)})
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
