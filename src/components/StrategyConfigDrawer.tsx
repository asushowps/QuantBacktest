/**
 * Strategy Configuration & Risk Management Drawer
 * Fully customizable parameters for capital, position sizing, execution costs,
 * stop losses, trailing safeguards, and algorithmic models.
 */

import React from 'react';
import { StrategyParameters, StrategyType, PositionSizingType, TradingDirection } from '../types/backtest';
import { Sliders, ShieldAlert, DollarSign, Percent, Code, CheckCircle, RefreshCcw } from 'lucide-react';

interface StrategyConfigDrawerProps {
  params: StrategyParameters;
  onChangeParams: (newParams: StrategyParameters) => void;
  onOpenPythonEditor: () => void;
  onResetToDefaults: () => void;
}

export const StrategyConfigDrawer: React.FC<StrategyConfigDrawerProps> = ({
  params,
  onChangeParams,
  onOpenPythonEditor,
  onResetToDefaults,
}) => {
  const updateField = <K extends keyof StrategyParameters>(key: K, value: StrategyParameters[K]) => {
    onChangeParams({
      ...params,
      [key]: value,
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-5 text-xs text-slate-300 shadow-lg">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-slate-100">Trading & Risk Parameters</h3>
        </div>
        <button
          onClick={onResetToDefaults}
          className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
          title="Reset to default institutional configuration"
        >
          <RefreshCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      {/* 1. Algorithmic Strategy Selection */}
      <div className="flex flex-col gap-2">
        <label className="text-[11px] font-semibold text-slate-200 uppercase tracking-wider">
          Algorithmic Model
        </label>
        <select
          value={params.strategyType}
          onChange={(e) => updateField('strategyType', e.target.value as StrategyType)}
          className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-cyan-500 font-medium"
        >
          <option value="sma_crossover">SMA Crossover (Golden Cross / Death Cross)</option>
          <option value="rsi_reversal">RSI Mean Reversion (Oversold/Overbought)</option>
          <option value="bollinger_bands">Bollinger Bands (Breakout / Reversion)</option>
          <option value="donchian_breakout">Donchian Channel Breakout (Turtle Rules)</option>
          <option value="macd_crossover">MACD Momentum Crossover</option>
          <option value="supertrend">SuperTrend Volatility Trend Following</option>
          <option value="buy_and_hold">Passive Buy & Hold (Benchmark)</option>
          <option value="custom_python">Custom Python Algorithmic Model (Pyodide)</option>
        </select>

        {params.strategyType === 'custom_python' && (
          <button
            onClick={onOpenPythonEditor}
            className="mt-1 flex items-center justify-center gap-2 py-2 px-3 bg-gradient-to-r from-cyan-600/30 to-blue-600/30 border border-cyan-500/50 hover:border-cyan-400 rounded-lg text-cyan-300 font-medium transition-all"
          >
            <Code className="w-3.5 h-3.5" />
            <span>Open Python Code Editor</span>
          </button>
        )}
      </div>

      {/* Strategy-Specific Fine Tuning */}
      {params.strategyType === 'sma_crossover' && (
        <div className="grid grid-cols-2 gap-2 p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg">
          <div>
            <label className="text-[10px] text-slate-400">Fast SMA Period</label>
            <input
              type="number"
              min={2}
              max={200}
              value={params.smaFastPeriod}
              onChange={(e) => updateField('smaFastPeriod', parseInt(e.target.value) || 20)}
              className="mt-1 w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-400">Slow SMA Period</label>
            <input
              type="number"
              min={10}
              max={500}
              value={params.smaSlowPeriod}
              onChange={(e) => updateField('smaSlowPeriod', parseInt(e.target.value) || 200)}
              className="mt-1 w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono"
            />
          </div>
        </div>
      )}

      {params.strategyType === 'rsi_reversal' && (
        <div className="grid grid-cols-3 gap-2 p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg">
          <div>
            <label className="text-[10px] text-slate-400">RSI Period</label>
            <input
              type="number"
              min={2}
              max={50}
              value={params.rsiPeriod}
              onChange={(e) => updateField('rsiPeriod', parseInt(e.target.value) || 14)}
              className="mt-1 w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-400">Oversold (Buy)</label>
            <input
              type="number"
              min={5}
              max={50}
              value={params.rsiOversold}
              onChange={(e) => updateField('rsiOversold', parseInt(e.target.value) || 30)}
              className="mt-1 w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-400">Overbought (Sell)</label>
            <input
              type="number"
              min={50}
              max={95}
              value={params.rsiOverbought}
              onChange={(e) => updateField('rsiOverbought', parseInt(e.target.value) || 70)}
              className="mt-1 w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono"
            />
          </div>
        </div>
      )}

      {params.strategyType === 'bollinger_bands' && (
        <div className="grid grid-cols-3 gap-2 p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg">
          <div>
            <label className="text-[10px] text-slate-400">Period</label>
            <input
              type="number"
              min={5}
              max={100}
              value={params.bbPeriod}
              onChange={(e) => updateField('bbPeriod', parseInt(e.target.value) || 20)}
              className="mt-1 w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-400">Std Dev Multiplier</label>
            <input
              type="number"
              step={0.1}
              min={1}
              max={4}
              value={params.bbStdDev}
              onChange={(e) => updateField('bbStdDev', parseFloat(e.target.value) || 2.0)}
              className="mt-1 w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-400">Mode</label>
            <select
              value={params.bbMode}
              onChange={(e) => updateField('bbMode', e.target.value as 'breakout' | 'mean_reversion')}
              className="mt-1 w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
            >
              <option value="breakout">Breakout</option>
              <option value="mean_reversion">Reversion</option>
            </select>
          </div>
        </div>
      )}

      {/* 2. Capital, Commission & Slippage */}
      <div className="space-y-3">
        <label className="text-[11px] font-semibold text-slate-200 uppercase tracking-wider">
          Capital & Execution Costs
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-slate-400">Initial Capital ($)</label>
            <input
              type="number"
              step={5000}
              min={1000}
              value={params.initialCapital}
              onChange={(e) => updateField('initialCapital', parseFloat(e.target.value) || 100000)}
              className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 font-mono tabular-nums"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-400">Slippage (Bps)</label>
            <input
              type="number"
              step={1}
              min={0}
              max={100}
              value={params.slippageBps}
              onChange={(e) => updateField('slippageBps', parseFloat(e.target.value) || 0)}
              className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 font-mono tabular-nums"
              title="1 basis point = 0.01%"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-400">Commission (Bps)</label>
            <input
              type="number"
              step={0.5}
              min={0}
              max={50}
              value={params.commissionBps}
              onChange={(e) => updateField('commissionBps', parseFloat(e.target.value) || 0)}
              className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 font-mono tabular-nums"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-400">Flat Fee / Order ($)</label>
            <input
              type="number"
              step={0.5}
              min={0}
              max={20}
              value={params.commissionFlat}
              onChange={(e) => updateField('commissionFlat', parseFloat(e.target.value) || 0)}
              className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 font-mono tabular-nums"
            />
          </div>
        </div>
      </div>

      {/* 3. Position Sizing & Leverage */}
      <div className="space-y-3">
        <label className="text-[11px] font-semibold text-slate-200 uppercase tracking-wider">
          Position Sizing & Margin
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-slate-400">Sizing Algorithm</label>
            <select
              value={params.positionSizingType}
              onChange={(e) => updateField('positionSizingType', e.target.value as PositionSizingType)}
              className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-100 text-xs"
            >
              <option value="pct_equity">% of Current Equity</option>
              <option value="fixed_amount">Fixed Dollar Amount</option>
              <option value="risk_parity">Risk Parity (1.5% ATR)</option>
              <option value="kelly">Fractional Kelly Criterion</option>
              <option value="fixed_shares">Fixed Share Count</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-400">
              {params.positionSizingType === 'pct_equity'
                ? 'Allocation (% Equity)'
                : params.positionSizingType === 'fixed_amount'
                ? 'Target Dollar ($)'
                : 'Multiplier / Size'}
            </label>
            <input
              type="number"
              step={5}
              min={1}
              value={params.positionSizeValue}
              onChange={(e) => updateField('positionSizeValue', parseFloat(e.target.value) || 25)}
              className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 font-mono"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-400">Trading Direction</label>
            <select
              value={params.direction}
              onChange={(e) => updateField('direction', e.target.value as TradingDirection)}
              className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-100 text-xs"
            >
              <option value="long_only">Long Only (Cash / Long)</option>
              <option value="both">Long & Short (Bi-directional)</option>
              <option value="short_only">Short Only</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-400">Leverage Factor</label>
            <select
              value={params.leverage}
              onChange={(e) => updateField('leverage', parseFloat(e.target.value) || 1.0)}
              className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-100 text-xs font-mono"
            >
              <option value={1.0}>1.0x (No Leverage / Cash)</option>
              <option value={1.5}>1.5x (Reg-T Margin)</option>
              <option value={2.0}>2.0x (2x Leveraged ETF)</option>
              <option value={3.0}>3.0x (3x Aggressive)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Quantitative Risk Management & Circuit Breakers */}
      <div className="space-y-3 pt-2 border-t border-slate-800">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-400 uppercase tracking-wider">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Risk Management Safeguards</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Stop Loss */}
          <div>
            <label className="text-[10px] text-slate-400 flex items-center justify-between">
              <span>Stop Loss (%)</span>
              <span className="text-slate-500">{params.stopLossPct ? `${params.stopLossPct}%` : 'Off'}</span>
            </label>
            <input
              type="number"
              step={0.5}
              min={0}
              max={50}
              placeholder="e.g. 8.0"
              value={params.stopLossPct ?? ''}
              onChange={(e) => updateField('stopLossPct', e.target.value ? parseFloat(e.target.value) : null)}
              className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 font-mono"
            />
          </div>

          {/* Take Profit */}
          <div>
            <label className="text-[10px] text-slate-400 flex items-center justify-between">
              <span>Take Profit (%)</span>
              <span className="text-slate-500">{params.takeProfitPct ? `${params.takeProfitPct}%` : 'Off'}</span>
            </label>
            <input
              type="number"
              step={1}
              min={0}
              max={200}
              placeholder="e.g. 20.0"
              value={params.takeProfitPct ?? ''}
              onChange={(e) => updateField('takeProfitPct', e.target.value ? parseFloat(e.target.value) : null)}
              className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 font-mono"
            />
          </div>

          {/* Trailing Stop */}
          <div>
            <label className="text-[10px] text-slate-400 flex items-center justify-between">
              <span>Trailing Stop (%)</span>
              <span className="text-slate-500">{params.trailingStopPct ? `${params.trailingStopPct}%` : 'Off'}</span>
            </label>
            <input
              type="number"
              step={0.5}
              min={0}
              max={50}
              placeholder="e.g. 12.0"
              value={params.trailingStopPct ?? ''}
              onChange={(e) => updateField('trailingStopPct', e.target.value ? parseFloat(e.target.value) : null)}
              className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 font-mono"
            />
          </div>

          {/* Max DD Circuit Breaker */}
          <div>
            <label className="text-[10px] text-slate-400 flex items-center justify-between">
              <span>Max DD Circuit Breaker (%)</span>
              <span className="text-slate-500">{params.circuitBreakerMaxDDPct ? `${params.circuitBreakerMaxDDPct}%` : 'Off'}</span>
            </label>
            <input
              type="number"
              step={1}
              min={0}
              max={60}
              placeholder="e.g. 25.0"
              value={params.circuitBreakerMaxDDPct ?? ''}
              onChange={(e) => updateField('circuitBreakerMaxDDPct', e.target.value ? parseFloat(e.target.value) : null)}
              className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 font-mono"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
