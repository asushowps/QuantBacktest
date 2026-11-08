/**
 * Institutional Multi-Regime Quantitative Backtest Engine
 * Bar-by-bar execution with zero lookahead bias, intra-bar risk safeguards,
 * dynamic position sizing, and comprehensive risk analytics.
 */

import {
  Bar,
  StrategyParameters,
  Trade,
  DailyEquityPoint,
  PerformanceMetrics,
  MonthlyReturnData,
  BacktestResult,
} from '../types/backtest';
import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateBollingerBands,
  calculateDonchian,
  calculateMACD,
  calculateSuperTrend,
  calculateATR,
} from './indicators';
import { executePythonScript } from './pythonRunner';

export async function runBacktest(
  bars: Bar[],
  params: StrategyParameters,
  benchmarkBars?: Bar[]
): Promise<BacktestResult> {
  const startTime = performance.now();
  const n = bars.length;

  if (n < 5) {
    throw new Error('Insufficient historical data for backtesting (minimum 5 bars required).');
  }

  // Use SPY or self as benchmark
  const bench = benchmarkBars && benchmarkBars.length === n ? benchmarkBars : bars;

  // 1. Generate Strategy Raw Signals (1 = Long, -1 = Short, 0 = Flat)
  let signals: (1 | -1 | 0)[] = new Array(n).fill(0);
  let customIndicatorSeries: { name: string; values: (number | null)[] } | undefined;

  const closes = bars.map((b) => b.close);

  if (params.strategyType === 'sma_crossover') {
    const fast = calculateSMA(closes, params.smaFastPeriod);
    const slow = calculateSMA(closes, params.smaSlowPeriod);
    customIndicatorSeries = { name: `SMA (${params.smaFastPeriod})`, values: fast };

    for (let i = params.smaSlowPeriod; i < n; i++) {
      if (fast[i] !== null && slow[i] !== null) {
        if (fast[i]! > slow[i]!) {
          signals[i] = 1;
        } else if (fast[i]! < slow[i]!) {
          signals[i] = params.direction === 'both' ? -1 : 0;
        } else {
          signals[i] = signals[i - 1];
        }
      }
    }
  } else if (params.strategyType === 'rsi_reversal') {
    const rsi = calculateRSI(closes, params.rsiPeriod);
    customIndicatorSeries = { name: `RSI (${params.rsiPeriod})`, values: rsi };

    for (let i = params.rsiPeriod + 1; i < n; i++) {
      const r = rsi[i];
      if (r !== null) {
        if (r < params.rsiOversold) {
          signals[i] = 1; // Oversold Buy
        } else if (r > params.rsiOverbought) {
          signals[i] = params.direction === 'both' ? -1 : 0; // Overbought Sell
        } else {
          signals[i] = signals[i - 1];
        }
      }
    }
  } else if (params.strategyType === 'bollinger_bands') {
    const bb = calculateBollingerBands(closes, params.bbPeriod, params.bbStdDev);
    customIndicatorSeries = { name: `BB Upper (${params.bbPeriod})`, values: bb.upper };

    for (let i = params.bbPeriod; i < n; i++) {
      const up = bb.upper[i];
      const low = bb.lower[i];
      const mid = bb.middle[i];
      if (up !== null && low !== null && mid !== null) {
        if (params.bbMode === 'breakout') {
          if (closes[i] > up) signals[i] = 1;
          else if (closes[i] < low) signals[i] = params.direction === 'both' ? -1 : 0;
          else if (signals[i - 1] === 1 && closes[i] < mid) signals[i] = 0;
          else signals[i] = signals[i - 1];
        } else {
          // Mean reversion
          if (closes[i] < low) signals[i] = 1;
          else if (closes[i] > up) signals[i] = params.direction === 'both' ? -1 : 0;
          else if (signals[i - 1] === 1 && closes[i] > mid) signals[i] = 0;
          else signals[i] = signals[i - 1];
        }
      }
    }
  } else if (params.strategyType === 'donchian_breakout') {
    const don = calculateDonchian(bars, params.donchianPeriod);
    customIndicatorSeries = { name: `Donchian High (${params.donchianPeriod})`, values: don.upper };

    for (let i = params.donchianPeriod; i < n; i++) {
      const prevUpper = don.upper[i - 1];
      const prevLower = don.lower[i - 1];
      const prevMid = don.middle[i - 1];

      if (prevUpper !== null && prevLower !== null) {
        if (bars[i].close > prevUpper) {
          signals[i] = 1; // Breakout high
        } else if (bars[i].close < (prevMid ?? prevLower)) {
          signals[i] = params.direction === 'both' ? -1 : 0;
        } else {
          signals[i] = signals[i - 1];
        }
      }
    }
  } else if (params.strategyType === 'macd_crossover') {
    const macd = calculateMACD(closes, params.macdFast, params.macdSlow, params.macdSignal);
    customIndicatorSeries = { name: 'MACD Line', values: macd.macd };

    for (let i = params.macdSlow + params.macdSignal; i < n; i++) {
      const m = macd.macd[i];
      const s = macd.signal[i];
      if (m !== null && s !== null) {
        if (m > s) signals[i] = 1;
        else if (m < s) signals[i] = params.direction === 'both' ? -1 : 0;
        else signals[i] = signals[i - 1];
      }
    }
  } else if (params.strategyType === 'supertrend') {
    const st = calculateSuperTrend(bars, params.supertrendPeriod, params.supertrendMultiplier);
    customIndicatorSeries = { name: 'SuperTrend', values: st.supertrend };

    for (let i = params.supertrendPeriod; i < n; i++) {
      const dir = st.direction[i];
      if (dir === 1) signals[i] = 1;
      else if (dir === -1) signals[i] = params.direction === 'both' ? -1 : 0;
      else signals[i] = signals[i - 1];
    }
  } else if (params.strategyType === 'buy_and_hold') {
    signals.fill(1);
  } else if (params.strategyType === 'custom_python') {
    const pyRes = await executePythonScript(params.pythonScript, bars);
    signals = pyRes.signals;
  }

  // Adjust signals based on trading direction preference
  if (params.direction === 'long_only') {
    signals = signals.map((s) => (s === 1 ? 1 : 0));
  } else if (params.direction === 'short_only') {
    signals = signals.map((s) => (s === -1 ? -1 : 0));
  }

  // Pre-calculate ATR for risk-parity position sizing
  const atrSeries = calculateATR(bars, 14);

  // 2. Bar-by-Bar Simulation Execution
  let cash = params.initialCapital;
  let currentPosition: 'LONG' | 'SHORT' | null = null;
  let positionShares = 0;
  let entryPrice = 0;
  let entryDate = '';
  let entryIndex = 0;
  let highestHighSinceEntry = 0;
  let lowestLowSinceEntry = Infinity;
  let costBasis = 0;
  let peakEquity = params.initialCapital;
  let circuitBreakerTrippedUntilIndex = -1;

  const trades: Trade[] = [];
  const equityCurve: DailyEquityPoint[] = [];

  const benchStartPrice = bench[0].close;
  let totalFeesPaid = 0;

  const slippageMultiplier = params.slippageBps / 10000;
  const commissionMultiplier = params.commissionBps / 10000;

  for (let i = 0; i < n; i++) {
    const bar = bars[i];
    const benchBar = bench[i];
    const prevEquity = equityCurve.length > 0 ? equityCurve[equityCurve.length - 1].strategyEquity : params.initialCapital;
    let targetSignal = signals[i];

    // Check circuit breaker status
    if (circuitBreakerTrippedUntilIndex > i) {
      targetSignal = 0; // Forced cash while circuit breaker is active
    }

    // A. Check Intra-Bar Risk Management Exits if Position is Active
    let exitTriggered = false;
    let exitPrice = 0;
    let exitReason: Trade['exitReason'] = 'Signal Exit';

    if (currentPosition !== null) {
      const isLong = currentPosition === 'LONG';
      const holdingDays = i - entryIndex;

      // Update trailing anchors
      if (isLong) {
        highestHighSinceEntry = Math.max(highestHighSinceEntry, bar.high);
      } else {
        lowestLowSinceEntry = Math.min(lowestLowSinceEntry, bar.low);
      }

      // 1. Hard Stop Loss Check
      if (params.stopLossPct !== null && params.stopLossPct > 0) {
        const stopDistance = entryPrice * (params.stopLossPct / 100);
        if (isLong && bar.low <= entryPrice - stopDistance) {
          exitTriggered = true;
          exitPrice = entryPrice - stopDistance;
          exitReason = 'Stop Loss';
        } else if (!isLong && bar.high >= entryPrice + stopDistance) {
          exitTriggered = true;
          exitPrice = entryPrice + stopDistance;
          exitReason = 'Stop Loss';
        }
      }

      // 2. Take Profit Check
      if (!exitTriggered && params.takeProfitPct !== null && params.takeProfitPct > 0) {
        const tpDistance = entryPrice * (params.takeProfitPct / 100);
        if (isLong && bar.high >= entryPrice + tpDistance) {
          exitTriggered = true;
          exitPrice = entryPrice + tpDistance;
          exitReason = 'Take Profit';
        } else if (!isLong && bar.low <= entryPrice - tpDistance) {
          exitTriggered = true;
          exitPrice = entryPrice - tpDistance;
          exitReason = 'Take Profit';
        }
      }

      // 3. Trailing Stop Check
      if (!exitTriggered && params.trailingStopPct !== null && params.trailingStopPct > 0) {
        const trailDist = (params.trailingStopPct / 100);
        if (isLong) {
          const trailStopPrice = highestHighSinceEntry * (1 - trailDist);
          if (bar.low <= trailStopPrice) {
            exitTriggered = true;
            exitPrice = trailStopPrice;
            exitReason = 'Trailing Stop';
          }
        } else {
          const trailStopPrice = lowestLowSinceEntry * (1 + trailDist);
          if (bar.high >= trailStopPrice) {
            exitTriggered = true;
            exitPrice = trailStopPrice;
            exitReason = 'Trailing Stop';
          }
        }
      }

      // 4. Max Holding Period Exit
      if (!exitTriggered && params.maxHoldingDays !== null && params.maxHoldingDays > 0) {
        if (holdingDays >= params.maxHoldingDays) {
          exitTriggered = true;
          exitPrice = bar.close;
          exitReason = 'Max Hold Days';
        }
      }

      // 5. Signal Reversal Exit
      if (!exitTriggered) {
        if ((isLong && targetSignal !== 1) || (!isLong && targetSignal !== -1)) {
          exitTriggered = true;
          exitPrice = bar.close;
          exitReason = 'Signal Exit';
        }
      }

      // 6. Force Close on Last Bar
      if (!exitTriggered && i === n - 1) {
        exitTriggered = true;
        exitPrice = bar.close;
        exitReason = 'Open At End';
      }

      // Process Position Exit if Triggered
      if (exitTriggered) {
        // Slippage & Commission on Exit
        const executionExitPrice = isLong
          ? exitPrice * (1 - slippageMultiplier)
          : exitPrice * (1 + slippageMultiplier);

        const exitVolumeVal = positionShares * executionExitPrice;
        const exitFee = exitVolumeVal * commissionMultiplier + params.commissionFlat;
        totalFeesPaid += exitFee;

        let grossPnL = 0;
        let netPnL = 0;

        if (isLong) {
          grossPnL = (executionExitPrice - entryPrice) * positionShares;
          cash += exitVolumeVal - exitFee;
        } else {
          grossPnL = (entryPrice - executionExitPrice) * positionShares;
          cash += costBasis + grossPnL - exitFee;
        }

        netPnL = grossPnL - exitFee;
        const tradeReturnPct = costBasis > 0 ? (netPnL / costBasis) * 100 : 0;

        trades.push({
          id: `TRD-${trades.length + 1}`,
          entryDate,
          exitDate: bar.date,
          side: currentPosition,
          entryPrice: parseFloat(entryPrice.toFixed(2)),
          exitPrice: parseFloat(executionExitPrice.toFixed(2)),
          shares: positionShares,
          costBasis: parseFloat(costBasis.toFixed(2)),
          grossPnL: parseFloat(grossPnL.toFixed(2)),
          netPnL: parseFloat(netPnL.toFixed(2)),
          returnPct: parseFloat(tradeReturnPct.toFixed(2)),
          commissionPaid: parseFloat(exitFee.toFixed(2)),
          exitReason,
          durationDays: Math.max(1, i - entryIndex),
          highestPriceSinceEntry: parseFloat(highestHighSinceEntry.toFixed(2)),
          lowestPriceSinceEntry: parseFloat(lowestLowSinceEntry.toFixed(2)),
        });

        currentPosition = null;
        positionShares = 0;
        entryPrice = 0;
        costBasis = 0;
      }
    }

    // B. Check for New Position Entry
    if (currentPosition === null && i < n - 1 && targetSignal !== 0) {
      const isEnteringLong = targetSignal === 1;
      const isEnteringShort = targetSignal === -1;

      if ((isEnteringLong && params.direction !== 'short_only') || (isEnteringShort && params.direction !== 'long_only')) {
        // Compute position size based on current available equity & leverage
        const currentEquity = cash;
        const leveragedEquity = currentEquity * Math.max(1, Math.min(3, params.leverage));
        let allocatedCapital = 0;

        if (params.positionSizingType === 'pct_equity') {
          allocatedCapital = leveragedEquity * (Math.max(1, Math.min(100, params.positionSizeValue)) / 100);
        } else if (params.positionSizingType === 'fixed_amount') {
          allocatedCapital = Math.min(leveragedEquity, params.positionSizeValue);
        } else if (params.positionSizingType === 'risk_parity') {
          const currentAtr = atrSeries[i] ?? (bar.high - bar.low);
          const atrPct = currentAtr > 0 ? (currentAtr / bar.close) : 0.02;
          // Target 1.5% portfolio risk per trade
          const targetRiskAmount = currentEquity * 0.015;
          allocatedCapital = Math.min(leveragedEquity, targetRiskAmount / Math.max(0.01, atrPct));
        } else if (params.positionSizingType === 'kelly') {
          // Fractional 1/2 Kelly based on running trades
          const recentTrades = trades.slice(-20);
          const winRate = recentTrades.length > 5 ? recentTrades.filter((t) => t.netPnL > 0).length / recentTrades.length : 0.5;
          const avgW = recentTrades.filter((t) => t.netPnL > 0).reduce((s, t) => s + t.returnPct, 0) / (recentTrades.filter((t) => t.netPnL > 0).length || 1);
          const avgL = Math.abs(recentTrades.filter((t) => t.netPnL < 0).reduce((s, t) => s + t.returnPct, 0) / (recentTrades.filter((t) => t.netPnL < 0).length || 1)) || 1;
          const r = avgW / avgL;
          const kellyFraction = Math.max(0.1, Math.min(0.5, (winRate * r - (1 - winRate)) / r * 0.5));
          allocatedCapital = leveragedEquity * kellyFraction;
        } else {
          // fixed_shares
          allocatedCapital = Math.min(leveragedEquity, params.positionSizeValue * bar.close);
        }

        // Apply Entry Slippage
        const rawEntryPrice = bar.close;
        const executedEntryPrice = isEnteringLong
          ? rawEntryPrice * (1 + slippageMultiplier)
          : rawEntryPrice * (1 - slippageMultiplier);

        const shares = Math.floor(allocatedCapital / executedEntryPrice);

        if (shares > 0) {
          const tradeCost = shares * executedEntryPrice;
          const entryFee = tradeCost * commissionMultiplier + params.commissionFlat;
          totalFeesPaid += entryFee;

          currentPosition = isEnteringLong ? 'LONG' : 'SHORT';
          positionShares = shares;
          entryPrice = executedEntryPrice;
          entryDate = bar.date;
          entryIndex = i;
          highestHighSinceEntry = bar.high;
          lowestLowSinceEntry = bar.low;
          costBasis = tradeCost;

          if (isEnteringLong) {
            cash -= (tradeCost + entryFee);
          } else {
            // Short position margin reserve
            cash -= entryFee;
          }
        }
      }
    }

    // C. Calculate Portfolio Valuation at Bar Close
    let positionMarketValue = 0;
    if (currentPosition === 'LONG') {
      positionMarketValue = positionShares * bar.close;
    } else if (currentPosition === 'SHORT') {
      // Short unrealized PnL = (Entry - Close) * shares
      const unrealizedPnL = (entryPrice - bar.close) * positionShares;
      positionMarketValue = costBasis + unrealizedPnL;
    }

    const currentStrategyEquity = Math.max(1, cash + positionMarketValue);
    peakEquity = Math.max(peakEquity, currentStrategyEquity);

    const drawdownPct = peakEquity > 0 ? ((peakEquity - currentStrategyEquity) / peakEquity) * 100 : 0;

    // Check Max Drawdown Circuit Breaker Trigger
    if (
      params.circuitBreakerMaxDDPct !== null &&
      params.circuitBreakerMaxDDPct > 0 &&
      drawdownPct >= params.circuitBreakerMaxDDPct &&
      circuitBreakerTrippedUntilIndex <= i
    ) {
      // Trip circuit breaker for next 20 trading days
      circuitBreakerTrippedUntilIndex = i + 20;
    }

    // Benchmark Valuation
    const benchmarkEquity = params.initialCapital * (benchBar.close / benchStartPrice);
    const dailyReturnPct = prevEquity > 0 ? ((currentStrategyEquity - prevEquity) / prevEquity) * 100 : 0;
    const prevBenchEquity = i > 0 ? equityCurve[i - 1].benchmarkEquity : params.initialCapital;
    const benchmarkDailyReturnPct = prevBenchEquity > 0 ? ((benchmarkEquity - prevBenchEquity) / prevBenchEquity) * 100 : 0;

    // Benchmark Drawdown
    let benchPeak = params.initialCapital;
    for (let k = 0; k <= i; k++) {
      const bVal = params.initialCapital * (bench[k].close / benchStartPrice);
      if (bVal > benchPeak) benchPeak = bVal;
    }
    const benchDrawdownPct = benchPeak > 0 ? ((benchPeak - benchmarkEquity) / benchPeak) * 100 : 0;

    equityCurve.push({
      date: bar.date,
      timestamp: new Date(bar.date).getTime(),
      strategyEquity: parseFloat(currentStrategyEquity.toFixed(2)),
      benchmarkEquity: parseFloat(benchmarkEquity.toFixed(2)),
      cash: parseFloat(cash.toFixed(2)),
      positionValue: parseFloat(positionMarketValue.toFixed(2)),
      drawdownPct: parseFloat(drawdownPct.toFixed(2)),
      benchmarkDrawdownPct: parseFloat(benchDrawdownPct.toFixed(2)),
      dailyReturnPct: parseFloat(dailyReturnPct.toFixed(4)),
      benchmarkDailyReturnPct: parseFloat(benchmarkDailyReturnPct.toFixed(4)),
      sharesHeld: positionShares,
      closePrice: bar.close,
      signal: targetSignal,
      customIndicatorValue: customIndicatorSeries?.values[i] ?? undefined,
    });
  }

  // 3. Compute Institutional Performance Metrics
  const metrics = calculateMetrics(equityCurve, trades, params.initialCapital, totalFeesPaid);

  // 4. Compute Monthly Return Matrix
  const monthlyReturns = calculateMonthlyReturns(equityCurve);

  const executionTimeMs = Math.round(performance.now() - startTime);

  return {
    equityCurve,
    trades,
    metrics,
    monthlyReturns,
    customIndicatorSeries,
    executionTimeMs,
  };
}

