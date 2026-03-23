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
    <div className="card hover-lift card-shine relative overflow-hidden">
      {/* Gradient accent */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-purple-500/10 to-pink-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

      {/* Header */}
      <div className="flex items-center gap-2 mb-4 relative z-10">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-400 flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <span className="metric-label">Yield Calculator</span>
      </div>

      {/* Inputs */}
      <div className="space-y-3 mb-4 relative z-10">
        <div>
          <label className="block text-xs text-gray-400 mb-1.5 font-medium">Principal Amount (USD)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
            <input
              type="number"
              value={principal}
              onChange={e => setPrincipal(e.target.value)}
              className="w-full pl-7 pr-4 py-2.5 bg-slate-900/50 border border-gray-700/50 rounded-xl text-white font-mono focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
              placeholder="1000"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1.5 font-medium">APY (%)</label>
          <div className="relative">
            <input
              type="number"
              value={apy}
              onChange={e => setApy(e.target.value)}
              className="w-full pr-8 py-2.5 bg-slate-900/50 border border-gray-700/50 rounded-xl text-white font-mono focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
              placeholder="5"
              step="0.1"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1.5 font-medium">Compound Frequency</label>
          <div className="grid grid-cols-4 gap-1.5">
            {(['daily', 'weekly', 'monthly', 'yearly'] as const).map(freq => (
              <button
                key={freq}
                onClick={() => setCompoundFreq(freq)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${
                  compoundFreq === freq
                    ? 'text-white bg-gradient-to-r from-purple-600 to-pink-600 shadow-lg shadow-purple-500/25'
                    : 'text-gray-400 bg-slate-800/50 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                {freq}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Annual Projection Highlight */}
      {yearlyProjection && yearlyProjection.profit > 0 && (
        <div className="p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/5 border border-green-500/30 rounded-xl mb-4 relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-400 font-medium mb-1">Projected Annual Earnings</div>
              <div className="text-2xl font-bold text-green-400 number-mono">
                +${yearlyProjection.profit.toFixed(2)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400 mb-1">Total Value</div>
              <div className="text-lg font-semibold text-white number-mono">
                ${yearlyProjection.totalValue.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Projections Timeline */}
      <div className="space-y-2 relative z-10">
        <div className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Timeline</div>
        {projections.map(proj => (
          <div
            key={proj.period}
            className="flex items-center justify-between py-2 px-3 bg-slate-800/30 rounded-lg border border-gray-800/50"
          >
            <span className="text-sm text-gray-400">{proj.period}</span>
            <div className="text-right">
              <span className="font-mono text-white font-medium">
                ${proj.totalValue.toFixed(2)}
              </span>
              {proj.profit > 0 && (
                <span className="ml-2 text-green-400 text-sm font-semibold">
                  (+${proj.profit.toFixed(2)})
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-gray-800/50 flex items-center justify-between relative z-10">
        <span className="text-xs text-gray-500">Compound interest calculator</span>
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Estimates only
        </div>
      </div>
    </div>
  );
}
