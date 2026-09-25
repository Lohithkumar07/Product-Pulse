import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  GitPullRequest,
  AlertTriangle,
  Clock,
  Layers,
  CheckCircle2,
  Trash2,
  ChevronRight,
} from 'lucide-react';
import { feedbackApi } from '../api/feedback';
import { decisionsApi } from '../api/decisions';
import { FeedbackItem } from '../types';
import { useToast } from '../context/ToastContext';

export const FeedbackDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [feedback, setFeedback] = useState<FeedbackItem | null>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingDecision, setCreatingDecision] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchDetail = async () => {
      try {
        setLoading(true);
        const data = await feedbackApi.getById(id);
        setFeedback(data.feedback);
        setRelated(data.related_feedback || []);
      } catch (err: any) {
        toastError('Failed to load feedback item', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  const handleCreateDecision = async () => {
    if (!feedback) return;
    try {
      setCreatingDecision(true);
      const dec = await decisionsApi.create({
        dataset_id: feedback.dataset_id || feedback.product_id,
        product_id: feedback.product_id,
        title: `Resolve ${feedback.issue_group || feedback.topic} Issue`,
        affected_feature: feedback.topic,
        priority: feedback.priority,
        trend: 'increasing',
        supporting_feedback_count: 1,
        suggested_action:
          feedback.suggested_action ||
          `Investigate reported issue: "${feedback.content.slice(0, 120)}" and optimize implementation.`,
        status: 'Planned',
      });
      success('Product Decision Created', `Added "${dec.title}" to roadmap queue.`);
      navigate('/decisions');
    } catch (err: any) {
      toastError('Failed to create decision', err.message);
    } finally {
      setCreatingDecision(false);
    }
  };

  const handleDelete = async () => {
    if (!feedback) return;
    if (!window.confirm('Delete this feedback item permanently?')) return;
    try {
      await feedbackApi.delete(feedback.id);
      success('Feedback deleted');
      navigate('/feedback');
    } catch (err: any) {
      toastError('Delete failed', err.message);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-slate-200 rounded"></div>
        <div className="h-44 bg-slate-200 rounded-2xl"></div>
        <div className="h-64 bg-slate-200 rounded-2xl"></div>
      </div>
    );
  }

  if (!feedback) {
    return (
      <div className="p-12 text-center text-slate-500">
        <p className="text-base font-semibold">Feedback not found</p>
        <button
          onClick={() => navigate('/feedback')}
          className="mt-4 px-4 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-xl"
        >
          Back to feedback list
        </button>
      </div>
    );
  }

  const confidencePct = Math.round((feedback.sentiment_confidence || 0.88) * 100);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back button & Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/feedback')}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Feedback</span>
        </button>

        <button
          onClick={handleDelete}
          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors text-xs flex items-center gap-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete item</span>
        </button>
      </div>

      {/* Main Feedback Hero Card */}
      <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-xs space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-semibold uppercase tracking-wider text-slate-500">
            Feedback #{feedback.id}
          </span>
          <span>Logged on {feedback.date}</span>
        </div>

        <blockquote className="text-lg sm:text-xl font-medium text-slate-900 leading-relaxed">
          "{feedback.content}"
        </blockquote>

        {/* 6 Key Metadata Items */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-4 border-t border-slate-100 text-xs">
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Source</span>
            <span className="font-bold text-slate-800 mt-0.5 block">{feedback.source}</span>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Rating</span>
            <span className="font-bold text-amber-600 mt-0.5 block">{feedback.rating} / 5 ★</span>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Date</span>
            <span className="font-semibold text-slate-800 mt-0.5 block">{feedback.date}</span>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Sentiment</span>
            <span
              className={`font-bold capitalize mt-0.5 block ${
                feedback.sentiment === 'positive'
                  ? 'text-emerald-600'
                  : feedback.sentiment === 'negative'
                  ? 'text-rose-600'
                  : 'text-slate-600'
              }`}
            >
              {feedback.sentiment}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Confidence</span>
            <span className="font-bold text-indigo-600 mt-0.5 block">{confidencePct}%</span>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Priority</span>
            <span
              className={`font-bold capitalize mt-0.5 block ${
                feedback.priority === 'high'
                  ? 'text-rose-600'
                  : feedback.priority === 'medium'
                  ? 'text-amber-600'
                  : 'text-slate-600'
              }`}
            >
              {feedback.priority}
            </span>
          </div>
        </div>
      </div>

      {/* AI Feedback Analysis Section */}
      <div className="p-6 bg-slate-900 text-white rounded-3xl shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">AI Feedback Analysis</h2>
              <p className="text-xs text-slate-400">Automated diagnostic and action synthesis</p>
            </div>
          </div>

          <button
            onClick={handleCreateDecision}
            disabled={creatingDecision}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50"
          >
            <GitPullRequest className="w-3.5 h-3.5" />
            <span>{creatingDecision ? 'Creating...' : 'Create Decision'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
          {/* Detected Problem */}
          <div className="p-4 bg-slate-800/80 border border-slate-700/60 rounded-2xl space-y-1">
            <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider block">
              Detected Problem
            </span>
            <p className="text-slate-200 leading-relaxed font-normal">
              {feedback.detected_problem || 'Application performance friction reported in workflow.'}
            </p>
          </div>

          {/* Possible Cause */}
          <div className="p-4 bg-slate-800/80 border border-slate-700/60 rounded-2xl space-y-1">
            <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block">
              Possible Cause
            </span>
            <p className="text-slate-200 leading-relaxed font-normal">
              {feedback.possible_cause || 'Synchronous blocking execution or unindexed database querying.'}
            </p>
          </div>

          {/* User Impact */}
          <div className="p-4 bg-slate-800/80 border border-slate-700/60 rounded-2xl space-y-1">
            <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider block">
              User Impact
            </span>
            <p className="text-slate-200 leading-relaxed font-normal">
              {feedback.user_impact || 'Users cannot complete core workflow steps smoothly.'}
            </p>
          </div>

          {/* Suggested Action */}
          <div className="p-4 bg-indigo-950/60 border border-indigo-700/50 rounded-2xl space-y-1">
            <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block">
              Suggested Action
            </span>
            <p className="text-slate-100 leading-relaxed font-medium">
              {feedback.suggested_action || 'Implement background processing and provide real-time user progress.'}
            </p>
          </div>
        </div>
      </div>

      {/* Similar Complaints in Same Topic */}
      {related.length > 0 && (
        <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900">
            Similar feedback in topic "{feedback.topic}"
          </h3>
          <div className="divide-y divide-slate-100">
            {related.map((rel) => (
              <div
                key={rel.id}
                onClick={() => navigate(`/feedback/${rel.id}`)}
                className="py-2.5 flex items-center justify-between gap-4 hover:bg-slate-50 px-2 rounded-xl cursor-pointer transition-colors"
              >
                <p className="text-xs text-slate-700 line-clamp-1 max-w-lg">"{rel.content}"</p>
                <div className="flex items-center gap-2 text-xs text-slate-400 shrink-0">
                  <span className="capitalize text-slate-600">{rel.sentiment}</span>
                  <span>·</span>
                  <span>{rel.date}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