/**
 * Institutional Quantitative Metrics Engine
 */
function calculateMetrics(
  equityCurve: DailyEquityPoint[],
  trades: Trade[],
  initialCapital: number,
  totalFees: number
): PerformanceMetrics {
  const n = equityCurve.length;
  if (n === 0) {
    return getEmptyMetrics();
  }

  const finalEquity = equityCurve[n - 1].strategyEquity;
  const finalBenchEquity = equityCurve[n - 1].benchmarkEquity;

  const totalReturnPct = ((finalEquity - initialCapital) / initialCapital) * 100;
  const benchmarkReturnPct = ((finalBenchEquity - initialCapital) / initialCapital) * 100;

  const totalDays = Math.max(1, n);
  const years = totalDays / 252;

  // CAGR
  const cagr = years > 0 && finalEquity > 0 ? (Math.pow(finalEquity / initialCapital, 1 / years) - 1) * 100 : 0;
  const benchmarkCagr = years > 0 && finalBenchEquity > 0 ? (Math.pow(finalBenchEquity / initialCapital, 1 / years) - 1) * 100 : 0;

  // Daily Returns & Volatility
  const dailyReturns = equityCurve.map((e) => e.dailyReturnPct / 100);
  const benchDailyReturns = equityCurve.map((e) => e.benchmarkDailyReturnPct / 100);

  const meanDaily = dailyReturns.reduce((a, b) => a + b, 0) / n;
  const varianceDaily = dailyReturns.reduce((sum, r) => sum + Math.pow(r - meanDaily, 2), 0) / n;
  const stdDaily = Math.sqrt(varianceDaily);
  const annualizedVol = stdDaily * Math.sqrt(252) * 100;

  const benchMeanDaily = benchDailyReturns.reduce((a, b) => a + b, 0) / n;
  const benchVarDaily = benchDailyReturns.reduce((sum, r) => sum + Math.pow(r - benchMeanDaily, 2), 0) / n;
  const benchStdDaily = Math.sqrt(benchVarDaily);
  const benchmarkVol = benchStdDaily * Math.sqrt(252) * 100;

  // Sharpe Ratio (assuming 2.0% risk-free rate)
  const riskFreeDaily = 0.02 / 252;
  const excessReturnDaily = meanDaily - riskFreeDaily;
  const sharpeRatio = stdDaily > 0 ? (excessReturnDaily / stdDaily) * Math.sqrt(252) : 0;

  const benchExcess = benchMeanDaily - riskFreeDaily;
  const benchmarkSharpe = benchStdDaily > 0 ? (benchExcess / benchStdDaily) * Math.sqrt(252) : 0;

  // Sortino Ratio (Downside Deviation)
  const downsideReturns = dailyReturns.filter((r) => r < riskFreeDaily);
  const downsideVariance = downsideReturns.length > 0
    ? downsideReturns.reduce((sum, r) => sum + Math.pow(r - riskFreeDaily, 2), 0) / n
    : 0.000001;
  const downsideStd = Math.sqrt(downsideVariance);
  const sortinoRatio = downsideStd > 0 ? (excessReturnDaily / downsideStd) * Math.sqrt(252) : 0;

  // Max Drawdown & Duration
  let maxDrawdownPct = 0;
  let maxDrawdownDays = 0;
  let currentDrawdownDays = 0;

  equityCurve.forEach((pt) => {
    if (pt.drawdownPct > maxDrawdownPct) maxDrawdownPct = pt.drawdownPct;
    if (pt.drawdownPct > 0.01) {
      currentDrawdownDays++;
      if (currentDrawdownDays > maxDrawdownDays) maxDrawdownDays = currentDrawdownDays;
    } else {
      currentDrawdownDays = 0;
    }
  });

  const benchmarkMaxDrawdownPct = Math.max(...equityCurve.map((e) => e.benchmarkDrawdownPct), 0);

  // Calmar Ratio
  const calmarRatio = maxDrawdownPct > 0 ? cagr / maxDrawdownPct : 0;

  // Trades Statistics
  const totalTrades = trades.length;
  const winningTrades = trades.filter((t) => t.netPnL > 0).length;
  const losingTrades = trades.filter((t) => t.netPnL <= 0).length;
  const winRatePct = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

  const grossProfit = trades.filter((t) => t.netPnL > 0).reduce((s, t) => s + t.netPnL, 0);
  const grossLoss = Math.abs(trades.filter((t) => t.netPnL < 0).reduce((s, t) => s + t.netPnL, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.9 : 0;

  const avgTradeReturnPct = totalTrades > 0 ? trades.reduce((s, t) => s + t.returnPct, 0) / totalTrades : 0;
  const winTrades = trades.filter((t) => t.returnPct > 0);
  const lossTrades = trades.filter((t) => t.returnPct < 0);
  const avgWinPct = winTrades.length > 0 ? winTrades.reduce((s, t) => s + t.returnPct, 0) / winTrades.length : 0;
  const avgLossPct = lossTrades.length > 0 ? Math.abs(lossTrades.reduce((s, t) => s + t.returnPct, 0) / lossTrades.length) : 0;
  const winLossRatio = avgLossPct > 0 ? avgWinPct / avgLossPct : avgWinPct > 0 ? 10 : 0;

  const bestTradePct = totalTrades > 0 ? Math.max(...trades.map((t) => t.returnPct)) : 0;
  const worstTradePct = totalTrades > 0 ? Math.min(...trades.map((t) => t.returnPct)) : 0;

  // Value at Risk (VaR 95% & VaR 99%)
  const sortedReturns = [...dailyReturns].sort((a, b) => a - b);
  const idx95 = Math.floor(n * 0.05);
  const idx99 = Math.floor(n * 0.01);
  const var95 = sortedReturns.length > idx95 ? Math.abs(sortedReturns[idx95]) * 100 : 0;
  const var99 = sortedReturns.length > idx99 ? Math.abs(sortedReturns[idx99]) * 100 : 0;

  // Expected Shortfall (CVaR 95%)
  const tailReturns = sortedReturns.slice(0, Math.max(1, idx95));
  const cvar95 = tailReturns.length > 0
    ? Math.abs(tailReturns.reduce((s, r) => s + r, 0) / tailReturns.length) * 100
    : var95;

  // Beta & Alpha vs Benchmark
  let cov = 0;
  for (let k = 0; k < n; k++) {
    cov += (dailyReturns[k] - meanDaily) * (benchDailyReturns[k] - benchMeanDaily);
  }
  cov = cov / n;
  const beta = benchVarDaily > 0 ? cov / benchVarDaily : 1.0;
  // Jensen's Alpha (annualized)
  const alpha = (cagr - (2.0 + beta * (benchmarkCagr - 2.0)));

  // Market Exposure Time
  const exposedDays = equityCurve.filter((e) => e.sharesHeld > 0).length;
  const exposureTimePct = n > 0 ? (exposedDays / n) * 100 : 0;

  return {
    totalReturnPct: parseFloat(totalReturnPct.toFixed(2)),
    benchmarkReturnPct: parseFloat(benchmarkReturnPct.toFixed(2)),
    cagr: parseFloat(cagr.toFixed(2)),
    benchmarkCagr: parseFloat(benchmarkCagr.toFixed(2)),
    annualizedVol: parseFloat(annualizedVol.toFixed(2)),
    benchmarkVol: parseFloat(benchmarkVol.toFixed(2)),
    sharpeRatio: parseFloat(sharpeRatio.toFixed(2)),
    benchmarkSharpe: parseFloat(benchmarkSharpe.toFixed(2)),
    sortinoRatio: parseFloat(sortinoRatio.toFixed(2)),
    calmarRatio: parseFloat(calmarRatio.toFixed(2)),
    maxDrawdownPct: parseFloat(maxDrawdownPct.toFixed(2)),
    benchmarkMaxDrawdownPct: parseFloat(benchmarkMaxDrawdownPct.toFixed(2)),
    maxDrawdownDays,
    winRatePct: parseFloat(winRatePct.toFixed(2)),
    totalTrades,
    winningTrades,
    losingTrades,
    profitFactor: parseFloat(profitFactor.toFixed(2)),
    avgTradeReturnPct: parseFloat(avgTradeReturnPct.toFixed(2)),
    avgWinPct: parseFloat(avgWinPct.toFixed(2)),
    avgLossPct: parseFloat(avgLossPct.toFixed(2)),
    winLossRatio: parseFloat(winLossRatio.toFixed(2)),
    var95: parseFloat(var95.toFixed(2)),
    var99: parseFloat(var99.toFixed(2)),
    cvar95: parseFloat(cvar95.toFixed(2)),
    alpha: parseFloat(alpha.toFixed(2)),
    beta: parseFloat(beta.toFixed(2)),
    bestTradePct: parseFloat(bestTradePct.toFixed(2)),
    worstTradePct: parseFloat(worstTradePct.toFixed(2)),
    finalEquity: parseFloat(finalEquity.toFixed(2)),
    totalFees: parseFloat(totalFees.toFixed(2)),
    exposureTimePct: parseFloat(exposureTimePct.toFixed(1)),
  };
}

/**
 * Monthly and Annual Returns Heatmap Builder
 */
function calculateMonthlyReturns(equityCurve: DailyEquityPoint[]): MonthlyReturnData[] {
  if (equityCurve.length === 0) return [];

  // Group by year and month
  const yearMap = new Map<number, { [month: number]: { first: number; last: number } }>();

  equityCurve.forEach((pt) => {
    const d = new Date(pt.date);
    const yr = d.getFullYear();
    const mo = d.getMonth();

    if (!yearMap.has(yr)) {
      yearMap.set(yr, {});
    }
    const monthsObj = yearMap.get(yr)!;

    if (!monthsObj[mo]) {
      monthsObj[mo] = { first: pt.strategyEquity, last: pt.strategyEquity };
    } else {
      monthsObj[mo].last = pt.strategyEquity;
    }
  });

  const result: MonthlyReturnData[] = [];
  const years = Array.from(yearMap.keys()).sort((a, b) => b - a);

  years.forEach((year) => {
    const moData = yearMap.get(year)!;
    const months: { [month: number]: number } = {};

    let yearStartEquity = 0;
    let yearEndEquity = 0;

    for (let m = 0; m < 12; m++) {
      if (moData[m]) {
        const { first, last } = moData[m];
        if (yearStartEquity === 0) yearStartEquity = first;
        yearEndEquity = last;
        const moRet = first > 0 ? ((last - first) / first) * 100 : 0;
        months[m] = parseFloat(moRet.toFixed(2));
      }
    }

    const yearTotal = yearStartEquity > 0 ? ((yearEndEquity - yearStartEquity) / yearStartEquity) * 100 : 0;

    result.push({
      year,
      months,
      yearTotal: parseFloat(yearTotal.toFixed(2)),
    });
  });

  return result;
}

function getEmptyMetrics(): PerformanceMetrics {
  return {
    totalReturnPct: 0,
    benchmarkReturnPct: 0,
    cagr: 0,
    benchmarkCagr: 0,
    annualizedVol: 0,
    benchmarkVol: 0,
    sharpeRatio: 0,
    benchmarkSharpe: 0,
    sortinoRatio: 0,
    calmarRatio: 0,
    maxDrawdownPct: 0,
    benchmarkMaxDrawdownPct: 0,
    maxDrawdownDays: 0,
    winRatePct: 0,
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    profitFactor: 0,
    avgTradeReturnPct: 0,
    avgWinPct: 0,
    avgLossPct: 0,
    winLossRatio: 0,
    var95: 0,
    var99: 0,
    cvar95: 0,
    alpha: 0,
    beta: 1,
    bestTradePct: 0,
    worstTradePct: 0,
    finalEquity: 0,
    totalFees: 0,
    exposureTimePct: 0,
  };
}
