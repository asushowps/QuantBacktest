/**
 * Institutional Monthly & Annual Returns Matrix Heatmap
 * Visualizes 30 years of month-by-month performance with dynamic color grading.
 */

import React, { useState } from 'react';
import { MonthlyReturnData } from '../types/backtest';

interface MonthlyHeatmapProps {
  monthlyReturns: MonthlyReturnData[];
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const MonthlyHeatmap: React.FC<MonthlyHeatmapProps> = ({ monthlyReturns }) => {
  const [selectedCell, setSelectedCell] = useState<{ year: number; month: string; val: number } | null>(null);

  if (monthlyReturns.length === 0) return null;

  const getCellColor = (val: number | undefined) => {
    if (val === undefined || isNaN(val)) return 'bg-slate-900/40 text-slate-600';
    if (val === 0) return 'bg-slate-800 text-slate-400';

    if (val > 15) return 'bg-emerald-600 text-white font-semibold';
    if (val > 8) return 'bg-emerald-600/80 text-emerald-100 font-medium';
    if (val > 3) return 'bg-emerald-600/50 text-emerald-200';
    if (val > 0) return 'bg-emerald-600/25 text-emerald-300';

    if (val < -15) return 'bg-rose-700 text-white font-semibold';
    if (val < -8) return 'bg-rose-600/80 text-rose-100 font-medium';
    if (val < -3) return 'bg-rose-600/50 text-rose-200';
    return 'bg-rose-600/25 text-rose-300';
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">Monthly Returns Matrix</h3>
          <p className="text-xs text-slate-400">Historical performance distribution across market regimes</p>
        </div>

        {selectedCell && (
          <div className="text-xs font-mono px-3 py-1 bg-slate-950 border border-slate-700 rounded-md text-slate-300">
            {selectedCell.month} {selectedCell.year}:{' '}
            <strong className={selectedCell.val >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {selectedCell.val >= 0 ? '+' : ''}{selectedCell.val.toFixed(2)}%
            </strong>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono tabular-nums border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
              <th className="py-2 px-2 text-left font-medium">Year</th>
              {MONTH_NAMES.map((m) => (
                <th key={m} className="py-2 px-1 text-center font-medium w-12">
                  {m}
                </th>
              ))}
              <th className="py-2 px-2 text-right font-semibold text-slate-300">YTD</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {monthlyReturns.map((row) => (
              <tr key={row.year} className="hover:bg-slate-800/30 transition-colors">
                <td className="py-1.5 px-2 font-bold text-slate-300">{row.year}</td>

                {MONTH_NAMES.map((m, idx) => {
                  const val = row.months[idx];
                  return (
                    <td
                      key={idx}
                      onMouseEnter={() => val !== undefined && setSelectedCell({ year: row.year, month: m, val })}
                      onMouseLeave={() => setSelectedCell(null)}
                      className="p-0.5 text-center"
                    >
                      <div
                        className={`py-1 rounded text-[11px] transition-transform hover:scale-105 cursor-default ${getCellColor(
                          val
                        )}`}
                      >
                        {val !== undefined ? `${val >= 0 ? '+' : ''}${val.toFixed(1)}%` : '—'}
                      </div>
                    </td>
                  );
                })}

                <td className="py-1 px-2 text-right">
                  <span
                    className={`font-bold px-1.5 py-0.5 rounded text-[11px] ${
                      row.yearTotal >= 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'
                    }`}
                  >
                    {row.yearTotal >= 0 ? '+' : ''}{row.yearTotal.toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
