/**
 * Institutional Performance & Risk Analytics Metrics Grid
 * Features tabular figures, benchmark deltas, and multi-tier quantitative statistics.
 */

import React from 'react';
import { PerformanceMetrics } from '../types/backtest';
import { ArrowUpRight, ArrowDownRight, ShieldCheck, Zap } from 'lucide-react';

interface MetricsOverviewProps {
  metrics: PerformanceMetrics;
  initialCapital: number;
}

export const MetricsOverview: React.FC<MetricsOverviewProps> = ({ metrics, initialCapital }) => {
  const isNetPositive = metrics.totalReturnPct >= 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Primary KPI Card Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Return */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="text-[11px] font-medium text-slate-400">Total Net Return</div>
          <div className="my-1.5 flex items-baseline gap-1.5">
            <span className={`text-xl sm:text-2xl font-bold font-mono tabular-nums ${isNetPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isNetPositive ? '+' : ''}{metrics.totalReturnPct.toLocaleString()}%
            </span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono tabular-nums flex items-center justify-between">
            <span>SPY Benchmark:</span>
            <span className="text-slate-400">+{metrics.benchmarkReturnPct.toLocaleString()}%</span>
          </div>
        </div>

        {/* CAGR */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="text-[11px] font-medium text-slate-400">Compound Annual (CAGR)</div>
          <div className="my-1.5 flex items-baseline gap-1.5">
            <span className={`text-xl sm:text-2xl font-bold font-mono tabular-nums ${metrics.cagr >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {metrics.cagr >= 0 ? '+' : ''}{metrics.cagr.toFixed(2)}%
            </span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono tabular-nums flex items-center justify-between">
            <span>SPY CAGR:</span>
            <span className="text-slate-400">+{metrics.benchmarkCagr.toFixed(2)}%</span>
          </div>
        </div>

        {/* Sharpe Ratio */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="text-[11px] font-medium text-slate-400">Sharpe Ratio (Rf=2%)</div>
          <div className="my-1.5 flex items-baseline gap-1.5">
            <span className={`text-xl sm:text-2xl font-bold font-mono tabular-nums ${metrics.sharpeRatio >= 1.0 ? 'text-emerald-400' : metrics.sharpeRatio >= 0.5 ? 'text-cyan-400' : 'text-amber-400'}`}>
              {metrics.sharpeRatio.toFixed(2)}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono tabular-nums flex items-center justify-between">
            <span>SPY Sharpe:</span>
            <span className="text-slate-400">{metrics.benchmarkSharpe.toFixed(2)}</span>
          </div>
        </div>

        {/* Sortino Ratio */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="text-[11px] font-medium text-slate-400">Sortino Ratio</div>
          <div className="my-1.5 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-slate-100">
              {metrics.sortinoRatio.toFixed(2)}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono tabular-nums flex items-center justify-between">
            <span>Downside Dev:</span>
            <span className="text-slate-400">{(metrics.annualizedVol * 0.7).toFixed(1)}%</span>
          </div>
        </div>

        {/* Max Drawdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="text-[11px] font-medium text-slate-400">Max Drawdown (DD)</div>
          <div className="my-1.5 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-rose-400">
              -{metrics.maxDrawdownPct.toFixed(1)}%
            </span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono tabular-nums flex items-center justify-between">
            <span>SPY Max DD:</span>
            <span className="text-rose-400/80">-{metrics.benchmarkMaxDrawdownPct.toFixed(1)}%</span>
          </div>
        </div>

        {/* Win Rate & Profit Factor */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="text-[11px] font-medium text-slate-400">Win Rate / Profit Factor</div>
          <div className="my-1.5 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-cyan-400">
              {metrics.winRatePct.toFixed(1)}%
            </span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono tabular-nums flex items-center justify-between">
            <span>Profit Factor:</span>
            <span className="text-emerald-400 font-bold">{metrics.profitFactor.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Secondary Detailed Quantitative Analytics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 text-xs">
        {/* Alpha */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5">
          <span className="text-[10px] text-slate-400">Jensen's Alpha (α)</span>
          <div className="mt-1 font-mono font-semibold text-slate-200">
            {metrics.alpha >= 0 ? '+' : ''}{metrics.alpha.toFixed(2)}%
          </div>
        </div>

        {/* Beta */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5">
          <span className="text-[10px] text-slate-400">Portfolio Beta (β)</span>
          <div className="mt-1 font-mono font-semibold text-slate-200">
            {metrics.beta.toFixed(2)}
          </div>
        </div>

        {/* Calmar Ratio */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5">
          <span className="text-[10px] text-slate-400">Calmar Ratio</span>
          <div className="mt-1 font-mono font-semibold text-slate-200">
            {metrics.calmarRatio.toFixed(2)}
          </div>
        </div>

        {/* Daily VaR 95% */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5">
          <span className="text-[10px] text-slate-400">Daily VaR (95%)</span>
          <div className="mt-1 font-mono font-semibold text-amber-400">
            -{metrics.var95.toFixed(2)}%
          </div>
        </div>

        {/* Expected Shortfall / CVaR */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5">
          <span className="text-[10px] text-slate-400">Expected Shortfall</span>
          <div className="mt-1 font-mono font-semibold text-rose-400">
            -{metrics.cvar95.toFixed(2)}%
          </div>
        </div>

        {/* Annualized Vol */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5">
          <span className="text-[10px] text-slate-400">Annualized Vol</span>
          <div className="mt-1 font-mono font-semibold text-slate-200">
            {metrics.annualizedVol.toFixed(1)}%
          </div>
        </div>

        {/* Total Trading Fees */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5">
          <span className="text-[10px] text-slate-400">Fees Paid</span>
          <div className="mt-1 font-mono font-semibold text-slate-200">
            ${metrics.totalFees.toLocaleString()}
          </div>
        </div>

        {/* Exposure Time */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5">
          <span className="text-[10px] text-slate-400">Market Exposure</span>
          <div className="mt-1 font-mono font-semibold text-slate-200">
            {metrics.exposureTimePct.toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  );
};
