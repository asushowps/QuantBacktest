/**
 * Type definitions for the 30-Year Backtest Simulator
 */

export interface Bar {
  date: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type PositionSizingType =
  | 'pct_equity'     // % of current equity
  | 'fixed_amount'   // Fixed $ amount per position
  | 'risk_parity'    // Volatility/ATR-adjusted size
  | 'kelly'          // Fractional Kelly sizing
  | 'fixed_shares';  // Fixed number of shares

export type TradingDirection = 'long_only' | 'short_only' | 'both';

export type StrategyType =
  | 'sma_crossover'
  | 'rsi_reversal'
  | 'bollinger_bands'
  | 'donchian_breakout'
  | 'macd_crossover'
  | 'supertrend'
  | 'buy_and_hold'
  | 'custom_python';

export interface StrategyParameters {
  // Capital & Costs
  initialCapital: number;
  commissionBps: number;    // Basis points (e.g., 5 bps = 0.05%)
  commissionFlat: number;   // Flat fee per order (e.g., $1.00)
  slippageBps: number;      // Slippage in basis points (e.g., 5 bps = 0.05%)
  
  // Position Sizing
  positionSizingType: PositionSizingType;
  positionSizeValue: number; // e.g. 25 (%) or 10000 ($)
  direction: TradingDirection;
  leverage: number;          // 1.0 to 3.0
  
  // Risk Management
  stopLossPct: number | null;        // e.g. 5.0 (%)
  takeProfitPct: number | null;      // e.g. 15.0 (%)
  trailingStopPct: number | null;    // e.g. 8.0 (%)
  circuitBreakerMaxDDPct: number | null; // Pause/exit if drawdown > X%
  maxHoldingDays: number | null;     // Time-based exit
  
  // Strategy Specific Parameters
  strategyType: StrategyType;
  
  // SMA
  smaFastPeriod: number;
  smaSlowPeriod: number;
  
  // RSI
  rsiPeriod: number;
  rsiOversold: number;
  rsiOverbought: number;
  
  // Bollinger
  bbPeriod: number;
  bbStdDev: number;
  bbMode: 'breakout' | 'mean_reversion';
  
  // Donchian
  donchianPeriod: number;
  
  // MACD
  macdFast: number;
  macdSlow: number;
  macdSignal: number;
  
  // SuperTrend
  supertrendPeriod: number;
  supertrendMultiplier: number;
  
  // Python Scripting
  pythonScript: string;
}

export interface Trade {
  id: string;
  entryDate: string;
  exitDate: string;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number;
  shares: number;
  costBasis: number;
  grossPnL: number;
  netPnL: number;
  returnPct: number;
  commissionPaid: number;
  exitReason:
    | 'Take Profit'
    | 'Stop Loss'
    | 'Trailing Stop'
    | 'Signal Exit'
    | 'Circuit Breaker'
    | 'Max Hold Days'
    | 'Open At End';
  durationDays: number;
  highestPriceSinceEntry: number;
  lowestPriceSinceEntry: number;
}

export interface DailyEquityPoint {
  date: string;
  timestamp: number;
  strategyEquity: number;
  benchmarkEquity: number;
  cash: number;
  positionValue: number;
  drawdownPct: number;
  benchmarkDrawdownPct: number;
  dailyReturnPct: number;
  benchmarkDailyReturnPct: number;
  sharesHeld: number;
  closePrice: number;
  signal: number; // 1 for Buy/Long, -1 for Sell/Short, 0 for Flat/Cash
  customIndicatorValue?: number;
}

export interface PerformanceMetrics {
  totalReturnPct: number;
  benchmarkReturnPct: number;
  cagr: number;
  benchmarkCagr: number;
  annualizedVol: number;
  benchmarkVol: number;
  sharpeRatio: number;
  benchmarkSharpe: number;
  sortinoRatio: number;
  calmarRatio: number;
  maxDrawdownPct: number;
  benchmarkMaxDrawdownPct: number;
  maxDrawdownDays: number;
  winRatePct: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  profitFactor: number;
  avgTradeReturnPct: number;
  avgWinPct: number;
  avgLossPct: number;
  winLossRatio: number;
  var95: number;
  var99: number;
  cvar95: number;
  alpha: number;
  beta: number;
  bestTradePct: number;
  worstTradePct: number;
  finalEquity: number;
  totalFees: number;
  exposureTimePct: number;
}

export interface MonthlyReturnData {
  year: number;
  months: { [month: number]: number }; // 0 to 11
  yearTotal: number;
}

export interface BacktestResult {
  equityCurve: DailyEquityPoint[];
  trades: Trade[];
  metrics: PerformanceMetrics;
  monthlyReturns: MonthlyReturnData[];
  customIndicatorSeries?: { name: string; values: (number | null)[] };
  executionTimeMs: number;
}

export interface SavedStrategy {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  ticker: string;
  params: StrategyParameters;
  tags: string[];
  lastSharpe?: number;
  lastTotalReturn?: number;
}

export interface LiveMarketTick {
  ticker: string;
  price: number;
  bid: number;
  ask: number;
  change: number;
  changePct: number;
  volume: number;
  high: number;
  low: number;
  lastUpdated: string;
}
