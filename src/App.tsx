/**
 * QuantBacktest Pro - Institutional 30-Year Algorithmic Strategy Simulator
 * High-performance quantitative backtesting with multi-decade historical data,
 * in-browser Python indicator scripting, risk management safeguards, and real-time streaming data.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  SUPPORTED_ASSETS,
  DATE_PRESETS,
  generateHistoricalData,
  filterBarsByDateRange,
  parseCSVData,
} from './services/marketData';
import { runBacktest } from './services/backtestEngine';
import { DEFAULT_PARAMETERS, loadStrategyVault } from './services/cloudStorage';
import { exportTradesToCSV, exportEquityCurveToCSV } from './services/reportExporter';
import { initPyodide } from './services/pythonRunner';
import { Bar, BacktestResult, StrategyParameters, SavedStrategy } from './types/backtest';

import { InteractiveChart } from './components/InteractiveChart';
import { MetricsOverview } from './components/MetricsOverview';
import { MonthlyHeatmap } from './components/MonthlyHeatmap';
import { TradeLogTable } from './components/TradeLogTable';
import { StrategyConfigDrawer } from './components/StrategyConfigDrawer';
import { PythonEditorModal } from './components/PythonEditorModal';
import { TearSheetModal } from './components/TearSheetModal';
import { StrategyVaultModal } from './components/StrategyVaultModal';
import { LiveMarketBar } from './components/LiveMarketBar';
import { LiveSimulationModal } from './components/LiveSimulationModal';

import {
  Sliders,
  FileText,
  Cloud,
  Code,
  Upload,
  Play,
  RotateCcw,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  Radio,
  ChevronDown,
} from 'lucide-react';

export default function App() {
  // State: Asset & Date Range
  const [selectedTicker, setSelectedTicker] = useState<string>('SPY');
  const [selectedDatePresetId, setSelectedDatePresetId] = useState<string>('30y');
  const [customBars, setCustomBars] = useState<Bar[] | null>(null);

  // State: Strategy Parameters
  const [params, setParams] = useState<StrategyParameters>(DEFAULT_PARAMETERS);

  // State: Backtest Computation
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [isComputing, setIsComputing] = useState<boolean>(false);
  const [computeError, setComputeError] = useState<string | null>(null);

  // State: Modals
  const [isPythonModalOpen, setIsPythonModalOpen] = useState(false);
  const [isTearSheetOpen, setIsTearSheetOpen] = useState(false);
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [isLiveSimOpen, setIsLiveSimOpen] = useState(false);

  // Mobile Drawer Toggle
  const [isMobileConfigOpen, setIsMobileConfigOpen] = useState(false);

  // Initialize Pyodide asynchronously in background
  useEffect(() => {
    initPyodide().catch(() => {});
  }, []);

  // Fetch / Generate Historical Bars for Ticker & Benchmark (SPY)
  const rawAssetBars = useMemo(() => {
    if (customBars) return customBars;
    return generateHistoricalData(selectedTicker);
  }, [selectedTicker, customBars]);

  const rawBenchmarkBars = useMemo(() => {
    return generateHistoricalData('SPY');
  }, []);

  // Filter Bars by Selected Timeframe
  const datePreset = DATE_PRESETS.find((p) => p.id === selectedDatePresetId) || DATE_PRESETS[0];

  const filteredAssetBars = useMemo(() => {
    return filterBarsByDateRange(rawAssetBars, datePreset.startDate, datePreset.endDate);
  }, [rawAssetBars, datePreset]);

  const filteredBenchmarkBars = useMemo(() => {
    return filterBarsByDateRange(rawBenchmarkBars, datePreset.startDate, datePreset.endDate);
  }, [rawBenchmarkBars, datePreset]);

  // Execute Backtest
  const executeSimulation = useCallback(
    async (currentParams = params) => {
      if (filteredAssetBars.length < 5) {
        setComputeError('Insufficient data points in selected date range.');
        return;
      }

      setIsComputing(true);
      setComputeError(null);

      try {
        const res = await runBacktest(filteredAssetBars, currentParams, filteredBenchmarkBars);
        setResult(res);
      } catch (err: any) {
        setComputeError(err.message || 'Backtest execution failed.');
      } finally {
        setIsComputing(false);
      }
    },
    [filteredAssetBars, filteredBenchmarkBars, params]
  );

  // Auto-run simulation on initial load or when ticker / timeframe changes
  useEffect(() => {
    executeSimulation();
  }, [selectedTicker, selectedDatePresetId, customBars]);

  // Handle Strategy Preset Load from Vault
  const handleLoadStrategy = (strategy: SavedStrategy) => {
    setParams(strategy.params);
    setSelectedTicker(strategy.ticker);
    setCustomBars(null);
    executeSimulation(strategy.params);
  };

  // Handle CSV File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseCSVData(text, file.name.replace(/\.[^/.]+$/, '').toUpperCase());
        if (parsed.length > 5) {
          setCustomBars(parsed);
          setSelectedTicker(file.name.replace(/\.[^/.]+$/, '').toUpperCase());
          setSelectedDatePresetId('30y');
        } else {
          alert('Could not find enough valid daily data points in CSV.');
        }
      } catch (err: any) {
        alert(err.message || 'Failed to parse CSV file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP BAR CONTRACT: Brand — Nav Links — Primary Action */}
      {/* ------------------------------------------------------------- */}
      <header className="flex items-center justify-between gap-8 px-4 sm:px-6 py-3.5 bg-slate-950 border-b border-slate-800 shrink-0">
        {/* Zone 1: Brand title wordmark */}
        <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-emerald-500 flex items-center justify-center font-bold text-white shadow-md shadow-cyan-950">
            Q
          </div>
          <span className="text-base sm:text-lg font-bold tracking-tight text-slate-100 font-mono">
            QuantBacktest<span className="text-cyan-400">.pro</span>
          </span>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6 text-xs font-medium text-slate-400 whitespace-nowrap shrink-0">
          <a href="#chart-section" className="hover:text-slate-200 transition-colors">
            Interactive Equity
          </a>
          <a href="#metrics-section" className="hover:text-slate-200 transition-colors">
            Risk Analytics
          </a>
          <a href="#matrix-section" className="hover:text-slate-200 transition-colors">
            Monthly Matrix
          </a>
          <a href="#trades-section" className="hover:text-slate-200 transition-colors">
            Execution Log
          </a>
        </nav>

        {/* Zone 3: Primary Action & Tools */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={() => setIsPythonModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-800 hover:border-slate-700 text-xs font-medium transition-all"
            title="Open Python Algorithmic Indicator Scripting Environment"
          >
            <Code className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Python IDE</span>
          </button>

          <button
            onClick={() => setIsVaultOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 text-xs font-medium transition-all"
            title="Secure Cloud Strategy Vault"
          >
            <Cloud className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Strategy Vault</span>
          </button>

          <button
            onClick={() => setIsTearSheetOpen(true)}
            disabled={!result}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-medium shadow-md shadow-emerald-950 transition-all cursor-pointer whitespace-nowrap"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Tear Sheet</span>
          </button>

          {/* Mobile Config Toggle */}
          <button
            onClick={() => setIsMobileConfigOpen(!isMobileConfigOpen)}
            className="lg:hidden p-2 rounded-lg bg-slate-900 text-slate-300 border border-slate-800"
            title="Toggle Strategy Configuration"
          >
            <Sliders className="w-4 h-4 text-cyan-400" />
          </button>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* 2. REAL-TIME STREAMING DATA FEED BAR */}
      {/* ------------------------------------------------------------- */}
      <LiveMarketBar
        selectedTicker={selectedTicker}
        onSelectTicker={(t) => {
          setSelectedTicker(t);
          setCustomBars(null);
        }}
        isLiveForwardTesting={isLiveSimOpen}
        onToggleLiveForwardTest={() => setIsLiveSimOpen(!isLiveSimOpen)}
      />

      {/* ------------------------------------------------------------- */}
      {/* 3. ASSET SELECTION & 30-YEAR TIMEFRAME STRIP */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-slate-950/90 border-b border-slate-800/80 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Asset Picker & Custom Upload */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 text-slate-400 font-medium">
            <span>Asset:</span>
          </div>

          <select
            value={customBars ? 'CUSTOM' : selectedTicker}
            onChange={(e) => {
              if (e.target.value === 'UPLOAD_CSV') {
                document.getElementById('csv-upload-input')?.click();
              } else {
                setCustomBars(null);
                setSelectedTicker(e.target.value);
              }
            }}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 font-medium text-xs focus:outline-none focus:border-cyan-500 font-mono"
          >
            <optgroup label="Core Index Benchmarks">
              <option value="SPY">SPY (S&P 500 ETF - 1995-2026)</option>
              <option value="QQQ">QQQ (Nasdaq 100 ETF - 1999-2026)</option>
            </optgroup>
            <optgroup label="Mega-Cap Leaders">
              <option value="AAPL">AAPL (Apple Inc. - 1995-2026)</option>
              <option value="NVDA">NVDA (NVIDIA Corp. - 1999-2026)</option>
              <option value="MSFT">MSFT (Microsoft Corp. - 1995-2026)</option>
              <option value="AMZN">AMZN (Amazon.com - 1997-2026)</option>
              <option value="TSLA">TSLA (Tesla Inc. - 2010-2026)</option>
            </optgroup>
            <optgroup label="Macro Hedges">
              <option value="GLD">GLD (SPDR Gold Shares - 2004-2026)</option>
              <option value="TLT">TLT (20+ Year Treasuries - 2002-2026)</option>
              <option value="BTC-USD">BTC-USD (Bitcoin - 2014-2026)</option>
            </optgroup>
            <optgroup label="Custom Data">
              {customBars && <option value="CUSTOM">{selectedTicker} (Custom Upload)</option>}
              <option value="UPLOAD_CSV">+ Upload Custom CSV...</option>
            </optgroup>
          </select>

          <input
            id="csv-upload-input"
            type="file"
            accept=".csv,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />

          <span className="hidden sm:inline text-slate-500 font-mono tabular-nums text-[11px]">
            {filteredAssetBars.length.toLocaleString()} bars ({filteredAssetBars[0]?.date} → {filteredAssetBars[filteredAssetBars.length - 1]?.date})
          </span>
        </div>

        {/* Right: Timeframe Segmented Presets */}
        <div className="flex items-center gap-1 overflow-x-auto p-1 bg-slate-900 border border-slate-800 rounded-lg">
          {DATE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => setSelectedDatePresetId(preset.id)}
              className={`px-2.5 py-1 rounded text-[11px] whitespace-nowrap transition-all ${
                selectedDatePresetId === preset.id
                  ? 'bg-slate-800 text-cyan-300 font-bold border border-cyan-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title={preset.description}
            >
              {preset.label.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. MAIN WORKSPACE VIEWPORT */}
      {/* ------------------------------------------------------------- */}
      <div className="flex-1 max-w-[1720px] w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Strategy & Risk Parameters (Desktop) */}
        <div className="hidden lg:block lg:col-span-4 xl:col-span-3 space-y-4">
          <StrategyConfigDrawer
            params={params}
            onChangeParams={(newP) => {
              setParams(newP);
              executeSimulation(newP);
            }}
            onOpenPythonEditor={() => setIsPythonModalOpen(true)}
            onResetToDefaults={() => {
              setParams(DEFAULT_PARAMETERS);
              executeSimulation(DEFAULT_PARAMETERS);
            }}
          />

          {/* Quick Execution Action Button */}
          <button
            onClick={() => executeSimulation()}
            disabled={isComputing}
            className="w-full py-3 bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-950 transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>{isComputing ? 'Simulating Strategy...' : 'Re-Run Backtest'}</span>
          </button>
        </div>

        {/* Mobile Slide-Out / Drawer for Strategy Config */}
        {isMobileConfigOpen && (
          <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden p-4 overflow-y-auto">
            <div className="relative max-w-lg mx-auto bg-slate-900 border border-slate-700 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="font-bold text-slate-100">Strategy Parameters</h3>
                <button
                  onClick={() => setIsMobileConfigOpen(false)}
                  className="p-1 rounded bg-slate-800 text-slate-300"
                >
                  ✕
                </button>
              </div>
              <StrategyConfigDrawer
                params={params}
                onChangeParams={(newP) => {
                  setParams(newP);
                  executeSimulation(newP);
                }}
                onOpenPythonEditor={() => {
                  setIsMobileConfigOpen(false);
                  setIsPythonModalOpen(true);
                }}
                onResetToDefaults={() => {
                  setParams(DEFAULT_PARAMETERS);
                  executeSimulation(DEFAULT_PARAMETERS);
                }}
              />
              <button
                onClick={() => {
                  setIsMobileConfigOpen(false);
                  executeSimulation();
                }}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold"
              >
                Apply & Close
              </button>
            </div>
          </div>
        )}

        {/* Right Column: Analytics, Interactive Charts & Detailed Logs */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-6">
          {computeError && (
            <div className="p-4 bg-rose-950/60 border border-rose-800/80 rounded-xl text-xs text-rose-300 flex items-center justify-between">
              <span>{computeError}</span>
              <button
                onClick={() => executeSimulation()}
                className="px-3 py-1 bg-rose-900 hover:bg-rose-800 text-white rounded-lg text-xs"
              >
                Retry
              </button>
            </div>
          )}

          {/* Section A: Institutional KPI Metrics Grid */}
          <section id="metrics-section">
            {result ? (
              <MetricsOverview metrics={result.metrics} initialCapital={params.initialCapital} />
            ) : (
              <div className="h-28 bg-slate-900/60 border border-slate-800 rounded-xl animate-pulse" />
            )}
          </section>

          {/* Section B: Interactive Multi-Mode Financial Canvas Chart */}
          <section id="chart-section" className="min-h-[440px]">
            {result && (
              <InteractiveChart
                equityCurve={result.equityCurve}
                trades={result.trades}
                bars={filteredAssetBars}
                ticker={selectedTicker}
                customIndicator={result.customIndicatorSeries}
              />
            )}
          </section>

          {/* Section C: Monthly Returns Heatmap Matrix */}
          <section id="matrix-section">
            {result && <MonthlyHeatmap monthlyReturns={result.monthlyReturns} />}
          </section>

          {/* Section D: Execution Trade Log Table */}
          <section id="trades-section">
            {result && (
              <TradeLogTable
                trades={result.trades}
                onExportCSV={() => exportTradesToCSV(result, selectedTicker)}
              />
            )}
          </section>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5. MODALS & SUB-PANELS */}
      {/* ------------------------------------------------------------- */}
      <PythonEditorModal
        isOpen={isPythonModalOpen}
        onClose={() => setIsPythonModalOpen(false)}
        pythonScript={params.pythonScript}
        onApplyScript={(newCode) => {
          const updated = {
            ...params,
            strategyType: 'custom_python' as const,
            pythonScript: newCode,
          };
          setParams(updated);
          executeSimulation(updated);
        }}
      />

      {result && (
        <TearSheetModal
          isOpen={isTearSheetOpen}
          onClose={() => setIsTearSheetOpen(false)}
          result={result}
          params={params}
          ticker={selectedTicker}
          timeframeLabel={datePreset.label}
        />
      )}

      <StrategyVaultModal
        isOpen={isVaultOpen}
        onClose={() => setIsVaultOpen(false)}
        currentParams={params}
        currentTicker={selectedTicker}
        onLoadStrategy={handleLoadStrategy}
        lastSharpe={result?.metrics.sharpeRatio}
        lastReturn={result?.metrics.totalReturnPct}
      />

      <LiveSimulationModal
        isOpen={isLiveSimOpen}
        onClose={() => setIsLiveSimOpen(false)}
        ticker={selectedTicker}
        params={params}
        currentBars={filteredAssetBars}
      />
    </div>
  );
}
