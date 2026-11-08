/**
 * Secure Cloud Storage & Strategy Vault Modal
 * Manage, version, backup, and restore quantitative strategies.
 */

import React, { useState } from 'react';
import { SavedStrategy, StrategyParameters } from '../types/backtest';
import {
  loadStrategyVault,
  upsertStrategy,
  deleteStrategyFromVault,
  exportVaultJSON,
  importVaultJSON,
  getCloudSyncMeta,
} from '../services/cloudStorage';
import { Cloud, Lock, Download, Upload, Trash2, CheckCircle2, BookmarkPlus, X, Tag } from 'lucide-react';

interface StrategyVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentParams: StrategyParameters;
  currentTicker: string;
  onLoadStrategy: (strategy: SavedStrategy) => void;
  lastSharpe?: number;
  lastReturn?: number;
}

export const StrategyVaultModal: React.FC<StrategyVaultModalProps> = ({
  isOpen,
  onClose,
  currentParams,
  currentTicker,
  onLoadStrategy,
  lastSharpe,
  lastReturn,
}) => {
  const [strategies, setStrategies] = useState<SavedStrategy[]>(() => loadStrategyVault());
  const [syncMeta, setSyncMeta] = useState(() => getCloudSyncMeta());
  const [isSavingNew, setIsSavingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTags, setNewTags] = useState('Momentum, Trend');
  const [importError, setImportError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSaveCurrent = () => {
    if (!newName.trim()) return;

    const newStrat: SavedStrategy = {
      id: `strat_${Date.now()}`,
      name: newName.trim(),
      description: newDesc.trim() || 'Custom quantitative strategy configuration',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ticker: currentTicker,
      params: currentParams,
      tags: newTags.split(',').map((t) => t.trim()).filter(Boolean),
      lastSharpe,
      lastTotalReturn: lastReturn,
    };

    const updated = upsertStrategy(newStrat);
    setStrategies(updated);
    setSyncMeta(getCloudSyncMeta());
    setIsSavingNew(false);
    setNewName('');
    setNewDesc('');
  };

  const handleDelete = (id: string) => {
    const updated = deleteStrategyFromVault(id);
    setStrategies(updated);
    setSyncMeta(getCloudSyncMeta());
  };

  const handleExportBackup = () => {
    const jsonStr = exportVaultJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quant_vault_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const updated = importVaultJSON(text);
        setStrategies(updated);
        setSyncMeta(getCloudSyncMeta());
        setImportError(null);
      } catch (err: any) {
        setImportError('Invalid backup file format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl flex flex-col shadow-2xl overflow-hidden max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-100">Secure Cloud Strategy Vault</h2>
                <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <Lock className="w-3 h-3" /> Encrypted Cloud Sync
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {strategies.length} quantitative models securely synced
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 bg-slate-950/60 border-b border-slate-800 text-xs">
          <button
            onClick={() => setIsSavingNew(!isSavingNew)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors cursor-pointer"
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
            <span>Save Active Strategy</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportBackup}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700"
              title="Download encrypted JSON backup"
            >
              <Download className="w-3 h-3" />
              <span>Export Vault</span>
            </button>

            <label className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700 cursor-pointer">
              <Upload className="w-3 h-3" />
              <span>Import</span>
              <input type="file" accept=".json,.qbak" onChange={handleImportFile} className="hidden" />
            </label>
          </div>
        </div>

        {/* Save New Strategy Form */}
        {isSavingNew && (
          <div className="p-4 bg-slate-950 border-b border-slate-800 space-y-3 animate-fade-in text-xs">
            <h4 className="font-semibold text-slate-200">Save Current Configuration to Vault</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-400">Strategy Name</label>
                <input
                  type="text"
                  placeholder="e.g. Adaptive Dual EMA on NVDA"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">Tags (comma separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Trend, High Sharpe, AI"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-slate-400">Notes & Hypothesis</label>
              <input
                type="text"
                placeholder="Brief summary of risk rules and thesis..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsSavingNew(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCurrent}
                disabled={!newName.trim()}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-lg font-medium"
              >
                Commit to Vault
              </button>
            </div>
          </div>
        )}

        {importError && (
          <div className="px-6 py-2 bg-rose-950/60 text-rose-300 text-xs border-b border-rose-800/80">
            {importError}
          </div>
        )}

        {/* Strategies List */}
        <div className="flex-1 p-6 overflow-y-auto space-y-3">
          {strategies.map((strat) => (
            <div
              key={strat.id}
              className="p-4 bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-xl flex flex-wrap items-center justify-between gap-4 transition-all"
            >
              <div className="space-y-1.5 max-w-md">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-slate-100 text-sm">{strat.name}</h4>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                    {strat.ticker}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 uppercase">
                    {strat.params.strategyType}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{strat.description}</p>
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {strat.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-4">
                {strat.lastSharpe !== undefined && (
                  <div className="text-right font-mono text-xs tabular-nums">
                    <div className="text-[10px] text-slate-500">Sharpe / Return</div>
                    <div className="font-bold text-emerald-400">
                      {strat.lastSharpe.toFixed(2)} | +{strat.lastTotalReturn?.toFixed(0)}%
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onLoadStrategy(strat);
                      onClose();
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
                  >
                    Load Strategy
                  </button>
                  <button
                    onClick={() => handleDelete(strat.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                    title="Delete strategy"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
