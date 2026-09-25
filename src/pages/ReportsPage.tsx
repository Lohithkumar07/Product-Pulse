import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Sparkles,
  Download,
  Printer,
  Calendar,
  CheckCircle2,
  TrendingUp,
  Layers,
  ArrowRight,
  RefreshCw,
  UploadCloud,
} from 'lucide-react';
import { reportsApi } from '../api/reports';
import { ReportItem } from '../types';
import { useToast } from '../context/ToastContext';
import { useDataset } from '../context/DatasetContext';

export const ReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const { activeDatasetId, activeDataset } = useDataset();

  const [period, setPeriod] = useState<'7d' | '30d' | '3m' | '1y'>('30d');
  const [generating, setGenerating] = useState(false);
  const [reportData, setReportData] = useState<ReportItem | null>(null);

  const handleGenerateReport = async () => {
    if (!activeDatasetId) {
      toastError('No active dataset', 'Please select or upload a dataset first.');
      return;
    }
    try {
      setGenerating(true);
      const rep = await reportsApi.generate(activeDatasetId, period);
      setReportData(rep);
      success('Report Generated', `Synthesized ${rep.report.product_name} intelligence report.`);
    } catch (err: any) {
      toastError('Failed to generate report', err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    if (!reportData) return;
    const r = reportData.report;
    const lines = [
      `ProductPulse Feedback Intelligence Report`,
      `Product,${r.product_name}`,
      `Period,${r.analysis_period}`,
      `Generated At,${r.generated_at}`,
      ``,
      `METRICS SUMMARY`,
      `Total Feedback,${r.metrics.total_feedback}`,
      `Average Rating,${r.metrics.average_rating}`,
      `Positive %,${r.metrics.positive_percentage}%`,
      `Neutral %,${r.metrics.neutral_percentage}%`,
      `Negative %,${r.metrics.negative_percentage}%`,
      `High Priority Issues,${r.metrics.high_priority_issues}`,
      ``,
      `AI EXECUTIVE SUMMARY`,
      `"${r.ai_summary.overall_summary.replace(/"/g, '""')}"`,
      ``,
      `TOP PROBLEMS`,
      ...r.ai_summary.top_problems.map((p) => `"${p.issue}",${p.count},${p.severity},"${p.details}"`),
      ``,
      `RECOMMENDED ACTIONS`,
      ...r.ai_summary.recommended_actions.map((a, i) => `${i + 1},"${a.replace(/"/g, '""')}"`),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ProductPulse_Report_${r.product_name.replace(/\s+/g, '_')}_${r.analysis_period}.csv`;
    link.click();
    success('CSV Export downloaded');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header & Generation Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Intelligence Reports</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Generate and export stakeholder-ready product feedback intelligence reports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs">
            {(['7d', '30d', '3m', '1y'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  period === p ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            onClick={handleGenerateReport}
            disabled={generating}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
            <span>{generating ? 'Compiling Report...' : 'Generate Report'}</span>
          </button>
        </div>
      </div>

      {/* Main Report Document View */}
      {!reportData && !generating ? (
        <div className="p-16 text-center bg-white border border-slate-200/80 rounded-3xl shadow-xs space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto border border-indigo-100">
            <FileText className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Ready to Generate Intelligence Report</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Synthesize feedback volume, sentiment shifts, recurring problems, and active roadmap decisions for selected duration.
            </p>
          </div>
          <button
            onClick={handleGenerateReport}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs"
          >
            Generate 30-Day Report Now
          </button>
        </div>
      ) : generating ? (
        <div className="p-16 text-center bg-white border border-slate-200/80 rounded-3xl shadow-xs space-y-4 animate-pulse">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
          <h3 className="text-base font-bold text-slate-800">Compiling Feedback Intelligence Report</h3>
          <p className="text-xs text-slate-400">Aggregating database records and querying AI synthesis model...</p>
        </div>
      ) : (
        reportData && (
          <div className="space-y-6">
            {/* Action Bar for Generated Report */}
            <div className="flex items-center justify-between print:hidden">
              <span className="text-xs text-slate-400 font-medium">
                Generated {new Date(reportData.report.generated_at).toLocaleString()}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportCsv}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / Export PDF</span>
                </button>
              </div>
            </div>

            {/* Document Sheet */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-8 sm:p-12 shadow-sm space-y-8 font-sans print:border-none print:shadow-none print:p-0">
              {/* Document Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                      ProductPulse Intelligence
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                    {reportData.report.product_name}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Analysis Period: <strong className="text-slate-800">{reportData.report.analysis_period}</strong>
                  </p>
                </div>

                <div className="text-left sm:text-right text-xs text-slate-400">
                  <p className="font-semibold text-slate-700">Confidential Executive Brief</p>
                  <p className="mt-0.5">{reportData.report.generated_at.split('T')[0]}</p>
                </div>
              </div>

              {/* KPI Summary 4-Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                    Total Feedback
                  </span>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {reportData.report.metrics.total_feedback}
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                    Average Rating
                  </span>
                  <p className="text-2xl font-bold text-amber-600 mt-1">
                    {reportData.report.metrics.average_rating} ★
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                    Sentiment Ratio
                  </span>
                  <div className="text-sm font-bold text-slate-900 mt-1 flex items-center gap-2">
                    <span className="text-emerald-600">{reportData.report.metrics.positive_percentage}% Pos</span>
                    <span className="text-slate-300">/</span>
                    <span className="text-rose-600">{reportData.report.metrics.negative_percentage}% Neg</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                    High Priority
                  </span>
                  <p className="text-2xl font-bold text-rose-600 mt-1">
                    {reportData.report.metrics.high_priority_issues}
                  </p>
                </div>
              </div>

              {/* AI Executive Summary */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  01. AI Executive Summary
                </h3>
                <p className="text-sm text-slate-700 leading-relaxed p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  {reportData.report.ai_summary.overall_summary}
                </p>
              </div>

              {/* Top Recurring Problems */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  02. Top Recurring User Friction Points
                </h3>
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
                  {reportData.report.ai_summary.top_problems.map((prob, idx) => (
                    <div key={idx} className="p-4 flex items-start justify-between gap-4">
                      <div>
                        <span className="font-semibold text-slate-900 text-sm block">
                          {idx + 1}. {prob.issue}
                        </span>
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{prob.details}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-slate-800">{prob.count} reports</span>
                        <span className="block text-[10px] font-bold text-rose-600 uppercase mt-0.5">
                          {prob.severity} Priority
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommended Actions */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  03. Recommended Roadmap & Engineering Decisions
                </h3>
                <div className="space-y-2">
                  {reportData.report.ai_summary.recommended_actions.map((act, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-xl text-xs text-slate-800 flex items-start gap-2.5 leading-relaxed"
                    >
                      <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                      <span>{act}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Product Decisions */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  04. Active Product Decision Register
                </h3>
                <table className="w-full text-left text-xs border border-slate-100 rounded-xl overflow-hidden">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                    <tr>
                      <th className="py-2.5 px-3">Decision</th>
                      <th className="py-2.5 px-3">Feature</th>
                      <th className="py-2.5 px-3">Priority</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.report.product_decisions.map((dec) => (
                      <tr key={dec.id}>
                        <td className="py-2.5 px-3 font-medium text-slate-900">{dec.title}</td>
                        <td className="py-2.5 px-3 text-slate-600">{dec.affected_feature}</td>
                        <td className="py-2.5 px-3 font-semibold capitalize text-slate-700">{dec.priority}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-medium text-[11px]">
                            {dec.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
};
