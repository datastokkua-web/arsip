import React, { useState, useEffect, Component, ReactNode } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';

interface MonthDataItem {
  label: string;
  masuk: number;
  keluar: number;
  total: number;
}

interface RechartsMonthlyBarChartProps {
  data: MonthDataItem[];
}

// Local Error Boundary specifically for the Chart
class ChartErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: any) {
    console.warn('Recharts render issue caught, falling back to SVG chart:', err);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

/**
 * Fallback SVG Bar Chart: 100% crash-proof, works in any browser, iframe, or React 19 state
 */
export const SvgFallbackBarChart: React.FC<{ data: MonthDataItem[] }> = ({ data }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const maxVal = Math.max(1, ...data.map(d => Math.max(d.masuk, d.keluar)));

  return (
    <div className="w-full h-64 flex flex-col justify-between pt-2">
      <div className="flex-1 flex items-end justify-between gap-2 sm:gap-4 px-2 pb-2 border-b border-slate-200">
        {data.map((item, idx) => {
          const masukHeightPct = Math.round((item.masuk / maxVal) * 85);
          const keluarHeightPct = Math.round((item.keluar / maxVal) * 85);
          const isHovered = hoveredIdx === idx;

          return (
            <div
              key={item.label}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="flex-1 flex flex-col items-center h-full justify-end relative group cursor-pointer"
            >
              {/* Tooltip Popup on Hover */}
              {isHovered && (
                <div className="absolute -top-16 z-20 bg-slate-900 text-white text-[11px] py-1.5 px-2.5 rounded-xl shadow-xl whitespace-nowrap pointer-events-none border border-slate-700 animate-fadeIn">
                  <div className="font-bold text-center border-b border-slate-700 pb-0.5 mb-1">{item.label}</div>
                  <div className="flex items-center gap-2 text-emerald-300">
                    <span>Masuk:</span> <b>{item.masuk}</b>
                  </div>
                  <div className="flex items-center gap-2 text-blue-300">
                    <span>Keluar:</span> <b>{item.keluar}</b>
                  </div>
                </div>
              )}

              {/* Bar Group */}
              <div className="w-full flex items-end justify-center gap-1 sm:gap-1.5 h-full">
                {/* Bar Masuk */}
                <div
                  style={{ height: `${Math.max(4, masukHeightPct)}%` }}
                  className="w-full max-w-[20px] bg-emerald-600 rounded-t-md transition-all duration-300 group-hover:brightness-110 shadow-xs relative flex items-start justify-center"
                >
                  {item.masuk > 0 && (
                    <span className="text-[9px] font-bold text-white -mt-3.5 sm:block hidden">
                      {item.masuk}
                    </span>
                  )}
                </div>

                {/* Bar Keluar */}
                <div
                  style={{ height: `${Math.max(4, keluarHeightPct)}%` }}
                  className="w-full max-w-[20px] bg-blue-600 rounded-t-md transition-all duration-300 group-hover:brightness-110 shadow-xs relative flex items-start justify-center"
                >
                  {item.keluar > 0 && (
                    <span className="text-[9px] font-bold text-white -mt-3.5 sm:block hidden">
                      {item.keluar}
                    </span>
                  )}
                </div>
              </div>

              {/* X Axis Label */}
              <span className="text-[11px] font-semibold text-slate-500 mt-2">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 pt-3 text-xs font-semibold text-slate-600">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-emerald-600 shadow-2xs"></span>
          <span>Surat Masuk</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-blue-600 shadow-2xs"></span>
          <span>Surat Keluar</span>
        </div>
      </div>
    </div>
  );
};

export const RechartsMonthlyBarChart: React.FC<RechartsMonthlyBarChartProps> = ({ data }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Delay mounting slightly to allow DOM bounding rects to be calculated reliably
    const timer = setTimeout(() => {
      setMounted(true);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) {
    return <SvgFallbackBarChart data={data} />;
  }

  return (
    <ChartErrorBoundary fallback={<SvgFallbackBarChart data={data} />}>
      <div className="h-64 w-full pt-1" style={{ minHeight: 250 }}>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data} margin={{ top: 12, right: 12, left: -22, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis 
              dataKey="label" 
              tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }}
              axisLine={{ stroke: '#E2E8F0' }}
              tickLine={false}
            />
            <YAxis 
              allowDecimals={false}
              tick={{ fill: '#64748B', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip 
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const mItem = payload.find(p => p.dataKey === 'masuk');
                  const kItem = payload.find(p => p.dataKey === 'keluar');
                  const mVal = mItem ? Number(mItem.value) : 0;
                  const kVal = kItem ? Number(kItem.value) : 0;
                  const tot = mVal + kVal;

                  return (
                    <div className="bg-white/95 backdrop-blur-md p-3 rounded-xl shadow-xl border border-slate-200 text-xs space-y-1.5 min-w-[150px]">
                      <div className="font-bold text-slate-800 border-b border-slate-100 pb-1 flex items-center justify-between">
                        <span>Bulan {label}</span>
                        <span className="font-extrabold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">{tot} total</span>
                      </div>
                      <div className="flex items-center justify-between text-emerald-700 font-semibold">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-600"></span> Surat Masuk:
                        </span>
                        <b>{mVal}</b>
                      </div>
                      <div className="flex items-center justify-between text-blue-700 font-semibold">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-600"></span> Surat Keluar:
                        </span>
                        <b>{kVal}</b>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '8px' }}
              formatter={(value) => (
                <span className="text-xs font-semibold text-slate-600">
                  {value === 'masuk' ? 'Surat Masuk' : 'Surat Keluar'}
                </span>
              )}
            />
            <Bar 
              dataKey="masuk" 
              name="masuk" 
              fill="#16A34A" 
              radius={[6, 6, 0, 0]} 
              maxBarSize={32} 
            />
            <Bar 
              dataKey="keluar" 
              name="keluar" 
              fill="#2563EB" 
              radius={[6, 6, 0, 0]} 
              maxBarSize={32} 
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartErrorBoundary>
  );
};
