/**
 * Executive Quantitative Tear Sheet Modal
 * Institutional printable tear sheet with PDF generation and print styling.
 */

import React from 'react';
import { BacktestResult, StrategyParameters } from '../types/backtest';
import { generatePDFTearSheet } from '../services/reportExporter';
import { Printer, Download, X, FileText, CheckCircle2 } from 'lucide-react';

interface TearSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: BacktestResult;
  params: StrategyParameters;
  ticker: string;
  timeframeLabel: string;
}

export const TearSheetModal: React.FC<TearSheetModalProps> = ({
  isOpen,
  onClose,
  result,
  params,
  ticker,
  timeframeLabel,
}) => {
  if (!isOpen) return null;

  const handleDownloadPDF = () => {
    generatePDFTearSheet(result, params, ticker, timeframeLabel);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl flex flex-col shadow-2xl overflow-hidden my-auto max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800 no-print">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Institutional Strategy Tear Sheet</h2>
              <p className="text-xs text-slate-400">Quantitative risk profile & performance attributions</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-all shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors border border-slate-700"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Tear Sheet</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-6 sm:p-8 overflow-y-auto bg-white text-slate-900 print:p-0">
          {/* Header Banner */}
          <div className="border-b-2 border-slate-900 pb-4 mb-6 flex flex-wrap items-baseline justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-950">
                QUANTITATIVE STRATEGY TEAR SHEET
              </h1>
              <p className="text-xs font-mono text-slate-600 mt-1">
                Asset: <strong className="text-slate-900">{ticker}</strong> | Benchmark: <strong className="text-slate-900">SPY (S&P 500)</strong> | Sample: <strong className="text-slate-900">{timeframeLabel}</strong>
              </p>
            </div>
            <div className="text-right text-xs font-mono text-slate-500">
              <div>Model: {params.strategyType.toUpperCase()}</div>
              <div>Generated: {new Date().toLocaleDateString()}</div>
            </div>
          </div>

          {/* KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500">CAGR</div>
              <div className="text-xl font-bold font-mono text-emerald-700">+{result.metrics.cagr}%</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500">Sharpe Ratio</div>
              <div className="text-xl font-bold font-mono text-slate-900">{result.metrics.sharpeRatio.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500">Sortino Ratio</div>
              <div className="text-xl font-bold font-mono text-slate-900">{result.metrics.sortinoRatio.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500">Max Drawdown</div>
              <div className="text-xl font-bold font-mono text-rose-600">-{result.metrics.maxDrawdownPct.toFixed(1)}%</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500">Win Rate</div>
              <div className="text-xl font-bold font-mono text-slate-900">{result.metrics.winRatePct.toFixed(1)}%</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500">Profit Factor</div>
              <div className="text-xl font-bold font-mono text-emerald-700">{result.metrics.profitFactor.toFixed(2)}</div>
            </div>
          </div>

          {/* Tables Row 1: Return & Risk Analytics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            <div className="border border-slate-200 rounded-lg p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3 pb-1 border-b border-slate-200">
                Performance & Returns
              </h3>
              <table className="w-full text-xs font-mono tabular-nums">
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-1 text-slate-600">Total Net Return</td>
                    <td className="py-1 text-right font-bold text-emerald-700">+{result.metrics.totalReturnPct.toLocaleString()}%</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-slate-600">Benchmark Return (SPY)</td>
                    <td className="py-1 text-right font-medium">+{result.metrics.benchmarkReturnPct.toLocaleString()}%</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-slate-600">Annualized Volatility</td>
                    <td className="py-1 text-right font-medium">{result.metrics.annualizedVol.toFixed(2)}%</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-slate-600">Benchmark Volatility</td>
                    <td className="py-1 text-right font-medium">{result.metrics.benchmarkVol.toFixed(2)}%</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-slate-600">Calmar Ratio</td>
                    <td className="py-1 text-right font-medium">{result.metrics.calmarRatio.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-slate-600">Market Exposure Time</td>
                    <td className="py-1 text-right font-medium">{result.metrics.exposureTimePct.toFixed(1)}%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="border border-slate-200 rounded-lg p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3 pb-1 border-b border-slate-200">
                Risk & Factor Attributions
              </h3>
              <table className="w-full text-xs font-mono tabular-nums">
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-1 text-slate-600">Jensen's Alpha (α)</td>
                    <td className="py-1 text-right font-bold text-slate-900">{result.metrics.alpha >= 0 ? '+' : ''}{result.metrics.alpha.toFixed(2)}%</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-slate-600">Portfolio Beta (β)</td>
                    <td className="py-1 text-right font-medium">{result.metrics.beta.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-slate-600">Daily VaR (95%)</td>
                    <td className="py-1 text-right font-medium text-amber-700">-{result.metrics.var95.toFixed(2)}%</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-slate-600">Expected Shortfall (CVaR)</td>
                    <td className="py-1 text-right font-medium text-rose-700">-{result.metrics.cvar95.toFixed(2)}%</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-slate-600">Max DD Duration</td>
                    <td className="py-1 text-right font-medium">{result.metrics.maxDrawdownDays} trading days</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-slate-600">Total Commissions & Fees</td>
                    <td className="py-1 text-right font-medium">${result.metrics.totalFees.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Tables Row 2: Strategy Parameters & Trade Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            <div className="border border-slate-200 rounded-lg p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3 pb-1 border-b border-slate-200">
                Risk Management Specifications
              </h3>
              <table className="w-full text-xs font-mono">
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-1 text-slate-600">Initial Capital</td>
                    <td className="py-1 text-right font-medium">${params.initialCapital.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-slate-600">Position Sizing</td>
                    <td className="py-1 text-right font-medium">{params.positionSizingType} ({params.positionSizeValue}%)</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-slate-600">Direction & Leverage</td>
                    <td className="py-1 text-right font-medium">{params.direction.replace('_', ' ')} • {params.leverage}x</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-slate-600">Stop Loss / Take Profit</td>
                    <td className="py-1 text-right font-medium">{params.stopLossPct ? `${params.stopLossPct}%` : 'Off'} / {params.takeProfitPct ? `${params.takeProfitPct}%` : 'Off'}</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-slate-600">Trailing Stop Safeguard</td>
                    <td className="py-1 text-right font-medium">{params.trailingStopPct ? `${params.trailingStopPct}%` : 'Off'}</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-slate-600">Max DD Circuit Breaker</td>
                    <td className="py-1 text-right font-medium">{params.circuitBreakerMaxDDPct ? `${params.circuitBreakerMaxDDPct}%` : 'Off'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="border border-slate-200 rounded-lg p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3 pb-1 border-b border-slate-200">
                Trade Execution Distributions
              </h3>
              <table className="w-full text-xs font-mono tabular-nums">
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-1 text-slate-600">Total Round-Trips</td>
                    <td className="py-1 text-right font-medium">{result.metrics.totalTrades}</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-slate-600">Winning Trades</td>
                    <td className="py-1 text-right font-medium text-emerald-700">{result.metrics.winningTrades} ({result.metrics.winRatePct.toFixed(1)}%)</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-slate-600">Losing Trades</td>
                    <td className="py-1 text-right font-medium text-rose-700">{result.metrics.losingTrades}</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-slate-600">Average Win / Average Loss</td>
                    <td className="py-1 text-right font-medium">+{result.metrics.avgWinPct.toFixed(2)}% / -{result.metrics.avgLossPct.toFixed(2)}%</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-slate-600">Win / Loss Ratio</td>
                    <td className="py-1 text-right font-medium">{result.metrics.winLossRatio.toFixed(2)}:1</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-slate-600">Best / Worst Single Trade</td>
                    <td className="py-1 text-right font-medium">+{result.metrics.bestTradePct.toFixed(1)}% / {result.metrics.worstTradePct.toFixed(1)}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer Disclosure */}
          <div className="pt-4 border-t border-slate-200 text-[10px] text-slate-500 font-mono text-center">
            CONFIDENTIAL QUANTITATIVE TEAR SHEET — Generated via QuantBacktest Pro. Past performance does not guarantee future results.
          </div>
        </div>
      </div>
    </div>
  );
};
