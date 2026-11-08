/**
 * Quantitative Report Exporter
 * Generates institutional-grade PDF tear sheets, CSV exports of trade logs
 * and daily equity series, and JSON strategy manifests.
 */

import jsPDF from 'jspdf';
import { BacktestResult, StrategyParameters } from '../types/backtest';

/**
 * Export complete trade log to CSV
 */
export function exportTradesToCSV(result: BacktestResult, ticker: string): void {
  const headers = [
    'Trade ID',
    'Side',
    'Entry Date',
    'Exit Date',
    'Entry Price ($)',
    'Exit Price ($)',
    'Shares',
    'Cost Basis ($)',
    'Gross PnL ($)',
    'Net PnL ($)',
    'Return (%)',
    'Commission ($)',
    'Exit Reason',
    'Duration (Days)',
  ];

  const rows = result.trades.map((t) => [
    t.id,
    t.side,
    t.entryDate,
    t.exitDate,
    t.entryPrice.toFixed(2),
    t.exitPrice.toFixed(2),
    t.shares,
    t.costBasis.toFixed(2),
    t.grossPnL.toFixed(2),
    t.netPnL.toFixed(2),
    t.returnPct.toFixed(2) + '%',
    t.commissionPaid.toFixed(2),
    t.exitReason,
    t.durationDays,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(','))].join('\n');
  downloadBlob(csvContent, `quant_trades_${ticker}_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
}

/**
 * Export daily equity curve to CSV
 */
export function exportEquityCurveToCSV(result: BacktestResult, ticker: string): void {
  const headers = [
    'Date',
    'Strategy Equity ($)',
    'Benchmark Equity ($)',
    'Cash ($)',
    'Position Value ($)',
    'Drawdown (%)',
    'Benchmark Drawdown (%)',
    'Daily Return (%)',
    'Shares Held',
    'Close Price ($)',
  ];

  const rows = result.equityCurve.map((pt) => [
    pt.date,
    pt.strategyEquity.toFixed(2),
    pt.benchmarkEquity.toFixed(2),
    pt.cash.toFixed(2),
    pt.positionValue.toFixed(2),
    pt.drawdownPct.toFixed(2) + '%',
    pt.benchmarkDrawdownPct.toFixed(2) + '%',
    pt.dailyReturnPct.toFixed(4) + '%',
    pt.sharesHeld,
    pt.closePrice.toFixed(2),
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(','))].join('\n');
  downloadBlob(csvContent, `quant_equity_curve_${ticker}_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
}

/**
 * Generate Institutional PDF Tear Sheet using jsPDF
 */
export function generatePDFTearSheet(
  result: BacktestResult,
  params: StrategyParameters,
  ticker: string,
  timeframeLabel: string
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 16;

  // Header Title
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('QUANTITATIVE STRATEGY TEAR SHEET', margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184); // slate-400
  y += 6;
  doc.text(`Asset: ${ticker} | Period: ${timeframeLabel} | Strategy: ${params.strategyType.toUpperCase()}`, margin, y);
  doc.text(`Generated: ${new Date().toISOString().replace('T', ' ').substring(0, 19)} UTC`, pageWidth - margin - 50, y);

  y = 36;

  // KPI Highlight Banner
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 24, 2, 2, 'FD');

  const kpis = [
    { label: 'CAGR', val: `${result.metrics.cagr > 0 ? '+' : ''}${result.metrics.cagr}%`, color: result.metrics.cagr >= 0 ? [22, 163, 74] : [220, 38, 38] },
    { label: 'SHARPE RATIO', val: `${result.metrics.sharpeRatio.toFixed(2)}`, color: [15, 23, 42] },
    { label: 'SORTINO RATIO', val: `${result.metrics.sortinoRatio.toFixed(2)}`, color: [15, 23, 42] },
    { label: 'MAX DRAWDOWN', val: `-${result.metrics.maxDrawdownPct.toFixed(1)}%`, color: [220, 38, 38] },
    { label: 'WIN RATE', val: `${result.metrics.winRatePct.toFixed(1)}%`, color: [15, 23, 42] },
    { label: 'PROFIT FACTOR', val: `${result.metrics.profitFactor.toFixed(2)}`, color: [15, 23, 42] },
  ];

  const colWidth = (pageWidth - margin * 2) / kpis.length;
  kpis.forEach((kpi, idx) => {
    const x = margin + idx * colWidth + colWidth / 2;
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, x, y + 8, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.val, x, y + 17, { align: 'center' });
  });

  y += 32;

  // Section 1: Performance & Risk Statistics
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Key Performance & Risk Analytics', margin, y);
  y += 4;

  const leftTable = [
    ['Total Net Return', `${result.metrics.totalReturnPct.toFixed(1)}%`],
    ['Benchmark Return', `${result.metrics.benchmarkReturnPct.toFixed(1)}%`],
    ['Strategy CAGR', `${result.metrics.cagr.toFixed(2)}%`],
    ['Benchmark CAGR', `${result.metrics.benchmarkCagr.toFixed(2)}%`],
    ['Annualized Volatility', `${result.metrics.annualizedVol.toFixed(2)}%`],
    ['Benchmark Volatility', `${result.metrics.benchmarkVol.toFixed(2)}%`],
    ['Calmar Ratio', `${result.metrics.calmarRatio.toFixed(2)}`],
    ['Market Exposure Time', `${result.metrics.exposureTimePct.toFixed(1)}%`],
  ];

  const rightTable = [
    ['Jensen Alpha (α)', `${result.metrics.alpha.toFixed(2)}%`],
    ['Portfolio Beta (β)', `${result.metrics.beta.toFixed(2)}`],
    ['Daily VaR (95%)', `${result.metrics.var95.toFixed(2)}%`],
    ['Daily VaR (99%)', `${result.metrics.var99.toFixed(2)}%`],
    ['Expected Shortfall (CVaR)', `${result.metrics.cvar95.toFixed(2)}%`],
    ['Max Drawdown Duration', `${result.metrics.maxDrawdownDays} days`],
    ['Total Trading Fees Paid', `$${result.metrics.totalFees.toLocaleString()}`],
    ['Final Equity Valuation', `$${result.metrics.finalEquity.toLocaleString()}`],
  ];

  const tableColWidth = (pageWidth - margin * 2 - 8) / 2;

  drawMiniTable(doc, margin, y, tableColWidth, leftTable);
  drawMiniTable(doc, margin + tableColWidth + 8, y, tableColWidth, rightTable);

  y += 54;

  // Section 2: Strategy Configuration & Risk Controls
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Execution Parameters & Risk Controls', margin, y);
  y += 4;

  const configTableLeft = [
    ['Initial Capital', `$${params.initialCapital.toLocaleString()}`],
    ['Position Sizing', `${params.positionSizingType} (${params.positionSizeValue}%)`],
    ['Trading Direction', params.direction.replace('_', ' ').toUpperCase()],
    ['Leverage Multiplier', `${params.leverage}x`],
  ];

  const configTableRight = [
    ['Stop Loss', params.stopLossPct ? `${params.stopLossPct}%` : 'Disabled'],
    ['Take Profit', params.takeProfitPct ? `${params.takeProfitPct}%` : 'Disabled'],
    ['Trailing Stop', params.trailingStopPct ? `${params.trailingStopPct}%` : 'Disabled'],
    ['Circuit Breaker Max DD', params.circuitBreakerMaxDDPct ? `${params.circuitBreakerMaxDDPct}%` : 'Disabled'],
  ];

  drawMiniTable(doc, margin, y, tableColWidth, configTableLeft);
  drawMiniTable(doc, margin + tableColWidth + 8, y, tableColWidth, configTableRight);

  y += 34;

  // Section 3: Trade Execution Summary
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Trade Execution Statistics', margin, y);
  y += 4;

  const tradeStats = [
    ['Total Closed Trades', `${result.metrics.totalTrades}`],
    ['Profitable Trades', `${result.metrics.winningTrades} (${result.metrics.winRatePct.toFixed(1)}%)`],
    ['Losing Trades', `${result.metrics.losingTrades}`],
    ['Average Trade PnL', `${result.metrics.avgTradeReturnPct.toFixed(2)}%`],
    ['Average Win', `+${result.metrics.avgWinPct.toFixed(2)}%`],
    ['Average Loss', `-${result.metrics.avgLossPct.toFixed(2)}%`],
    ['Win / Loss Ratio', `${result.metrics.winLossRatio.toFixed(2)}:1`],
    ['Best Single Trade', `+${result.metrics.bestTradePct.toFixed(2)}%`],
  ];

  drawMiniTable(doc, margin, y, tableColWidth, tradeStats.slice(0, 4));
  drawMiniTable(doc, margin + tableColWidth + 8, y, tableColWidth, tradeStats.slice(4));

  y += 34;

  // Recent Representative Trades Table
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Sample Executed Trades (Last 6 Executions)', margin, y);
  y += 4;

  const sampleTrades = result.trades.slice(-6);
  drawTradesTable(doc, margin, y, pageWidth - margin * 2, sampleTrades);

  // Footer
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(148, 163, 184);
  doc.text(
    'CONFIDENTIAL & PROPRIETARY — Generated via QuantBacktest Pro Algorithmic Simulation Engine. Past performance is no guarantee of future returns.',
    pageWidth / 2,
    290,
    { align: 'center' }
  );

  doc.save(`quant_tearsheet_${ticker}_${new Date().toISOString().split('T')[0]}.pdf`);
}

