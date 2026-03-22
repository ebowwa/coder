import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getChartData } from '../../services/coingecko';

export function PriceChart({ tokenId = 'ethereum', days = 7 }: { tokenId?: string; days?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [chartLoaded, setChartLoaded] = useState(false);

  const { data: chartData } = useQuery({
    queryKey: ['chart', tokenId, days],
    queryFn: () => getChartData(tokenId, days),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!containerRef.current || !chartData?.length) return;
    
    import('lightweight-charts').then(({ createChart }) => {
      const chart = createChart(containerRef.current!, {
        width: containerRef.current!.clientWidth,
        height: 300,
        layout: { background: { color: '#1a1a2e' }, textColor: '#d1d5db' },
      });
      const series = chart.addCandlestickSeries({ upColor: '#22c55e', downColor: '#ef4444' });
      series.setData(chartData.map(d => ({ time: d.timestamp as any, open: d.open, high: d.high, low: d.low, close: d.close })));
      setChartLoaded(true);
      return () => chart.remove();
    });
  }, [chartData]);

  return <div ref={containerRef} className="w-full h-80 bg-gray-900 rounded-lg">{!chartLoaded && <div className="p-4 text-gray-400">Loading chart...</div>}</div>;
}
