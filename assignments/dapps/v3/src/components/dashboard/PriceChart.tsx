import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getChartData } from '../../services/coingecko';

const TIME_RANGES = [
  { label: '1D', days: 1 },
  { label: '1W', days: 7 },
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '1Y', days: 365 },
];

export function PriceChart({ tokenId = 'ethereum', days = 7 }: { tokenId?: string; days?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [chartLoaded, setChartLoaded] = useState(false);
  const [selectedRange, setSelectedRange] = useState(days);
  const [chartInstance, setChartInstance] = useState<any>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number>(0);

  const { data: chartData, isLoading } = useQuery({
    queryKey: ['chart', tokenId, selectedRange],
    queryFn: () => getChartData(tokenId, selectedRange),
    staleTime: 5 * 60 * 1000,
  });

  // Calculate current price and change from chart data
  useEffect(() => {
    if (chartData && chartData.length >= 2) {
      const latest = chartData[chartData.length - 1].close;
      const first = chartData[0].close;
      setCurrentPrice(latest);
      setPriceChange(((latest - first) / first) * 100);
    }
  }, [chartData]);

  useEffect(() => {
    if (!containerRef.current || !chartData?.length) return;

    import('lightweight-charts').then(({ createChart, ColorType }) => {
      // Clean up existing chart
      if (chartInstance) {
        chartInstance.remove();
      }

      const chart = createChart(containerRef.current!, {
        width: containerRef.current!.clientWidth,
        height: 320,
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: '#94a3b8',
          fontFamily: "'Inter', sans-serif",
        },
        grid: {
          vertLines: { color: 'rgba(51, 65, 85, 0.3)' },
          horzLines: { color: 'rgba(51, 65, 85, 0.3)' },
        },
        crosshair: {
          mode: 1,
          vertLine: {
            color: 'rgba(59, 130, 246, 0.5)',
            width: 1,
            style: 2,
            labelBackgroundColor: '#3b82f6',
          },
          horzLine: {
            color: 'rgba(59, 130, 246, 0.5)',
            width: 1,
            style: 2,
            labelBackgroundColor: '#3b82f6',
          },
        },
        rightPriceScale: {
          borderColor: 'rgba(51, 65, 85, 0.5)',
          scaleMargins: { top: 0.1, bottom: 0.1 },
        },
        timeScale: {
          borderColor: 'rgba(51, 65, 85, 0.5)',
          timeVisible: true,
          secondsVisible: false,
        },
        handleScale: { mouseWheel: true, pinch: true },
        handleScroll: { mouseWheel: true, pressedMouseMove: true },
      });

      const areaSeries = chart.addAreaSeries({
        topColor: 'rgba(59, 130, 246, 0.4)',
        bottomColor: 'rgba(59, 130, 246, 0.0)',
        lineColor: '#3b82f6',
        lineWidth: 2,
        priceLineVisible: true,
        priceFormat: {
          type: 'price',
          precision: 2,
        },
      });

      areaSeries.setData(
        chartData.map(d => ({
          time: d.timestamp as any,
          value: d.close,
        }))
      );

      // Add volume if available
      try {
        const volumeSeries = chart.addHistogramSeries({
          color: 'rgba(59, 130, 246, 0.2)',
          priceFormat: { type: 'volume' },
          priceScaleId: '',
        });
        volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
      } catch {}

      chart.timeScale().fitContent();
      setChartInstance(chart);
      setChartLoaded(true);
    });

    return () => {
      if (chartInstance) {
        chartInstance.remove();
      }
    };
  }, [chartData]);

  return (
    <div className="card hover-lift card-shine relative overflow-hidden">
      {/* Gradient accent */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-500/10 to-cyan-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

      {/* Header with Price Display */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          </div>
          <div className="price-display">
            <span className="metric-label">ETH Price</span>
            <div className="flex items-baseline gap-3">
              <span className="price-current number-mono-enhanced">
                {currentPrice ? `${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '---'}
              </span>
              {priceChange !== 0 && (
                <span className={`price-change-badge ${priceChange >= 0 ? 'positive' : 'negative'}`}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={priceChange >= 0 ? "M7 11l5-5m0 0l5 5m-5-5v12" : "M17 13l-5 5m0 0l-5-5m5 5V6"} />
                  </svg>
                  {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center gap-1 bg-slate-900/50 rounded-lg p-1">
          {TIME_RANGES.map(range => (
            <button
              key={range.days}
              onClick={() => setSelectedRange(range.days)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                selectedRange === range.days
                  ? 'text-white bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg shadow-blue-500/25'
                  : 'text-gray-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Container */}
      <div className="relative">
        <div ref={containerRef} className="w-full h-80 rounded-lg overflow-hidden">
          {!chartLoaded && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin mx-auto mb-3" />
                <span className="text-gray-400 text-sm">Loading chart...</span>
              </div>
            </div>
          )}
          {isLoading && (
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin mx-auto mb-3" />
                <span className="text-gray-400 text-sm">Fetching data...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-4 pt-4 border-t border-gray-800/50 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            ETH/USD
          </span>
          <span className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Live
          </span>
        </div>
        <span className="text-xs text-gray-500">Powered by CoinGecko</span>
      </div>
    </div>
  );
}
