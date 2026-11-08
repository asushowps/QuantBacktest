/**
 * Technical indicators and quantitative financial math library
 */

import { Bar } from '../types/backtest';

/**
 * Simple Moving Average (SMA)
 */
export function calculateSMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null);
  let sum = 0;

  for (let i = 0; i < data.length; i++) {
    sum += data[i];
    if (i >= period) {
      sum -= data[i - period];
    }
    if (i >= period - 1) {
      result[i] = sum / period;
    }
  }

  return result;
}

/**
 * Exponential Moving Average (EMA)
 */
export function calculateEMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null);
  const k = 2 / (period + 1);

  let initialSum = 0;
  for (let i = 0; i < period && i < data.length; i++) {
    initialSum += data[i];
  }

  if (data.length < period) return result;

  let currentEma = initialSum / period;
  result[period - 1] = currentEma;

  for (let i = period; i < data.length; i++) {
    currentEma = data[i] * k + currentEma * (1 - k);
    result[i] = currentEma;
  }

  return result;
}

/**
 * Relative Strength Index (RSI - Wilder's Smoothing)
 */
export function calculateRSI(closes: number[], period = 14): (number | null)[] {
  const result: (number | null)[] = new Array(closes.length).fill(null);
  if (closes.length <= period) return result;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change >= 0) gains += change;
    else losses += Math.abs(change);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const gain = change >= 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    if (avgLoss === 0) {
      result[i] = 100;
    } else {
      const rs = avgGain / avgLoss;
      result[i] = 100 - 100 / (1 + rs);
    }
  }

  return result;
}

/**
 * Bollinger Bands
 */
export interface BollingerBandsResult {
  upper: (number | null)[];
  middle: (number | null)[];
  lower: (number | null)[];
  bandwidth: (number | null)[];
}

export function calculateBollingerBands(
  closes: number[],
  period = 20,
  stdDevMultiplier = 2
): BollingerBandsResult {
  const middle = calculateSMA(closes, period);
  const upper: (number | null)[] = new Array(closes.length).fill(null);
  const lower: (number | null)[] = new Array(closes.length).fill(null);
  const bandwidth: (number | null)[] = new Array(closes.length).fill(null);

  for (let i = period - 1; i < closes.length; i++) {
    const mean = middle[i];
    if (mean === null) continue;

    let varianceSum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      varianceSum += Math.pow(closes[j] - mean, 2);
    }
    const stdDev = Math.sqrt(varianceSum / period);

    const up = mean + stdDevMultiplier * stdDev;
    const low = mean - stdDevMultiplier * stdDev;

    upper[i] = up;
    lower[i] = low;
    bandwidth[i] = mean > 0 ? ((up - low) / mean) * 100 : 0;
  }

  return { upper, middle, lower, bandwidth };
}

/**
 * Average True Range (ATR)
 */
export function calculateATR(bars: Bar[], period = 14): (number | null)[] {
  const tr: number[] = new Array(bars.length).fill(0);
  const result: (number | null)[] = new Array(bars.length).fill(null);
  if (bars.length === 0) return result;

  tr[0] = bars[0].high - bars[0].low;
  for (let i = 1; i < bars.length; i++) {
    const h = bars[i].high;
    const l = bars[i].low;
    const prevC = bars[i - 1].close;
    tr[i] = Math.max(h - l, Math.abs(h - prevC), Math.abs(l - prevC));
  }

  if (bars.length < period) return result;

  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += tr[i];
  }
  let currentAtr = sum / period;
  result[period - 1] = currentAtr;

  for (let i = period; i < bars.length; i++) {
    currentAtr = (currentAtr * (period - 1) + tr[i]) / period;
    result[i] = currentAtr;
  }

  return result;
}

/**
 * MACD (Moving Average Convergence Divergence)
 */
export interface MACDResult {
  macd: (number | null)[];
  signal: (number | null)[];
  histogram: (number | null)[];
}

