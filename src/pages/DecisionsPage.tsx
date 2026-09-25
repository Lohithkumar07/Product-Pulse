import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GitPullRequest,
  Sparkles,
  Plus,
  Trash2,
  TrendingUp,
  Clock,
  Layers,
  CheckCircle2,
  AlertTriangle,
  X,
  UploadCloud,
} from 'lucide-react';
import { decisionsApi } from '../api/decisions';
import { analysisApi } from '../api/analysis';
import { DecisionItem, DecisionStatus, Priority } from '../types';
import { useToast } from '../context/ToastContext';
import { useDataset } from '../context/DatasetContext';

const STATUS_OPTIONS: DecisionStatus[] = [
  'New',
  'Reviewing',
  'Planned',
  'In Progress',
  'Completed',
  'Rejected',
];

export const DecisionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const { activeDatasetId, activeDataset } = useDataset();

  const [decisions, setDecisions] = useState<DecisionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');

  // Create Decision Modal
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalFeature, setModalFeature] = useState('Core Experience');
  const [modalPriority, setModalPriority] = useState<Priority>('high');
  const [modalTrend, setModalTrend] = useState<'increasing' | 'stable' | 'decreasing'>('increasing');
  const [modalCount, setModalCount] = useState<number>(5);
  const [modalAction, setModalAction] = useState('');
  const [modalStatus, setModalStatus] = useState<DecisionStatus>('Planned');
  const [submitting, setSubmitting] = useState(false);

  const fetchDecisions = async () => {
    if (!activeDatasetId) {
      setDecisions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await decisionsApi.list(activeDatasetId, statusFilter, priorityFilter);
      setDecisions(data);
    } catch (err: any) {
      toastError('Failed to load decisions', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDecisions();
  }, [activeDatasetId, statusFilter, priorityFilter]);

  const handleStatusChange = async (id: string, newStatus: DecisionStatus) => {
    try {
      const updated = await decisionsApi.updateStatus(id, newStatus);
      setDecisions((prev) => prev.map((d) => (d.id === id ? { ...d, status: updated.status } : d)));
      success('Status updated', `Decision marked as "${newStatus}"`);
    } catch (err: any) {
      toastError('Failed to update status', err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this product decision?')) return;
    try {
      await decisionsApi.delete(id);
      setDecisions((prev) => prev.filter((d) => d.id !== id));
      success('Decision removed');
    } catch (err: any) {
      toastError('Delete failed', err.message);
    }
  };

  const handleAutoGenerate = async () => {
    if (!activeDatasetId) return;
    try {
      setGenerating(true);
      const res = await analysisApi.generateDecisions(activeDatasetId);
      let added = 0;
      for (const dec of res.decisions) {
        if (dec.title && dec.affected_feature) {
          await decisionsApi.create({
            dataset_id: activeDatasetId,
            product_id: activeDatasetId,
            title: dec.title,
            affected_feature: dec.affected_feature,
            priority: dec.priority || 'medium',
            trend: dec.trend || 'increasing',
            supporting_feedback_count: dec.supporting_feedback_count || 1,
            suggested_action: dec.suggested_action || '',
            status: 'Planned',
          });
          added++;
        }
      }
      success('Decisions synthesized', `Added ${added} new decisions from recurring feedback.`);
      fetchDecisions();
    } catch (err: any) {
      toastError('Failed to auto-generate decisions', err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalTitle.trim()) return;
    try {
      setSubmitting(true);
      await decisionsApi.create({
        dataset_id: activeDatasetId || undefined,
        product_id: activeDatasetId || undefined,
        title: modalTitle.trim(),
        affected_feature: modalFeature,
        priority: modalPriority,
        trend: modalTrend,
        supporting_feedback_count: modalCount,
        suggested_action: modalAction.trim(),
        status: modalStatus,
      });
      success('Decision added to roadmap');
      setShowModal(false);
      setModalTitle('');
      setModalAction('');
      fetchDecisions();
    } catch (err: any) {
      toastError('Failed to create decision', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!activeDatasetId) {
    return (
      <div className="p-12 bg-white border border-slate-200 rounded-3xl text-center max-w-xl mx-auto shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
          <GitPullRequest className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">No Dataset Selected</h2>
        <p className="text-xs text-slate-500 mt-2 max-w-sm mx-auto">
          Upload a CSV feedback file to auto-generate actionable product decisions based on recurring user friction.
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

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Product Decisions</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Turn recurring user problems in "{activeDataset?.name}" into actionable engineering decisions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAutoGenerate}
            disabled={generating}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors border border-indigo-200 disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
            <span>{generating ? 'Synthesizing...' : 'Auto-Generate Decisions'}</span>
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs shadow-indigo-600/20 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Decision</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 border border-slate-200/80 rounded-2xl shadow-xs text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium">Filter by Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium">Priority:</span>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
          >
            <option value="">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Decisions List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 animate-pulse space-y-3">
          <div className="h-6 bg-slate-200 rounded w-1/4 mx-auto"></div>
          <div className="h-4 bg-slate-200 rounded w-1/3 mx-auto"></div>
        </div>
      ) : decisions.length === 0 ? (
        <div className="p-12 bg-white border border-slate-200 rounded-3xl text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <GitPullRequest className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Product Decisions Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Click "Auto-Generate Decisions" to have AI analyze recurring negative feedback in this dataset and propose engineering decisions.
          </p>
          <div className="pt-2">
            <button
              onClick={handleAutoGenerate}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 mx-auto"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Auto-Generate from Feedback</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {decisions.map((dec) => (
            <div
              key={dec.id}
              className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs hover:border-slate-300 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      dec.priority === 'high'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : dec.priority === 'medium'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {dec.priority} Priority
                  </span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                    Feature: {dec.affected_feature}
                  </span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs font-medium text-indigo-600">
                    {dec.supporting_feedback_count} supporting feedback items
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900">{dec.title}</h3>

                {dec.suggested_action && (
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                    <span className="font-semibold text-slate-700">Recommended action: </span>
                    {dec.suggested_action}
                  </p>
                )}
              </div>

              {/* Status and Actions */}
              <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                <select
                  value={dec.status}
                  onChange={(e) => handleStatusChange(dec.id, e.target.value as DecisionStatus)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl border cursor-pointer focus:outline-none ${
                    dec.status === 'Completed'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : dec.status === 'In Progress'
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                      : dec.status === 'Planned'
                      ? 'bg-slate-100 text-slate-800 border-slate-300'
                      : dec.status === 'Rejected'
                      ? 'bg-rose-50 text-rose-700 border-rose-300'
                      : 'bg-amber-50 text-amber-800 border-amber-300'
                  }`}
                >
                  {STATUS_OPTIONS.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => handleDelete(dec.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Delete decision"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Manual Decision Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">New Product Decision</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Decision Title *
                </label>
                <input
                  type="text"
                  value={modalTitle}
                  onChange={(e) => setModalTitle(e.target.value)}
                  placeholder="e.g. Implement background worker for ingestion"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Affected Feature
                  </label>
                  <input
                    type="text"
                    value={modalFeature}
                    onChange={(e) => setModalFeature(e.target.value)}
                    placeholder="e.g. Core Experience, Search, Checkout"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Priority
                  </label>
                  <select
                    value={modalPriority}
                    onChange={(e) => setModalPriority(e.target.value as Priority)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <select
                    value={modalStatus}
                    onChange={(e) => setModalStatus(e.target.value as DecisionStatus)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400"
                  >
                    {STATUS_OPTIONS.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Supporting Feedback Count
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={modalCount}
                    onChange={(e) => setModalCount(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Suggested Action Plan
                </label>
                <textarea
                  rows={3}
                  value={modalAction}
                  onChange={(e) => setModalAction(e.target.value)}
                  placeholder="Outline engineering steps or product specifications..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Add Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
