import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ThumbsUp,
  ThumbsDown,
  UploadCloud,
} from 'lucide-react';
import { analysisApi } from '../api/analysis';
import { dashboardApi } from '../api/dashboard';
import { AISummary } from '../types';
import { useToast } from '../context/ToastContext';
import { useDataset } from '../context/DatasetContext';

export const InsightsPage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const { activeDatasetId, activeDataset } = useDataset();

  const [summary, setSummary] = useState<AISummary | null>(null);
  const [topics, setTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInsights = async () => {
    if (!activeDatasetId) {
      setSummary(null);
      setTopics([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [summ, top] = await Promise.all([
        analysisApi.getSummary(activeDatasetId),
        dashboardApi.getTopics(activeDatasetId),
      ]);
      setSummary(summ);
      setTopics(top.topics || []);
    } catch (err: any) {
      toastError('Failed to fetch insights', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [activeDatasetId]);

  const handleRefresh = async () => {
    if (!activeDatasetId) return;
    try {
      setRefreshing(true);
      const summ = await analysisApi.getSummary(activeDatasetId);
      setSummary(summ);
      success('AI Intelligence Refreshed');
    } catch (err: any) {
      toastError('Refresh failed', err.message);
    } finally {
      setRefreshing(false);
    }
  };

  if (!activeDatasetId) {
    return (
      <div className="p-12 bg-white border border-slate-200 rounded-3xl text-center max-w-xl mx-auto shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">No Dataset Selected</h2>
        <p className="text-xs text-slate-500 mt-2 max-w-sm mx-auto">
          Upload a CSV feedback file to generate AI intelligence, sentiment breakdowns, and strategic recommendations.
        </p>
        <button
          onClick={() => navigate('/import')}
          className="mt-6 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 mx-auto"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload CSV File</span>
        </button>
      </div>
    );
  }

  if (loading && !summary) {
    return (
      <div className="space-y-6 animate-pulse max-w-6xl mx-auto">
        <div className="h-10 bg-slate-200 rounded w-1/4"></div>
        <div className="h-44 bg-slate-200 rounded-3xl"></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-60 bg-slate-200 rounded-2xl"></div>
          <div className="h-60 bg-slate-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">AI Insights</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated feedback synthesis, topic clustering, and strategic recommendations for "{activeDataset?.name}".
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50"
        >
          <Sparkles className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Analyzing...' : 'Re-run AI Analysis'}</span>
        </button>
      </div>

      {/* AI Overview Banner */}
      {summary && (
        <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Executive Synthesis</span>
          </div>
          <p className="text-base text-slate-800 leading-relaxed font-normal">
            {summary.overall_summary}
          </p>
        </div>
      )}

      {/* Dual Cards: What Users Like & Dislike */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* What users like */}
          <div className="p-6 bg-white border border-emerald-200/60 rounded-3xl shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
              <ThumbsUp className="w-4 h-4 text-emerald-600" />
              <span>What Users Like</span>
            </div>
            <ul className="space-y-3">
              {summary.positive_points.map((pt, i) => (
                <li key={i} className="flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    ✓
                  </span>
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* What users dislike */}
          <div className="p-6 bg-white border border-rose-200/60 rounded-3xl shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
              <ThumbsDown className="w-4 h-4 text-rose-600" />
              <span>What Users Dislike</span>
            </div>
            <ul className="space-y-3">
              {summary.negative_points.map((pt, i) => (
                <li key={i} className="flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed">
                  <span className="w-4 h-4 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    ✕
                  </span>
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Top Problems Section */}
      {summary && summary.top_problems.length > 0 && (
        <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Top Recurring Problems
              </h2>
            </div>
            <span className="text-xs text-slate-400">Ranked by user friction volume</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {summary.top_problems.map((prob, idx) => (
              <div
                key={idx}
                className="p-4 bg-slate-50 border border-slate-200/70 rounded-2xl flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        prob.severity.toLowerCase() === 'high'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {prob.severity} Priority
                    </span>
                    <span className="text-xs font-bold text-slate-700">{prob.count} items</span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 mt-2">{prob.issue}</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{prob.details}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Emerging Trends & Recommended Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Emerging Trends */}
        {summary && (
          <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
              <TrendingUp className="w-4 h-4" />
              <span>Emerging Trends</span>
            </div>
            <div className="space-y-3">
              {summary.emerging_trends.map((tr, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl text-xs text-slate-700">
                  <span className="font-bold text-indigo-600">0{i + 1}.</span>
                  <span className="leading-relaxed">{tr}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommended Actions */}
        {summary && (
          <div className="p-6 bg-slate-900 text-white rounded-3xl shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>Recommended Engineering Actions</span>
            </div>
            <div className="space-y-3">
              {summary.recommended_actions.map((act, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-slate-800/80 border border-slate-700/60 rounded-xl text-xs text-slate-200">
                  <span className="font-bold text-emerald-400 shrink-0">→</span>
                  <span className="leading-relaxed">{act}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Topic Analysis Grid */}
      <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
          Topic Breakdown Across Feedback
        </h2>

        {topics.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            No topics extracted yet for this dataset.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {topics.map((t, idx) => (
              <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200/70 rounded-xl">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">{t.topic}</span>
                  <span className="text-indigo-600 font-bold">{t.total}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1.5">
                  <span className="text-emerald-600">{t.positive} pos</span>
                  <span>·</span>
                  <span className="text-rose-600">{t.negative} neg</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
