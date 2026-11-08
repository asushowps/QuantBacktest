/**
 * High-Performance Interactive Canvas Financial Chart
 * Supports Equity Curve vs Benchmark, Candlestick/Price with Indicator Overlays & Trade Markers,
 * Underwater Drawdown, and Rolling Risk Analytics with Crosshair & Touch Scrubbing.
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { DailyEquityPoint, Trade, Bar } from '../types/backtest';
import { calculateRollingSharpe } from '../services/indicators';

interface InteractiveChartProps {
  equityCurve: DailyEquityPoint[];
  trades: Trade[];
  bars: Bar[];
  ticker: string;
  customIndicator?: { name: string; values: (number | null)[] };
}

type ChartMode = 'equity' | 'price_execution' | 'underwater' | 'rolling_sharpe';

export const InteractiveChart: React.FC<InteractiveChartProps> = ({
  equityCurve,
  trades,
  bars,
  ticker,
  customIndicator,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [mode, setMode] = useState<ChartMode>('equity');
  const [isLogScale, setIsLogScale] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [showTradesOverlay, setShowTradesOverlay] = useState(true);
  const [showBenchmark, setShowBenchmark] = useState(true);

  // Pre-compute trade map for fast lookup during hover and marker rendering
  const tradeMap = useMemo(() => {
    const map = new Map<string, Trade[]>();
    trades.forEach((t) => {
      const entryList = map.get(t.entryDate) || [];
      entryList.push(t);
      map.set(t.entryDate, entryList);

      const exitList = map.get(t.exitDate) || [];
      exitList.push(t);
      map.set(t.exitDate, exitList);
    });
    return map;
  }, [trades]);

  // Rolling Sharpe calculation for rolling tab
  const rollingSharpe = useMemo(() => {
    if (equityCurve.length === 0) return [];
    const returns = equityCurve.map((e) => e.dailyReturnPct / 100);
    return calculateRollingSharpe(returns, 126);
  }, [equityCurve]);

  // Redraw canvas whenever data, mode, scale, or hover changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || equityCurve.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high-DPI retina display
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clear background
    ctx.fillStyle = '#090d16'; // Deep financial slate
    ctx.fillRect(0, 0, width, height);

    const padLeft = 14;
    const padRight = 68;
    const padTop = 24;
    const padBottom = 28;
    const plotWidth = width - padLeft - padRight;
    const plotHeight = height - padTop - padBottom;

    if (plotWidth <= 0 || plotHeight <= 0) return;

    const n = equityCurve.length;
    const xStep = plotWidth / Math.max(1, n - 1);

    // Draw Subtle Grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    const numYGrid = 5;
    for (let i = 0; i <= numYGrid; i++) {
      const y = padTop + (plotHeight / numYGrid) * i;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(padLeft + plotWidth, y);
      ctx.stroke();
    }

    // Draw X-axis year markers
    ctx.fillStyle = '#64748b';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';

    let lastYearDrawn = -1;
    for (let i = 0; i < n; i += Math.max(1, Math.floor(n / 10))) {
      const date = equityCurve[i].date;
      const year = parseInt(date.substring(0, 4), 10);
      if (year !== lastYearDrawn) {
        lastYearDrawn = year;
        const x = padLeft + i * xStep;
        ctx.fillText(String(year), x, height - 8);
        ctx.strokeStyle = '#1e293b';
        ctx.beginPath();
        ctx.moveTo(x, padTop);
        ctx.lineTo(x, padTop + plotHeight);
        ctx.stroke();
      }
    }

    // -------------------------------------------------------------
    // MODE 1: Equity Curve vs Benchmark
    // -------------------------------------------------------------
    if (mode === 'equity') {
      let minVal = Infinity;
      let maxVal = -Infinity;

      equityCurve.forEach((pt) => {
        const sVal = isLogScale ? Math.log10(Math.max(1, pt.strategyEquity)) : pt.strategyEquity;
        const bVal = isLogScale ? Math.log10(Math.max(1, pt.benchmarkEquity)) : pt.benchmarkEquity;
        minVal = Math.min(minVal, sVal, showBenchmark ? bVal : sVal);
        maxVal = Math.max(maxVal, sVal, showBenchmark ? bVal : sVal);
      });

      const range = maxVal - minVal || 1;
      const getY = (val: number) => {
        const v = isLogScale ? Math.log10(Math.max(1, val)) : val;
        return padTop + plotHeight - ((v - minVal) / range) * plotHeight;
      };

      // Draw Benchmark Line
      if (showBenchmark) {
        ctx.beginPath();
        ctx.strokeStyle = '#475569'; // Muted benchmark gray
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);

        equityCurve.forEach((pt, i) => {
          const x = padLeft + i * xStep;
          const y = getY(pt.benchmarkEquity);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw Strategy Equity Gradient Area Fill
      const grad = ctx.createLinearGradient(0, padTop, 0, padTop + plotHeight);
      grad.addColorStop(0, 'rgba(16, 185, 129, 0.28)'); // Emerald top
      grad.addColorStop(1, 'rgba(16, 185, 129, 0.01)');

      ctx.beginPath();
      equityCurve.forEach((pt, i) => {
        const x = padLeft + i * xStep;
        const y = getY(pt.strategyEquity);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.lineTo(padLeft + plotWidth, padTop + plotHeight);
      ctx.lineTo(padLeft, padTop + plotHeight);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // Draw Strategy Line
      ctx.beginPath();
      ctx.strokeStyle = '#10b981'; // Vibrant emerald
      ctx.lineWidth = 2;
      equityCurve.forEach((pt, i) => {
        const x = padLeft + i * xStep;
        const y = getY(pt.strategyEquity);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Right Y-axis labels
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';

      for (let i = 0; i <= numYGrid; i++) {
        const frac = 1 - i / numYGrid;
        const val = minVal + frac * range;
        const rawVal = isLogScale ? Math.pow(10, val) : val;
        const y = padTop + (plotHeight / numYGrid) * i;
        ctx.fillText(`$${formatKMB(rawVal)}`, padLeft + plotWidth + 6, y + 3);
      }
    }

    // -------------------------------------------------------------
    // MODE 2: Price Candlestick & Trade Execution Markers
    // -------------------------------------------------------------
    else if (mode === 'price_execution') {
      let minPrice = Infinity;
      let maxPrice = -Infinity;

      bars.forEach((b) => {
        const lo = isLogScale ? Math.log10(Math.max(0.01, b.low)) : b.low;
        const hi = isLogScale ? Math.log10(Math.max(0.01, b.high)) : b.high;
        if (lo < minPrice) minPrice = lo;
        if (hi > maxPrice) maxPrice = hi;
      });

      const priceRange = maxPrice - minPrice || 1;
      const getPriceY = (price: number) => {
        const p = isLogScale ? Math.log10(Math.max(0.01, price)) : price;
        return padTop + plotHeight - ((p - minPrice) / priceRange) * plotHeight;
      };

      // Draw Custom Indicator Overlay if available (e.g. SMA/Bollinger)
      if (customIndicator && customIndicator.values.length === n) {
        ctx.beginPath();
        ctx.strokeStyle = '#f59e0b'; // Amber indicator line
        ctx.lineWidth = 1.5;
        let started = false;

        customIndicator.values.forEach((v, i) => {
          if (v !== null && v > 0) {
            const x = padLeft + i * xStep;
            const y = getPriceY(v);
            if (!started) {
              ctx.moveTo(x, y);
              started = true;
            } else {
              ctx.lineTo(x, y);
            }
          }
        });
        ctx.stroke();
      }

      // Draw Price Line / Candlesticks
      ctx.beginPath();
      ctx.strokeStyle = '#38bdf8'; // Sky blue price line
      ctx.lineWidth = 1.5;

      bars.forEach((b, i) => {
        const x = padLeft + i * xStep;
        const y = getPriceY(b.close);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Draw Trade Markers (Green Up Arrow for Entry, Red Down Arrow for Exit)
      if (showTradesOverlay) {
        trades.forEach((t) => {
          // Find bar index for entry
          const entryIdx = bars.findIndex((b) => b.date === t.entryDate);
          if (entryIdx >= 0) {
            const x = padLeft + entryIdx * xStep;
            const y = getPriceY(t.entryPrice);
            // Buy Triangle
            ctx.fillStyle = '#10b981';
            ctx.beginPath();
            ctx.moveTo(x, y + 6);
            ctx.lineTo(x - 4, y + 14);
            ctx.lineTo(x + 4, y + 14);
            ctx.closePath();
            ctx.fill();
          }

          // Find bar index for exit
          const exitIdx = bars.findIndex((b) => b.date === t.exitDate);
          if (exitIdx >= 0) {
            const x = padLeft + exitIdx * xStep;
            const y = getPriceY(t.exitPrice);
            // Sell Triangle
            ctx.fillStyle = t.returnPct >= 0 ? '#10b981' : '#ef4444';
            ctx.beginPath();
            ctx.moveTo(x, y - 6);
            ctx.lineTo(x - 4, y - 14);
            ctx.lineTo(x + 4, y - 14);
            ctx.closePath();
            ctx.fill();
          }
        });
      }

      // Right Y-axis
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';

      for (let i = 0; i <= numYGrid; i++) {
        const frac = 1 - i / numYGrid;
        const val = minPrice + frac * priceRange;
        const rawVal = isLogScale ? Math.pow(10, val) : val;
        const y = padTop + (plotHeight / numYGrid) * i;
        ctx.fillText(`$${formatKMB(rawVal)}`, padLeft + plotWidth + 6, y + 3);
      }
    }

    // -------------------------------------------------------------
    // MODE 3: Underwater Drawdown Chart
    // -------------------------------------------------------------
    else if (mode === 'underwater') {
      const maxDD = Math.max(60, Math.max(...equityCurve.map((e) => Math.max(e.drawdownPct, e.benchmarkDrawdownPct))));
      const getDdY = (dd: number) => padTop + (dd / maxDD) * plotHeight;

      // Benchmark drawdown line
      if (showBenchmark) {
        ctx.beginPath();
        ctx.strokeStyle = '#475569';
        ctx.setLineDash([3, 3]);
        equityCurve.forEach((pt, i) => {
          const x = padLeft + i * xStep;
          const y = getDdY(pt.benchmarkDrawdownPct);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Strategy drawdown gradient
      const gradDD = ctx.createLinearGradient(0, padTop, 0, padTop + plotHeight);
      gradDD.addColorStop(0, 'rgba(239, 68, 68, 0.05)');
      gradDD.addColorStop(1, 'rgba(239, 68, 68, 0.45)');

      ctx.beginPath();
      ctx.moveTo(padLeft, padTop);
      equityCurve.forEach((pt, i) => {
        const x = padLeft + i * xStep;
        const y = getDdY(pt.drawdownPct);
        ctx.lineTo(x, y);
      });
      ctx.lineTo(padLeft + plotWidth, padTop);
      ctx.closePath();
      ctx.fillStyle = gradDD;
      ctx.fill();

      // Strategy drawdown outline
      ctx.beginPath();
      ctx.strokeStyle = '#ef4444'; // Red
      ctx.lineWidth = 1.5;
      equityCurve.forEach((pt, i) => {
        const x = padLeft + i * xStep;
        const y = getDdY(pt.drawdownPct);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Right axis
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';

      for (let i = 0; i <= numYGrid; i++) {
        const ddVal = (maxDD / numYGrid) * i;
        const y = padTop + (plotHeight / numYGrid) * i;
        ctx.fillText(`-${ddVal.toFixed(0)}%`, padLeft + plotWidth + 6, y + 3);
      }
    }

    // -------------------------------------------------------------
    // MODE 4: Rolling Sharpe Ratio
    // -------------------------------------------------------------
    else if (mode === 'rolling_sharpe') {
      const validSharpe = rollingSharpe.filter((s) => s !== null) as number[];
      const minS = Math.min(-1, Math.min(...validSharpe, -1));
      const maxS = Math.max(3, Math.max(...validSharpe, 3));
      const sRange = maxS - minS || 1;

      const getSy = (s: number) => padTop + plotHeight - ((s - minS) / sRange) * plotHeight;

      // Draw Zero Line
      const zeroY = getSy(0);
      ctx.strokeStyle = '#475569';
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(padLeft, zeroY);
      ctx.lineTo(padLeft + plotWidth, zeroY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw Rolling Sharpe
      ctx.beginPath();
      ctx.strokeStyle = '#a855f7'; // Purple
      ctx.lineWidth = 2;
      let started = false;

      rollingSharpe.forEach((val, i) => {
        if (val !== null) {
          const x = padLeft + i * xStep;
          const y = getSy(val);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      ctx.stroke();

      // Right axis
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';

      for (let i = 0; i <= numYGrid; i++) {
        const val = maxS - (sRange / numYGrid) * i;
        const y = padTop + (plotHeight / numYGrid) * i;
        ctx.fillText(val.toFixed(1), padLeft + plotWidth + 6, y + 3);
      }
    }

    // -------------------------------------------------------------
    // Draw Crosshair & Hover Tooltip
    // -------------------------------------------------------------
    if (hoverIndex !== null && hoverIndex >= 0 && hoverIndex < n) {
      const hoverX = padLeft + hoverIndex * xStep;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(hoverX, padTop);
      ctx.lineTo(hoverX, padTop + plotHeight);
      ctx.stroke();
      ctx.setLineDash([]);

      // Highlight point on curve
      const pt = equityCurve[hoverIndex];
      let focusY = padTop + plotHeight / 2;

      if (mode === 'equity') {
        const sVal = isLogScale ? Math.log10(Math.max(1, pt.strategyEquity)) : pt.strategyEquity;
        const minVal = isLogScale
          ? Math.log10(Math.max(1, equityCurve[0].strategyEquity)) * 0.8
          : Math.min(...equityCurve.map((e) => e.strategyEquity)) * 0.9;
        const maxVal = isLogScale
          ? Math.log10(Math.max(1, Math.max(...equityCurve.map((e) => e.strategyEquity)))) * 1.05
          : Math.max(...equityCurve.map((e) => e.strategyEquity)) * 1.05;
        const range = maxVal - minVal || 1;
        focusY = padTop + plotHeight - ((sVal - minVal) / range) * plotHeight;
      }

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(hoverX, Math.max(padTop + 4, Math.min(padTop + plotHeight - 4, focusY)), 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [equityCurve, bars, mode, isLogScale, hoverIndex, showTradesOverlay, showBenchmark, customIndicator, rollingSharpe]);

  // Mouse / Touch Move Scrubbing Handler
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || equityCurve.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const padLeft = 14;
    const padRight = 68;
    const plotWidth = canvas.clientWidth - padLeft - padRight;

    if (x >= padLeft && x <= padLeft + plotWidth) {
      const fraction = (x - padLeft) / plotWidth;
      const index = Math.round(fraction * (equityCurve.length - 1));
      setHoverIndex(Math.max(0, Math.min(equityCurve.length - 1, index)));
    } else {
      setHoverIndex(null);
    }
  };

  const handlePointerLeave = () => {
    setHoverIndex(null);
  };

  const currentHoverPoint = hoverIndex !== null && equityCurve[hoverIndex] ? equityCurve[hoverIndex] : equityCurve[equityCurve.length - 1];
  const currentHoverBar = hoverIndex !== null && bars[hoverIndex] ? bars[hoverIndex] : bars[bars.length - 1];
  const currentTradesAtDate = currentHoverPoint ? tradeMap.get(currentHoverPoint.date) || [] : [];

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl" ref={containerRef}>
      {/* Chart Control Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 text-xs">
        {/* Left: Mode Segmented Tabs */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setMode('equity')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              mode === 'equity'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Equity vs SPY
          </button>
          <button
            onClick={() => setMode('price_execution')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              mode === 'price_execution'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Price & Trades
          </button>
          <button
            onClick={() => setMode('underwater')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              mode === 'underwater'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Underwater DD
          </button>
          <button
            onClick={() => setMode('rolling_sharpe')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              mode === 'rolling_sharpe'
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Rolling Sharpe
          </button>
        </div>

        {/* Right: Scale & Legend Toggles */}
        <div className="flex items-center gap-3">
          {mode === 'equity' && (
            <label className="flex items-center gap-1.5 text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showBenchmark}
                onChange={(e) => setShowBenchmark(e.target.checked)}
                className="rounded border-slate-700 text-emerald-500 focus:ring-0 bg-slate-900 w-3.5 h-3.5"
              />
              <span>Benchmark (SPY)</span>
            </label>
          )}

          {mode === 'price_execution' && (
            <label className="flex items-center gap-1.5 text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showTradesOverlay}
                onChange={(e) => setShowTradesOverlay(e.target.checked)}
                className="rounded border-slate-700 text-cyan-500 focus:ring-0 bg-slate-900 w-3.5 h-3.5"
              />
              <span>Trade Markers</span>
            </label>
          )}

          <button
            onClick={() => setIsLogScale(!isLogScale)}
            className={`px-2.5 py-1 rounded border text-[11px] font-mono transition-colors ${
              isLogScale
                ? 'bg-slate-800 text-cyan-300 border-cyan-500/40'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="Toggle Logarithmic Vertical Scale"
          >
            {isLogScale ? 'LOG SCALE' : 'LIN SCALE'}
          </button>
        </div>
      </div>

      {/* Floating Dynamic Data Inspection Header */}
      {currentHoverPoint && (
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1.5 px-4 py-2 bg-slate-950/60 border-b border-slate-800/80 text-xs font-mono tabular-nums">
          <div className="flex items-center gap-4">
            <span className="text-slate-300 font-semibold">{currentHoverPoint.date}</span>
            <span className="text-slate-400">
              Equity: <strong className="text-emerald-400">${currentHoverPoint.strategyEquity.toLocaleString()}</strong>
            </span>
            <span className="text-slate-400">
              SPY: <span className="text-slate-300">${currentHoverPoint.benchmarkEquity.toLocaleString()}</span>
            </span>
            <span className="text-slate-400">
              {ticker}: <span className="text-cyan-400">${currentHoverBar?.close?.toFixed(2)}</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-slate-400">
              DD: <span className={currentHoverPoint.drawdownPct > 10 ? 'text-rose-400' : 'text-slate-300'}>-{currentHoverPoint.drawdownPct.toFixed(1)}%</span>
            </span>
            <span className="text-slate-400">
              Daily:{' '}
              <span className={currentHoverPoint.dailyReturnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {currentHoverPoint.dailyReturnPct >= 0 ? '+' : ''}{currentHoverPoint.dailyReturnPct.toFixed(2)}%
              </span>
            </span>
            {currentTradesAtDate.length > 0 && (
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px]">
                {currentTradesAtDate[0].side} {currentTradesAtDate[0].exitDate === currentHoverPoint.date ? `EXIT (${currentTradesAtDate[0].returnPct}%)` : 'ENTRY'}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Canvas Element */}
      <div className="relative flex-1 min-h-[360px] w-full">
        <canvas
          ref={canvasRef}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
        />
      </div>

      {/* Footer Legend */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-slate-950/90 border-t border-slate-800/60 text-[11px] text-slate-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-emerald-500 inline-block" />
            <span className="text-slate-400">Strategy Equity</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-slate-500 inline-block" />
            <span className="text-slate-400">Benchmark (SPY)</span>
          </span>
          {customIndicator && mode === 'price_execution' && (
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-amber-500 inline-block" />
              <span className="text-amber-400">{customIndicator.name}</span>
            </span>
          )}
        </div>
        <div className="text-slate-500 font-mono text-[10px]">
          Hover or touch to inspect • {bars.length.toLocaleString()} Historical Daily Bars
        </div>
      </div>
    </div>
  );
};

function formatKMB(val: number): string {
  if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
  if (val >= 1000) return (val / 1000).toFixed(0) + 'k';
  return val.toFixed(0);
}
