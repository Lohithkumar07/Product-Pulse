import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  AlertTriangle,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  UploadCloud,
  Database,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { dashboardApi } from '../api/dashboard';
import { feedbackApi } from '../api/feedback';
import { decisionsApi } from '../api/decisions';
import { analysisApi } from '../api/analysis';
import {
  DashboardOverview,
  SentimentBreakdown,
  TrendPoint,
  TopIssue,
  FeedbackItem,
  DecisionItem,
  AISummary,
} from '../types';
import { useToast } from '../context/ToastContext';
import { useDataset } from '../context/DatasetContext';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const { datasets, activeDataset, activeDatasetId, setActiveDatasetId, isDemo, loadDemoData } = useDataset();

  const [period, setPeriod] = useState<'7d' | '30d' | '3m' | '1y'>('30d');
  const [loading, setLoading] = useState(true);
  const [refreshingAI, setRefreshingAI] = useState(false);

  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [sentimentData, setSentimentData] = useState<SentimentBreakdown | null>(null);
  const [trendPoints, setTrendPoints] = useState<TrendPoint[]>([]);
  const [topIssues, setTopIssues] = useState<TopIssue[]>([]);
  const [recentFeedback, setRecentFeedback] = useState<FeedbackItem[]>([]);
  const [recentDecisions, setRecentDecisions] = useState<DecisionItem[]>([]);
  const [aiSummary, setAiSummary] = useState<AISummary | null>(null);

  const fetchData = async () => {
    if (!activeDatasetId) {
      setLoading(false);
      setOverview(null);
      setSentimentData(null);
      setTrendPoints([]);
      setTopIssues([]);
      setRecentFeedback([]);
      setRecentDecisions([]);
      setAiSummary(null);
      return;
    }

    try {
      setLoading(true);
      const [ov, sent, tr, top, fbList, decList, summ] = await Promise.all([
        dashboardApi.getOverview(activeDatasetId, period),
        dashboardApi.getSentiment(activeDatasetId),
        dashboardApi.getTrends(activeDatasetId, period),
        dashboardApi.getTopics(activeDatasetId),
        feedbackApi.list({ datasetId: activeDatasetId, limit: 5 }),
        decisionsApi.list(activeDatasetId),
        analysisApi.getSummary(activeDatasetId),
      ]);

      setOverview(ov);
      setSentimentData(sent);
      setTrendPoints(tr.trends);
      setTopIssues(top.top_issues);
      setRecentFeedback(fbList.items);
      setRecentDecisions(decList.slice(0, 3));
      setAiSummary(summ);
    } catch (err: any) {
      toastError('Failed to load dashboard data', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeDatasetId, period]);

  const handleGenerateAI = async () => {
    if (!activeDatasetId) return;
    try {
      setRefreshingAI(true);
      const summ = await analysisApi.getSummary(activeDatasetId);
      setAiSummary(summ);
      success('AI Product Intelligence refreshed', 'Updated latest summaries and recommendations.');
    } catch (err: any) {
      toastError('AI generation failed', err.message);
    } finally {
      setRefreshingAI(false);
    }
  };

  if (loading && !overview) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-12 bg-slate-200 rounded-lg w-1/3"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-xl"></div>
          ))}
        </div>
        <div className="h-80 bg-slate-200 rounded-xl"></div>
      </div>
    );
  }

  // Empty state when no dataset is loaded or total feedback is 0
  if (!activeDatasetId || !overview || overview.total_feedback === 0) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-200/80">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Product Overview
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Feedback intelligence and AI product decisions.
            </p>
          </div>
          {datasets.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Dataset:</span>
              <select
                value={activeDatasetId || ''}
                onChange={(e) => setActiveDatasetId(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
              >
                {datasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.row_count} rows)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="p-12 bg-white border border-slate-200 rounded-3xl text-center max-w-2xl mx-auto shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
            <UploadCloud className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">No Feedback Dataset Loaded</h2>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
            Upload your CSV feedback file to analyze sentiment, dynamically detect topics and issue clusters, and generate actionable product decisions.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            <button
              onClick={() => navigate('/import')}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-xs shadow-indigo-600/20 transition-all flex items-center gap-2"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload CSV File</span>
            </button>
            <button
              onClick={async () => {
                await loadDemoData();
                success('Demo dataset loaded', 'Loaded SaaS Flow Analytics demo feedback.');
              }}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-colors flex items-center gap-2"
            >
              <Database className="w-4 h-4 text-slate-500" />
              <span>Load Sample Demo Data</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const sentimentPieData = sentimentData?.breakdown.map((item) => ({
    name: item.label,
    value: item.count,
    color: item.color,
  })) || [];

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold tracking-wider text-indigo-600 uppercase">
              Dataset Intelligence
            </span>
            {isDemo && (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-md uppercase tracking-wider">
                Demo Dataset
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-0.5">
            {activeDataset?.name || 'Product Overview'}
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-xl">
            {overview.ai_takeaway}
          </p>
        </div>

        {/* Controls: Dataset Selector & Date Range */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Dataset selector */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 shadow-xs">
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-slate-400">Dataset:</span>
            <select
              value={activeDatasetId || ''}
              onChange={(e) => setActiveDatasetId(e.target.value)}
              className="bg-transparent font-semibold text-slate-900 focus:outline-none cursor-pointer max-w-[160px] truncate"
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.row_count} rows)
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Selector */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
            {(['7d', '30d', '3m', '1y'] as const).map((p) => {
              const labelMap = { '7d': '7 Days', '30d': '30 Days', '3m': '3 Months', '1y': '1 Year' };
              return (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    period === p
                      ? 'bg-white text-slate-900 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {labelMap[p]}
                </button>
              );
            })}
          </div>

          {/* AI Insights Action Button */}
          <button
            onClick={handleGenerateAI}
            disabled={refreshingAI}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs shadow-indigo-600/20 transition-all disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${refreshingAI ? 'animate-spin' : ''}`} />
            <span>{refreshingAI ? 'Analyzing...' : 'Generate AI Insights'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Feedback */}
        <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider">Total Feedback</span>
            <MessageSquare className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              {overview.total_feedback.toLocaleString()}
            </span>
            <span className="flex items-center text-xs font-semibold text-slate-600">
              <ArrowUpRight className="w-3.5 h-3.5" />
              {overview.trends.total_change}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Total analyzed records</p>
        </div>

        {/* Positive */}
        <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider">Positive</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-emerald-600">
              {overview.positive_percentage}%
            </span>
            <span className="flex items-center text-xs font-semibold text-emerald-600">
              <ArrowUpRight className="w-3.5 h-3.5" />
              {overview.trends.positive_change}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{overview.positive_count} satisfied reviews</p>
        </div>

        {/* Neutral */}
        <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider">Neutral</span>
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-700">
              {overview.neutral_percentage}%
            </span>
            <span className="flex items-center text-xs font-semibold text-slate-500">
              <ArrowDownRight className="w-3.5 h-3.5" />
              {overview.trends.neutral_change}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{overview.neutral_count} general inquiries</p>
        </div>

        {/* Negative */}
        <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider">Negative</span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-rose-600">
              {overview.negative_percentage}%
            </span>
            <span className="flex items-center text-xs font-semibold text-rose-600">
              <ArrowUpRight className="w-3.5 h-3.5" />
              {overview.trends.negative_change}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{overview.negative_count} complaints / issues</p>
        </div>

        {/* High Priority Issues */}
        <div className="p-4 bg-white border border-rose-200/60 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-rose-600">
            <span className="text-xs font-semibold uppercase tracking-wider">High Priority</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-rose-700">
              {overview.high_priority_issues}
            </span>
            <span className="text-xs font-medium text-rose-600">
              {overview.trends.high_priority_change}
            </span>
          </div>
          <p className="text-[11px] text-rose-500/80 mt-1">Requires immediate action</p>
        </div>
      </div>

      {/* Primary Section: Feedback Trend & Sentiment Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Feedback Volume Line / Area Chart (2 cols) */}
        <div className="lg:col-span-2 p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Feedback Volume</h2>
              <p className="text-xs text-slate-400">Total, positive, and negative submissions over time</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                <span>Total</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>Positive</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                <span>Negative</span>
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendPoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="posGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="negGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickFormatter={(val) => val.slice(5)}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#totalGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="positive"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#posGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="negative"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#negGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sentiment Section & AI Interpretation (1 col) */}
        <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Sentiment Distribution</h2>
            <p className="text-xs text-slate-400">Cohort feedback breakdown</p>

            {/* Donut Chart */}
            <div className="h-44 w-full my-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sentimentPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {sentimentPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Values table */}
            <div className="grid grid-cols-3 gap-2 text-center py-2 border-y border-slate-100">
              <div>
                <p className="text-xs text-emerald-600 font-semibold">Positive</p>
                <p className="text-sm font-bold text-slate-900">{overview.positive_percentage}%</p>
                <p className="text-[10px] text-slate-400">{overview.positive_count}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold">Neutral</p>
                <p className="text-sm font-bold text-slate-900">{overview.neutral_percentage}%</p>
                <p className="text-[10px] text-slate-400">{overview.neutral_count}</p>
              </div>
              <div>
                <p className="text-xs text-rose-600 font-semibold">Negative</p>
                <p className="text-sm font-bold text-slate-900">{overview.negative_percentage}%</p>
                <p className="text-[10px] text-slate-400">{overview.negative_count}</p>
              </div>
            </div>
          </div>

          {/* AI Interpretation box */}
          <div className="mt-4 p-3 bg-slate-50 border border-slate-200/70 rounded-xl text-xs text-slate-600 leading-relaxed">
            <span className="font-semibold text-slate-800 block mb-0.5">AI Interpretation:</span>
            {sentimentData?.ai_interpretation}
          </div>
        </div>
      </div>

      {/* Top Issues Section */}
      <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Top Issues</h2>
            <p className="text-xs text-slate-400">Ranked recurring user friction points</p>
          </div>
          <button
            onClick={() => navigate('/decisions')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            Convert to decisions <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {topIssues.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">
              No recurring issues detected in this dataset yet.
            </div>
          ) : (
            topIssues.slice(0, 5).map((issue) => (
              <div
                key={issue.rank}
                onClick={() => navigate(`/feedback?topic=${encodeURIComponent(issue.topic)}`)}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/80 px-2 rounded-xl cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs">
                    {issue.rank}
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{issue.issue_name}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span>{issue.topic}</span>
                      <span>·</span>
                      <span className="text-rose-600 font-medium">{issue.negative_percentage}% negative</span>
                      <span>·</span>
                      <span>{issue.trend}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                      issue.priority === 'High'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {issue.priority} Priority
                  </span>
                  <span className="text-xs font-bold text-slate-800 min-w-24 text-right">
                    {issue.feedback_count} feedback
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* AI Product Summary Card */}
      {aiSummary && (
        <div className="p-6 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-white rounded-3xl shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-indigo-900/60 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center border border-indigo-500/30">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold tracking-tight">AI Product Summary</h2>
                <p className="text-xs text-slate-400">Synthesized from customer feedback intelligence</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/insights')}
              className="px-3 py-1.5 bg-indigo-600/80 hover:bg-indigo-600 text-xs font-semibold rounded-xl text-white transition-colors"
            >
              View full insights
            </button>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 mt-4 leading-relaxed font-normal">
            {aiSummary.overall_summary}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 pt-6 border-t border-indigo-900/40">
            {/* What users like */}
            <div>
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
                What users like
              </h3>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {aiSummary.positive_points.slice(0, 3).map((p, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-400 shrink-0">✓</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* What users dislike */}
            <div>
              <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-2">
                What users dislike
              </h3>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {aiSummary.negative_points.slice(0, 3).map((p, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-rose-400 shrink-0">✕</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* What changed */}
            <div>
              <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2">
                Emerging trends
              </h3>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {aiSummary.emerging_trends.slice(0, 3).map((t, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-indigo-400 shrink-0">→</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Recommended Action Box */}
          <div className="mt-6 p-3.5 bg-indigo-900/30 border border-indigo-500/20 rounded-xl flex items-center justify-between">
            <div className="text-xs text-slate-200">
              <span className="font-semibold text-indigo-300">Recommended action: </span>
              {aiSummary.recommended_actions[0] || 'Prioritize resolution for highest-frequency user friction points.'}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Dual Grid: Recent Feedback & Recent Decisions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Feedback */}
        <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Recent Feedback</h2>
                <p className="text-xs text-slate-400">Incoming feedback in current dataset</p>
              </div>
              <button
                onClick={() => navigate('/feedback')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                View all <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {recentFeedback.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No feedback items found.
                </div>
              ) : (
                recentFeedback.map((fb) => (
                  <div
                    key={fb.id}
                    onClick={() => navigate(`/feedback/${fb.id}`)}
                    className="py-3 cursor-pointer group hover:bg-slate-50/80 px-2 rounded-xl transition-colors"
                  >
                    <p className="text-xs sm:text-sm text-slate-800 font-medium group-hover:text-indigo-600 transition-colors line-clamp-2">
                      "{fb.content}"
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1.5">
                      <span
                        className={`font-semibold capitalize ${
                          fb.sentiment === 'positive'
                            ? 'text-emerald-600'
                            : fb.sentiment === 'negative'
                            ? 'text-rose-600'
                            : 'text-slate-600'
                        }`}
                      >
                        {fb.sentiment}
                      </span>
                      <span>·</span>
                      <span>{fb.topic}</span>
                      <span>·</span>
                      <span
                        className={
                          fb.priority === 'high'
                            ? 'text-rose-600 font-medium'
                            : 'text-slate-500'
                        }
                      >
                        {fb.priority.toUpperCase()}
                      </span>
                      <span>·</span>
                      <span>{fb.source}</span>
                      <span>·</span>
                      <span>{fb.date}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent Decisions */}
        <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Recent Decisions</h2>
                <p className="text-xs text-slate-400">Roadmap actions derived from feedback</p>
              </div>
              <button
                onClick={() => navigate('/decisions')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                View decisions <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {recentDecisions.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No decisions generated for this dataset yet.
                </div>
              ) : (
                recentDecisions.map((dec) => (
                  <div key={dec.id} className="py-3 px-2 rounded-xl">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-slate-900">{dec.title}</h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                          dec.status === 'Completed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : dec.status === 'In Progress'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {dec.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                      <span>{dec.supporting_feedback_count} supporting feedback items</span>
                      <span>·</span>
                      <span className="font-semibold text-slate-700">{dec.priority.toUpperCase()} priority</span>
                      <span>·</span>
                      <span>Feature: {dec.affected_feature}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
