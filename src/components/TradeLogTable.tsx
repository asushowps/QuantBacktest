/**
 * Institutional Trade Log Table & Execution Inspector
 * High-density tabular view with sorting, filtering, and execution details.
 */

import React, { useState, useMemo } from 'react';
import { Trade } from '../types/backtest';
import { Search, Download, ArrowUpDown, Filter } from 'lucide-react';

interface TradeLogTableProps {
  trades: Trade[];
  onExportCSV: () => void;
}

export const TradeLogTable: React.FC<TradeLogTableProps> = ({ trades, onExportCSV }) => {
  const [filterType, setFilterType] = useState<'all' | 'winners' | 'losers' | 'long' | 'short'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'exitDate' | 'returnPct' | 'netPnL' | 'durationDays'>('exitDate');
  const [sortAsc, setSortAsc] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const filteredTrades = useMemo(() => {
    return trades
      .filter((t) => {
        if (filterType === 'winners' && t.netPnL <= 0) return false;
        if (filterType === 'losers' && t.netPnL > 0) return false;
        if (filterType === 'long' && t.side !== 'LONG') return false;
        if (filterType === 'short' && t.side !== 'SHORT') return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            t.id.toLowerCase().includes(q) ||
            t.entryDate.includes(q) ||
            t.exitDate.includes(q) ||
            t.exitReason.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];
        if (typeof valA === 'string') {
          return sortAsc ? (valA > valB ? 1 : -1) : valA < valB ? 1 : -1;
        }
        return sortAsc ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
      });
  }, [trades, filterType, searchQuery, sortField, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filteredTrades.length / pageSize));
  const pageTrades = filteredTrades.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 shadow-md">
      {/* Table Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">Execution Trade Log</h3>
          <p className="text-xs text-slate-400">
            {trades.length.toLocaleString()} total executed round-trips
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search date or reason..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 w-44"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            {(['all', 'winners', 'losers', 'long', 'short'] as const).map((f) => (
              <button
                key={f}
                onClick={() => {
                  setFilterType(f);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded capitalize transition-colors ${
                  filterType === f
                    ? 'bg-slate-800 text-slate-100 font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* CSV Export Button */}
          <button
            onClick={onExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs transition-colors border border-slate-700"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono tabular-nums border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
              <th className="py-2 px-2 text-left">Trade ID</th>
              <th className="py-2 px-2 text-left">Side</th>
              <th
                onClick={() => handleSort('exitDate')}
                className="py-2 px-2 text-left cursor-pointer hover:text-slate-200"
              >
                <div className="flex items-center gap-1">
                  <span>Entry & Exit</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-2 px-2 text-right">Entry / Exit ($)</th>
              <th className="py-2 px-2 text-right">Shares</th>
              <th
                onClick={() => handleSort('returnPct')}
                className="py-2 px-2 text-right cursor-pointer hover:text-slate-200"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Return %</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort('netPnL')}
                className="py-2 px-2 text-right cursor-pointer hover:text-slate-200"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Net PnL ($)</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort('durationDays')}
                className="py-2 px-2 text-right cursor-pointer hover:text-slate-200"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Days</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-2 px-2 text-right">Exit Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {pageTrades.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-500">
                  No trades match the current filter.
                </td>
              </tr>
            ) : (
              pageTrades.map((t) => {
                const isWin = t.netPnL > 0;
                return (
                  <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2 px-2 font-medium text-slate-300">{t.id}</td>
                    <td className="py-2 px-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          t.side === 'LONG' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-purple-500/10 text-purple-400'
                        }`}
                      >
                        {t.side}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-slate-400 text-[11px]">
                      <div>{t.entryDate}</div>
                      <div className="text-slate-500">{t.exitDate}</div>
                    </td>
                    <td className="py-2 px-2 text-right text-slate-300">
                      <div>${t.entryPrice.toFixed(2)}</div>
                      <div className="text-slate-400">${t.exitPrice.toFixed(2)}</div>
                    </td>
                    <td className="py-2 px-2 text-right text-slate-300">{t.shares.toLocaleString()}</td>
                    <td className="py-2 px-2 text-right font-bold">
                      <span className={isWin ? 'text-emerald-400' : 'text-rose-400'}>
                        {isWin ? '+' : ''}{t.returnPct.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right font-bold">
                      <span className={isWin ? 'text-emerald-400' : 'text-rose-400'}>
                        {isWin ? '+' : ''}${t.netPnL.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right text-slate-400">{t.durationDays}d</td>
                    <td className="py-2 px-2 text-right">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded border ${
                          t.exitReason === 'Take Profit'
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                            : t.exitReason === 'Stop Loss'
                            ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                            : t.exitReason === 'Trailing Stop'
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {t.exitReason}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs text-slate-400">
        <div>
          Showing {(currentPage - 1) * pageSize + 1} to{' '}
          {Math.min(filteredTrades.length, currentPage * pageSize)} of {filteredTrades.length} trades
        </div>

        <div className="flex items-center gap-1.5">
          <button
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none text-slate-200"
          >
            Prev
          </button>
          <span className="px-2 text-slate-400 font-mono">
            {currentPage} / {totalPages}
          </span>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none text-slate-200"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};
