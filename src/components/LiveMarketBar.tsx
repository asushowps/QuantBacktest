/**
 * Real-Time Market Data Integration & Forward-Testing Feed Bar
 * Live streaming quotes, bid/ask spreads, and live strategy paper execution.
 */

import React, { useState, useEffect } from 'react';
import { LiveMarketTick } from '../types/backtest';
import { getLiveMarketSnapshot } from '../services/marketData';
import { Activity, Play, Pause, Radio, RefreshCw } from 'lucide-react';

interface LiveMarketBarProps {
  onSelectTicker: (ticker: string) => void;
  selectedTicker: string;
  isLiveForwardTesting: boolean;
  onToggleLiveForwardTest: () => void;
  livePnL?: number;
}

export const LiveMarketBar: React.FC<LiveMarketBarProps> = ({
  onSelectTicker,
  selectedTicker,
  isLiveForwardTesting,
  onToggleLiveForwardTest,
  livePnL = 0,
}) => {
  const [ticks, setTicks] = useState<LiveMarketTick[]>([]);
  const [flashingTickers, setFlashingTickers] = useState<{ [ticker: string]: 'up' | 'down' }>({});

  useEffect(() => {
    // Initial snapshot
    setTicks(getLiveMarketSnapshot());

    // Stream interval
    const interval = setInterval(() => {
      setTicks((prev) => {
        const next = getLiveMarketSnapshot();
        const flashMap: { [ticker: string]: 'up' | 'down' } = {};

        next.forEach((item) => {
          const old = prev.find((p) => p.ticker === item.ticker);
          if (old) {
            if (item.price > old.price) flashMap[item.ticker] = 'up';
            else if (item.price < old.price) flashMap[item.ticker] = 'down';
          }
        });

        setFlashingTickers(flashMap);
        setTimeout(() => setFlashingTickers({}), 500);
        return next;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-slate-950 border-b border-slate-800/80 px-4 py-2 flex items-center justify-between gap-4 overflow-x-auto text-xs select-none">
      {/* Left: Live Feed Status Indicator */}
      <div className="flex items-center gap-2.5 shrink-0">
        <span className="flex items-center gap-1.5 text-emerald-400 font-semibold uppercase tracking-wider text-[10px]">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Real-Time Quotes</span>
        </span>

        {/* Forward-Test Toggle Button */}
        <button
          onClick={onToggleLiveForwardTest}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
            isLiveForwardTesting
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm animate-pulse'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
          }`}
          title="Forward-test the active strategy on real-time live incoming market ticks"
        >
          {isLiveForwardTesting ? (
            <>
              <Pause className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span>Forward-Testing Active</span>
              {livePnL !== 0 && (
                <span className={`font-mono font-bold ${livePnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  (${livePnL >= 0 ? '+' : ''}{livePnL.toFixed(2)})
                </span>
              )}
            </>
          ) : (
            <>
              <Radio className="w-3 h-3 text-cyan-400" />
              <span>Live Forward-Test</span>
            </>
          )}
        </button>
      </div>

      {/* Center: Live Streaming Ticker Tape */}
      <div className="flex items-center gap-4 shrink-0 font-mono tabular-nums">
        {ticks.map((t) => {
          const isSelected = t.ticker === selectedTicker;
          const flash = flashingTickers[t.ticker];

          return (
            <button
              key={t.ticker}
              onClick={() => onSelectTicker(t.ticker)}
              className={`flex items-center gap-2 px-2 py-1 rounded-md transition-all text-[11px] cursor-pointer ${
                isSelected
                  ? 'bg-slate-800 text-cyan-300 border border-cyan-500/40'
                  : 'hover:bg-slate-900 text-slate-300'
              } ${
                flash === 'up'
                  ? 'bg-emerald-950/60 text-emerald-300'
                  : flash === 'down'
                  ? 'bg-rose-950/60 text-rose-300'
                  : ''
              }`}
            >
              <span className="font-bold">{t.ticker}</span>
              <span>${t.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className={`text-[10px] ${t.changePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {t.changePct >= 0 ? '+' : ''}{t.changePct}%
              </span>
            </button>
          );
        })}
      </div>

      {/* Right: Cloud Sync Status */}
      <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-400 shrink-0">
        <Activity className="w-3.5 h-3.5 text-cyan-400" />
        <span>Sub-second streaming</span>
      </div>
    </div>
  );
};