export function calculateMACD(
  closes: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): MACDResult {
  const fastEma = calculateEMA(closes, fastPeriod);
  const slowEma = calculateEMA(closes, slowPeriod);

  const macdLine: (number | null)[] = new Array(closes.length).fill(null);
  const validMacdValues: number[] = [];
  const validMacdIndices: number[] = [];

  for (let i = 0; i < closes.length; i++) {
    const f = fastEma[i];
    const s = slowEma[i];
    if (f !== null && s !== null) {
      const val = f - s;
      macdLine[i] = val;
      validMacdValues.push(val);
      validMacdIndices.push(i);
    }
  }

  const signalSubEma = calculateEMA(validMacdValues, signalPeriod);
  const signalLine: (number | null)[] = new Array(closes.length).fill(null);
  const histogram: (number | null)[] = new Array(closes.length).fill(null);

  for (let j = 0; j < validMacdIndices.length; j++) {
    const originalIdx = validMacdIndices[j];
    const sigVal = signalSubEma[j];
    signalLine[originalIdx] = sigVal;

    if (sigVal !== null && macdLine[originalIdx] !== null) {
      histogram[originalIdx] = macdLine[originalIdx]! - sigVal;
    }
  }

  return { macd: macdLine, signal: signalLine, histogram };
}

/**
 * Donchian Channels
 */
export interface DonchianResult {
  upper: (number | null)[];
  middle: (number | null)[];
  lower: (number | null)[];
}

export function calculateDonchian(bars: Bar[], period = 20): DonchianResult {
  const upper: (number | null)[] = new Array(bars.length).fill(null);
  const lower: (number | null)[] = new Array(bars.length).fill(null);
  const middle: (number | null)[] = new Array(bars.length).fill(null);

  for (let i = period - 1; i < bars.length; i++) {
    let maxHigh = -Infinity;
    let minLow = Infinity;

    for (let j = i - period + 1; j <= i; j++) {
      if (bars[j].high > maxHigh) maxHigh = bars[j].high;
      if (bars[j].low < minLow) minLow = bars[j].low;
    }

    upper[i] = maxHigh;
    lower[i] = minLow;
    middle[i] = (maxHigh + minLow) / 2;
  }

  return { upper, middle, lower };
}

/**
 * SuperTrend Indicator
 */
export interface SuperTrendResult {
  supertrend: (number | null)[];
  direction: (1 | -1 | null)[]; // 1 for bull, -1 for bear
}

export function calculateSuperTrend(bars: Bar[], period = 10, multiplier = 3): SuperTrendResult {
  const atr = calculateATR(bars, period);
  const supertrend: (number | null)[] = new Array(bars.length).fill(null);
  const direction: (1 | -1 | null)[] = new Array(bars.length).fill(null);

  let inUptrend = true;

  for (let i = period; i < bars.length; i++) {
    const curAtr = atr[i];
    if (curAtr === null) continue;

    const hl2 = (bars[i].high + bars[i].low) / 2;
    const basicUpper = hl2 + multiplier * curAtr;
    const basicLower = hl2 - multiplier * curAtr;

    const close = bars[i].close;
    const prevSuper = supertrend[i - 1] ?? basicLower;

    if (inUptrend) {
      if (close < prevSuper) {
        inUptrend = false;
        supertrend[i] = basicUpper;
        direction[i] = -1;
      } else {
        supertrend[i] = Math.max(basicLower, prevSuper);
        direction[i] = 1;
      }
    } else {
      if (close > prevSuper) {
        inUptrend = true;
        supertrend[i] = basicLower;
        direction[i] = 1;
      } else {
        supertrend[i] = Math.min(basicUpper, prevSuper);
        direction[i] = -1;
      }
    }
  }

  return { supertrend, direction };
}

/**
 * Rolling Sharpe Ratio (e.g. 126 or 252 days)
 */
export function calculateRollingSharpe(
  dailyReturns: number[],
  window = 126,
  riskFreeDaily = 0.02 / 252
): (number | null)[] {
  const result: (number | null)[] = new Array(dailyReturns.length).fill(null);

  for (let i = window - 1; i < dailyReturns.length; i++) {
    let sum = 0;
    for (let j = i - window + 1; j <= i; j++) {
      sum += dailyReturns[j] - riskFreeDaily;
    }
    const mean = sum / window;

    let varSum = 0;
    for (let j = i - window + 1; j <= i; j++) {
      varSum += Math.pow(dailyReturns[j] - riskFreeDaily - mean, 2);
    }
    const std = Math.sqrt(varSum / window);

    if (std > 0) {
      result[i] = (mean / std) * Math.sqrt(252);
    } else {
      result[i] = 0;
    }
  }

  return result;
}