function drawMiniTable(doc: jsPDF, x: number, y: number, width: number, rows: string[][]): void {
  const rowHeight = 5.2;
  rows.forEach(([label, val], idx) => {
    const rowY = y + idx * rowHeight;
    doc.setFillColor(idx % 2 === 0 ? 255 : 248, 250, 252);
    doc.rect(x, rowY - 3.8, width, rowHeight, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(label, x + 2, rowY);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(val, x + width - 2, rowY, { align: 'right' });
  });
}

function drawTradesTable(doc: jsPDF, x: number, y: number, width: number, trades: any[]): void {
  const rowHeight = 5.5;
  // Header
  doc.setFillColor(241, 245, 249);
  doc.rect(x, y, width, rowHeight, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);

  const colX = [x + 2, x + 24, x + 48, x + 72, x + 96, x + 120, x + 144, x + width - 2];
  doc.text('ID', colX[0], y + 4);
  doc.text('Side', colX[1], y + 4);
  doc.text('Entry Date', colX[2], y + 4);
  doc.text('Exit Date', colX[3], y + 4);
  doc.text('Entry ($)', colX[4], y + 4);
  doc.text('Exit ($)', colX[5], y + 4);
  doc.text('Return (%)', colX[6], y + 4);
  doc.text('Exit Reason', colX[7], y + 4, { align: 'right' });

  trades.forEach((t, i) => {
    const curY = y + (i + 1) * rowHeight;
    doc.setFillColor(i % 2 === 0 ? 255 : 250, 250, 250);
    doc.rect(x, curY, width, rowHeight, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);

    doc.text(t.id, colX[0], curY + 4);
    doc.text(t.side, colX[1], curY + 4);
    doc.text(t.entryDate, colX[2], curY + 4);
    doc.text(t.exitDate, colX[3], curY + 4);
    doc.text(`$${t.entryPrice.toFixed(2)}`, colX[4], curY + 4);
    doc.text(`$${t.exitPrice.toFixed(2)}`, colX[5], curY + 4);

    doc.setFont('helvetica', 'bold');
    if (t.returnPct >= 0) {
      doc.setTextColor(22, 163, 74);
      doc.text(`+${t.returnPct.toFixed(2)}%`, colX[6], curY + 4);
    } else {
      doc.setTextColor(220, 38, 38);
      doc.text(`${t.returnPct.toFixed(2)}%`, colX[6], curY + 4);
    }

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(t.exitReason, colX[7], curY + 4, { align: 'right' });
  });
}

function downloadBlob(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
