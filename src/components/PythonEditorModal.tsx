/**
 * Advanced In-Browser Python Algorithmic Indicator & Strategy Editor
 * Full code editor, preset models, live execution console, and documentation.
 */

import React, { useState } from 'react';
import { PYTHON_PRESETS, PythonPreset } from '../services/pythonRunner';
import { Play, Code, Terminal, BookOpen, RotateCcw, Check, X, Sparkles } from 'lucide-react';

interface PythonEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  pythonScript: string;
  onApplyScript: (code: string) => void;
  isExecuting?: boolean;
}

export const PythonEditorModal: React.FC<PythonEditorModalProps> = ({
  isOpen,
  onClose,
  pythonScript,
  onApplyScript,
  isExecuting = false,
}) => {
  const [code, setCode] = useState(pythonScript);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('rsi_trend_filter');
  const [activeTab, setActiveTab] = useState<'editor' | 'docs' | 'console'>('editor');
  const [consoleOutput, setConsoleOutput] = useState<string[]>([
    'Python 3.12 Algorithmic Runtime initialized.',
    'Ready to compile custom indicator mathematical models.',
  ]);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: PythonPreset) => {
    setSelectedPresetId(preset.id);
    setCode(preset.code);
    setConsoleOutput((prev) => [...prev, `Loaded template: ${preset.name}`]);
  };

  const handleRunAndApply = () => {
    setConsoleOutput((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] Executing Python strategy script...`,
      'Compiling arrays: opens, highs, lows, closes, volumes...',
      'Computing signals...',
    ]);
    onApplyScript(code);
    onClose();
  };

  const lineCount = code.split('\n').length;
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-5xl h-[85vh] bg-slate-900 border border-slate-700 rounded-2xl flex flex-col shadow-2xl overflow-hidden">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Code className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-100">Python Algorithmic Scripting Engine</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Python 3.12 (Pyodide Wasm)
                </span>
              </div>
              <p className="text-xs text-slate-400">Write custom quantitative models and indicator signal logic</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunAndApply}
              disabled={isExecuting}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium rounded-lg text-xs shadow-md shadow-emerald-950 transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>{isExecuting ? 'Compiling...' : 'Run & Apply Strategy'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Preset Selector & Tabs Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 bg-slate-950/60 border-b border-slate-800/80 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Preset Models:
            </span>
            <select
              value={selectedPresetId}
              onChange={(e) => {
                const found = PYTHON_PRESETS.find((p) => p.id === e.target.value);
                if (found) handleSelectPreset(found);
              }}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
            >
              {PYTHON_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveTab('editor')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                activeTab === 'editor' ? 'bg-slate-800 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Code Editor</span>
            </button>
            <button
              onClick={() => setActiveTab('docs')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                activeTab === 'docs' ? 'bg-slate-800 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>API Reference</span>
            </button>
            <button
              onClick={() => setActiveTab('console')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                activeTab === 'console' ? 'bg-slate-800 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Console</span>
            </button>
          </div>
        </div>

        {/* Main Editor Body */}
        <div className="flex-1 relative overflow-hidden flex flex-col">
          {activeTab === 'editor' && (
            <div className="flex-1 flex overflow-hidden font-mono text-xs bg-[#0b101b]">
              {/* Line Numbers */}
              <div className="w-12 py-3 px-2 bg-slate-950/70 border-r border-slate-800/80 text-right text-slate-600 select-none overflow-hidden">
                {lineNumbers.map((num) => (
                  <div key={num} className="leading-5">
                    {num}
                  </div>
                ))}
              </div>

              {/* Code Textarea */}
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                spellCheck={false}
                className="flex-1 p-3 bg-transparent text-emerald-300 font-mono leading-5 resize-none focus:outline-none selection:bg-cyan-500/30 overflow-y-auto whitespace-pre"
              />
            </div>
          )}

          {activeTab === 'docs' && (
            <div className="flex-1 p-6 overflow-y-auto bg-slate-900/90 text-xs text-slate-300 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Python Algorithmic API Documentation</h3>
                <p className="text-slate-400 mt-1">
                  Your script executes directly in the browser with access to multi-decade OHLCV market arrays.
                </p>
              </div>

              <div className="border border-slate-800 rounded-xl p-4 bg-slate-950">
                <h4 className="font-semibold text-cyan-400 mb-2">Available Market Arrays:</h4>
                <ul className="space-y-1.5 text-slate-300 font-mono text-[11px]">
                  <li><strong className="text-emerald-400">closes</strong>: List of daily close prices (float)</li>
                  <li><strong className="text-emerald-400">opens</strong>: List of daily open prices (float)</li>
                  <li><strong className="text-emerald-400">highs</strong>: List of daily high prices (float)</li>
                  <li><strong className="text-emerald-400">lows</strong>: List of daily low prices (float)</li>
                  <li><strong className="text-emerald-400">volumes</strong>: List of daily traded volumes (int)</li>
                  <li><strong className="text-emerald-400">dates</strong>: List of ISO date strings ('YYYY-MM-DD')</li>
                </ul>
              </div>

              <div className="border border-slate-800 rounded-xl p-4 bg-slate-950">
                <h4 className="font-semibold text-cyan-400 mb-2">Pre-Imported Quantitative Indicators:</h4>
                <ul className="space-y-1.5 text-slate-300 font-mono text-[11px]">
                  <li><code className="text-amber-400">sma(period)</code>: Returns Simple Moving Average array</li>
                  <li><code className="text-amber-400">ema(period)</code>: Returns Exponential Moving Average array</li>
                  <li><code className="text-amber-400">rsi(period)</code>: Returns 0-100 Wilder's Relative Strength Index</li>
                  <li><code className="text-amber-400">atr(period)</code>: Returns Average True Range volatility measure</li>
                </ul>
              </div>

              <div className="border border-slate-800 rounded-xl p-4 bg-slate-950">
                <h4 className="font-semibold text-cyan-400 mb-2">Output Contract:</h4>
                <p className="text-slate-300">
                  Your script must define a list named <code className="text-emerald-400 font-mono font-bold">signals</code> of the exact same length as <code className="text-emerald-400 font-mono">closes</code>:
                </p>
                <div className="mt-2 space-y-1 font-mono text-[11px] text-slate-400">
                  <div><strong className="text-emerald-400">1</strong>: Enter Long or Hold Long</div>
                  <div><strong className="text-purple-400">-1</strong>: Enter Short or Hold Short (if direction allows)</div>
                  <div><strong className="text-slate-400">0</strong>: Flat (Cash / Exit Position)</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'console' && (
            <div className="flex-1 p-4 bg-[#080d14] font-mono text-xs text-slate-300 overflow-y-auto space-y-1.5">
              <div className="text-slate-500 pb-2 border-b border-slate-800/80">
                --- Python Execution Log Output ---
              </div>
              {consoleOutput.map((log, i) => (
                <div key={i} className="text-slate-300">
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Summary */}
        <div className="flex items-center justify-between px-5 py-3 bg-slate-950 border-t border-slate-800 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <span>Lines: {lineCount}</span>
            <span>•</span>
            <span className="text-emerald-400">Ready to execute</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const found = PYTHON_PRESETS.find((p) => p.id === selectedPresetId);
                if (found) setCode(found.code);
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Template</span>
            </button>
            <button
              onClick={handleRunAndApply}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
            >
              Apply to Simulation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
