import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  RotateCcw,
  Download,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  Sparkles,
  X,
  UploadCloud,
} from 'lucide-react';
import { feedbackApi, FeedbackQueryParams } from '../api/feedback';
import { dashboardApi } from '../api/dashboard';
import { FeedbackItem } from '../types';
import { useToast } from '../context/ToastContext';
import { useDataset } from '../context/DatasetContext';

export const FeedbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { success, error: toastError } = useToast();
  const { activeDatasetId, activeDataset } = useDataset();

  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [availableTopics, setAvailableTopics] = useState<string[]>([]);

  // Filters state
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [sentiment, setSentiment] = useState(searchParams.get('sentiment') || '');
  const [topic, setTopic] = useState(searchParams.get('topic') || '');
  const [priority, setPriority] = useState(searchParams.get('priority') || '');
  const [source, setSource] = useState(searchParams.get('source') || '');
  const [rating, setRating] = useState<number | undefined>(
    searchParams.get('rating') ? parseInt(searchParams.get('rating')!, 10) : undefined
  );

  // New feedback modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newRating, setNewRating] = useState(4);
  const [newSource, setNewSource] = useState('Website');
  const [submitting, setSubmitting] = useState(false);

  // Fetch available topics for the current dataset
  useEffect(() => {
    if (!activeDatasetId) {
      setAvailableTopics([]);
      return;
    }
    dashboardApi
      .getTopics(activeDatasetId)
      .then((res) => {
        const topics = (res.topics || []).map((t: any) => t.topic).filter(Boolean);
        setAvailableTopics(topics);
      })
      .catch(() => {
        setAvailableTopics([]);
      });
  }, [activeDatasetId]);

  const fetchFeedback = useCallback(async () => {
    if (!activeDatasetId) {
      setItems([]);
      setTotal(0);
      setTotalPages(1);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const params: FeedbackQueryParams = {
        datasetId: activeDatasetId,
        page,
        limit: 15,
        search: search.trim() || undefined,
        sentiment: sentiment || undefined,
        topic: topic || undefined,
        priority: priority || undefined,
        source: source || undefined,
        rating: rating,
      };

      const res = await feedbackApi.list(params);
      setItems(res.items);
      setTotal(res.pagination.total);
      setTotalPages(res.pagination.total_pages);
    } catch (err: any) {
      toastError('Failed to fetch feedback', err.message);
    } finally {
      setLoading(false);
    }
  }, [activeDatasetId, page, search, sentiment, topic, priority, source, rating]);

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFeedback();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchFeedback]);

  const handleResetFilters = () => {
    setSearch('');
    setSentiment('');
    setTopic('');
    setPriority('');
    setSource('');
    setRating(undefined);
    setPage(1);
    setSearchParams({});
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this feedback item permanently?')) return;
    try {
      await feedbackApi.delete(id);
      success('Feedback item removed');
      fetchFeedback();
    } catch (err: any) {
      toastError('Failed to delete', err.message);
    }
  };

  const handleAddFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) {
      toastError('Error', 'Feedback content is required');
      return;
    }
    try {
      setSubmitting(true);
      await feedbackApi.create({
        dataset_id: activeDatasetId || undefined,
        content: newContent.trim(),
        rating: newRating,
        source: newSource,
      });
      success('Feedback recorded & analyzed', 'AI enriched sentiment and assigned topic.');
      setNewContent('');
      setShowAddModal(false);
      fetchFeedback();
    } catch (err: any) {
      toastError('Failed to add feedback', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportCsv = () => {
    if (items.length === 0) {
      toastError('No items to export', 'Current filter view has zero rows.');
      return;
    }
    const headers = ['ID,Content,Rating,Source,Date,Sentiment,SentimentScore,Topic,Priority,IssueGroup'];
    const rows = items.map((it) => {
      const cleanContent = `"${(it.content || '').replace(/"/g, '""')}"`;
      return `${it.id},${cleanContent},${it.rating},${it.source},${it.date},${it.sentiment},${it.sentiment_score},"${it.topic}",${it.priority},"${it.issue_group || ''}"`;
    });
    const csvData = headers.concat(rows).join('\n');
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `productpulse-feedback-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    success('Export complete', `Downloaded ${items.length} records to CSV`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Feedback Records</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Explore what users are saying in {activeDataset ? `"${activeDataset.name}"` : 'current dataset'}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs shadow-indigo-600/20 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Feedback</span>
          </button>
        </div>
      </div>

      {/* Top Filter Bar */}
      <div className="bg-white p-4 border border-slate-200/80 rounded-2xl shadow-xs space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search feedback content, topic, or source..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1 text-xs">
          {/* Sentiment */}
          <select
            value={sentiment}
            onChange={(e) => {
              setSentiment(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-indigo-400"
          >
            <option value="">Sentiment: All</option>
            <option value="positive">Positive</option>
            <option value="neutral">Neutral</option>
            <option value="negative">Negative</option>
          </select>

          {/* Topic - Dynamically populated from active dataset! */}
          <select
            value={topic}
            onChange={(e) => {
              setTopic(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-indigo-400"
          >
            <option value="">Topic: All</option>
            {availableTopics.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* Priority */}
          <select
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-indigo-400"
          >
            <option value="">Priority: All</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Source */}
          <select
            value={source}
            onChange={(e) => {
              setSource(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-indigo-400"
          >
            <option value="">Source: All</option>
            <option value="Website">Website</option>
            <option value="Web App">Web App</option>
            <option value="Support Ticket">Support Ticket</option>
            <option value="Mobile">Mobile</option>
            <option value="CSV Import">CSV Import</option>
          </select>

          {/* Rating */}
          <select
            value={rating !== undefined ? rating : ''}
            onChange={(e) => {
              setRating(e.target.value ? parseInt(e.target.value, 10) : undefined);
              setPage(1);
            }}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-indigo-400"
          >
            <option value="">Rating: All</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>

          {/* Reset Filters */}
          <button
            onClick={handleResetFilters}
            className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors font-medium"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Feedback Items Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 animate-pulse space-y-3">
            <div className="h-6 bg-slate-200 rounded w-1/4 mx-auto"></div>
            <div className="h-4 bg-slate-200 rounded w-1/3 mx-auto"></div>
            <div className="h-4 bg-slate-200 rounded w-1/2 mx-auto"></div>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No Feedback Records Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {!activeDatasetId
                ? 'No active dataset selected. Upload a CSV to get started.'
                : 'No feedback items match your current filter criteria in this dataset.'}
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <button
                onClick={handleResetFilters}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-xs font-semibold rounded-lg text-slate-700 transition-colors"
              >
                Clear Filters
              </button>
              <button
                onClick={() => navigate('/import')}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold rounded-lg text-white transition-colors flex items-center gap-1.5"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Upload CSV</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Feedback</th>
                  <th className="py-3 px-3">Sentiment</th>
                  <th className="py-3 px-3">Topic</th>
                  <th className="py-3 px-3">Priority</th>
                  <th className="py-3 px-3">Source</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {items.map((fb) => (
                  <tr
                    key={fb.id}
                    onClick={() => navigate(`/feedback/${fb.id}`)}
                    className="hover:bg-indigo-50/30 cursor-pointer transition-colors group"
                  >
                    <td className="py-3.5 px-4 max-w-md">
                      <p className="font-medium text-slate-900 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                        "{fb.content}"
                      </p>
                      {fb.issue_group && (
                        <span className="inline-block mt-1 text-[11px] text-slate-400">
                          {fb.issue_group}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold capitalize text-[11px] ${
                          fb.sentiment === 'positive'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : fb.sentiment === 'negative'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            fb.sentiment === 'positive'
                              ? 'bg-emerald-500'
                              : fb.sentiment === 'negative'
                              ? 'bg-rose-500'
                              : 'bg-slate-400'
                          }`}
                        ></span>
                        {fb.sentiment}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className="font-medium text-slate-800">{fb.topic}</span>
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span
                        className={`font-semibold text-[11px] uppercase ${
                          fb.priority === 'high'
                            ? 'text-rose-600 font-bold'
                            : fb.priority === 'medium'
                            ? 'text-amber-600'
                            : 'text-slate-500'
                        }`}
                      >
                        {fb.priority}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap text-slate-500">{fb.source}</td>

                    <td className="py-3.5 px-3 whitespace-nowrap text-slate-500">{fb.date}</td>

                    <td className="py-3.5 px-3 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={(e) => handleDelete(fb.id, e)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete feedback"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="p-3 bg-slate-50/80 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
          <div>
            Showing <span className="font-semibold">{items.length}</span> of{' '}
            <span className="font-semibold">{total}</span> records
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add Feedback Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Add Feedback Item</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddFeedback} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Feedback Content *
                </label>
                <textarea
                  rows={4}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Describe user sentiment, friction, or feedback..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Rating (1-5)
                  </label>
                  <select
                    value={newRating}
                    onChange={(e) => setNewRating(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400"
                  >
                    {[5, 4, 3, 2, 1].map((r) => (
                      <option key={r} value={r}>
                        {r} Stars
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Source
                  </label>
                  <select
                    value={newSource}
                    onChange={(e) => setNewSource(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400"
                  >
                    {['Website', 'Web App', 'Support Ticket', 'Mobile', 'Trustpilot'].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs shadow-indigo-600/20 transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Analyzing...' : 'Save & Analyze'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
