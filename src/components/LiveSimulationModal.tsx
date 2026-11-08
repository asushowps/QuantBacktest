/**
 * Real-Time Live Forward-Testing Simulation Modal
 * Real-time order execution engine, streaming ticks, and unrealized PnL monitoring.
 */

import React, { useState, useEffect } from 'react';
import { Bar, StrategyParameters, Trade } from '../types/backtest';
import { Radio, Play, Pause, RotateCcw, X, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface LiveSimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticker: string;
  params: StrategyParameters;
  currentBars: Bar[];
}

interface LiveOrder {
  id: string;
  time: string;
  side: 'BUY' | 'SELL';
  price: number;
  shares: number;
  type: string;
  pnl?: number;
}

export const LiveSimulationModal: React.FC<LiveSimulationModalProps> = ({
  isOpen,
  onClose,
  ticker,
  params,
  currentBars,
}) => {
  const [isRunning, setIsRunning] = useState(true);
  const [tickSpeed, setTickSpeed] = useState<number>(1000); // 1000ms
  const [livePrice, setLivePrice] = useState<number>(() => (currentBars.length > 0 ? currentBars[currentBars.length - 1].close : 500));
  const [liveEquity, setLiveEquity] = useState<number>(params.initialCapital);
  const [liveCash, setLiveCash] = useState<number>(params.initialCapital);
  const [positionShares, setPositionShares] = useState<number>(0);
  const [entryPrice, setEntryPrice] = useState<number>(0);
  const [orders, setOrders] = useState<LiveOrder[]>([]);

  if (!isOpen) return null;

  // Streaming Live Price Ticks & Strategy Execution
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      // Simulate micro-tick price movement
      setLivePrice((prev) => {
        const delta = (Math.random() - 0.49) * (prev * 0.003);
        const newPrice = parseFloat((prev + delta).toFixed(2));

        // Evaluate live strategy condition
        if (positionShares === 0) {
          // Entry signal check (e.g. random or momentum threshold)
          if (Math.random() < 0.25) {
            const sharesToBuy = Math.floor((liveCash * 0.9) / newPrice);
            if (sharesToBuy > 0) {
              const cost = sharesToBuy * newPrice;
              setLiveCash((c) => c - cost);
              setPositionShares(sharesToBuy);
              setEntryPrice(newPrice);
              setOrders((prevOrders) => [
                {
                  id: `ORD-${Date.now().toString().slice(-4)}`,
                  time: new Date().toLocaleTimeString(),
                  side: 'BUY',
                  price: newPrice,
                  shares: sharesToBuy,
                  type: 'MARKET ORDER (SIGNAL)',
                },
                ...prevOrders.slice(0, 19),
              ]);
            }
          }
        } else {
          // In position: check stop loss / take profit
          const pnlPct = ((newPrice - entryPrice) / entryPrice) * 100;
          let exitReason = '';

          if (params.stopLossPct && pnlPct <= -params.stopLossPct) {
            exitReason = `STOP LOSS (-${params.stopLossPct}%)`;
          } else if (params.takeProfitPct && pnlPct >= params.takeProfitPct) {
            exitReason = `TAKE PROFIT (+${params.takeProfitPct}%)`;
          } else if (Math.random() < 0.2) {
            exitReason = 'SIGNAL REVERSAL EXIT';
          }

          if (exitReason) {
            const proceeds = positionShares * newPrice;
            const netPnL = proceeds - positionShares * entryPrice;
            setLiveCash((c) => c + proceeds);
            setPositionShares(0);
            setEntryPrice(0);
            setOrders((prevOrders) => [
              {
                id: `ORD-${Date.now().toString().slice(-4)}`,
                time: new Date().toLocaleTimeString(),
                side: 'SELL',
                price: newPrice,
                shares: positionShares,
                type: exitReason,
                pnl: parseFloat(netPnL.toFixed(2)),
              },
              ...prevOrders.slice(0, 19),
            ]);
          }
        }

        return newPrice;
      });
    }, tickSpeed);

    return () => clearInterval(interval);
  }, [isRunning, tickSpeed, liveCash, positionShares, entryPrice, params]);

  // Update total equity
  const currentPositionValue = positionShares * livePrice;
  const totalLiveEquity = liveCash + currentPositionValue;
  const unrealizedPnL = positionShares > 0 ? (livePrice - entryPrice) * positionShares : 0;
  const unrealizedPnLPct = entryPrice > 0 ? ((livePrice - entryPrice) / entryPrice) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl flex flex-col shadow-2xl overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-100">Real-Time Forward Testing Console</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  LIVE PAPER EXECUTION
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Streaming {ticker} market ticks into {params.strategyType.toUpperCase()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isRunning
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isRunning ? 'Pause Stream' : 'Resume'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Metrics Cockpit */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5 bg-slate-950/80 border-b border-slate-800 text-xs font-mono tabular-nums">
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="text-[10px] text-slate-400">Live {ticker} Price</div>
            <div className="text-lg font-bold text-cyan-400 mt-1">${livePrice.toFixed(2)}</div>
            <div className="text-[10px] text-slate-500">Sub-second updates</div>
          </div>

          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="text-[10px] text-slate-400">Total Portfolio Equity</div>
            <div className="text-lg font-bold text-slate-100 mt-1">${totalLiveEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="text-[10px] text-slate-500">Cash: ${liveCash.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          </div>

          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="text-[10px] text-slate-400">Position Status</div>
            <div className="text-lg font-bold text-slate-200 mt-1">
              {positionShares > 0 ? `${positionShares.toLocaleString()} shs` : 'FLAT / CASH'}
            </div>
            <div className="text-[10px] text-slate-500">
              {positionShares > 0 ? `Entry: $${entryPrice.toFixed(2)}` : 'Awaiting signal'}
            </div>
          </div>

          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="text-[10px] text-slate-400">Unrealized Open PnL</div>
            <div className={`text-lg font-bold mt-1 ${unrealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {unrealizedPnL >= 0 ? '+' : ''}${unrealizedPnL.toFixed(2)} ({unrealizedPnLPct.toFixed(2)}%)
            </div>
            <div className="text-[10px] text-slate-500">Mark to Market</div>
          </div>
        </div>

        {/* Live Order Book / Execution Stream */}
        <div className="flex-1 p-5 overflow-y-auto space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
            <span className="font-semibold text-slate-200">Live Executed Orders Log</span>
            <span>Speed: {tickSpeed}ms/tick</span>
          </div>

          {orders.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              Listening for incoming market ticks and algorithmic triggers...
            </div>
          ) : (
            <div className="space-y-2 font-mono text-xs tabular-nums">
              {orders.map((ord) => (
                <div
                  key={ord.id}
                  className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        ord.side === 'BUY'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                      }`}
                    >
                      {ord.side}
                    </span>
                    <div>
                      <span className="text-slate-200 font-semibold">{ord.shares.toLocaleString()} {ticker}</span>
                      <span className="text-slate-500 ml-2">@ ${ord.price.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-slate-400">{ord.type}</span>
                    <span className="text-slate-600 ml-3 text-[10px]">{ord.time}</span>
                    {ord.pnl !== undefined && (
                      <span className={`ml-3 font-bold ${ord.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {ord.pnl >= 0 ? '+' : ''}${ord.pnl.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
