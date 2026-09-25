import React, { useState } from 'react';
import {
  Database,
  Sparkles,
  RefreshCw,
  Download,
  Layers,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useDataset } from '../context/DatasetContext';

export const SettingsPage: React.FC = () => {
  const { success, error: toastError } = useToast();
  const { datasets, activeDataset, activeDatasetId, setActiveDatasetId, refreshDatasets, loadDemoData, deleteDataset } = useDataset();
  const [resetting, setResetting] = useState(false);

  const handleResetData = async () => {
    if (!window.confirm('Reset database and reload default demo feedback records?')) return;
    try {
      setResetting(true);
      await loadDemoData();
      success('Database Reset Complete', 'Loaded clean demo dataset with feedback items and decisions.');
    } catch (err: any) {
      toastError('Reset failed', err.message);
    } finally {
      setResetting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete dataset "${name}" and all its feedback, decisions, and reports?`)) return;
    try {
      await deleteDataset(id);
      success('Dataset Deleted', `Removed "${name}".`);
    } catch (err: any) {
      toastError('Delete failed', err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200/80">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings & Datasets</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage active datasets, AI intelligence configuration, and data sources.
        </p>
      </div>

      {/* AI Engine Status Card */}
      <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
          <Sparkles className="w-4 h-4" />
          <span>AI Engine Configuration</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 bg-slate-50 border border-slate-200/70 rounded-2xl">
            <span className="text-[11px] text-slate-400 font-medium uppercase block">Primary Model</span>
            <span className="font-bold text-slate-900 text-sm mt-1 block">gemini-3.8-flash</span>
            <span className="text-[11px] text-emerald-600 mt-0.5 block font-medium">● Online</span>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200/70 rounded-2xl">
            <span className="text-[11px] text-slate-400 font-medium uppercase block">Topic Extraction</span>
            <span className="font-bold text-slate-900 text-sm mt-1 block">Dynamic Discovery</span>
            <span className="text-[11px] text-slate-500 mt-0.5 block">Derived from CSV text</span>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200/70 rounded-2xl">
            <span className="text-[11px] text-slate-400 font-medium uppercase block">Security</span>
            <span className="font-bold text-slate-900 text-sm mt-1 block">Zero Frontend Key Leak</span>
            <span className="text-[11px] text-slate-500 mt-0.5 block">Server-side proxy strictly enforced</span>
          </div>
        </div>
      </div>

      {/* Active Dataset Card */}
      <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
          <Layers className="w-4 h-4 text-indigo-600" />
          <span>Active Dataset Information</span>
        </div>

        {activeDataset ? (
          <div className="space-y-3 text-xs max-w-lg">
            <div>
              <label className="block text-slate-500 font-medium mb-1">Active Dataset Name</label>
              <input
                type="text"
                readOnly
                value={activeDataset.name}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-500 font-medium mb-1">Dataset ID</label>
                <input
                  type="text"
                  readOnly
                  value={activeDataset.id}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px] text-slate-600"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-medium mb-1">Row Count</label>
                <input
                  type="text"
                  readOnly
                  value={`${activeDataset.row_count} records`}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
                />
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500">No active dataset selected.</p>
        )}
      </div>

      {/* Uploaded Datasets Manager */}
      <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
            <Database className="w-4 h-4 text-indigo-600" />
            <span>Manage All Datasets ({datasets.length})</span>
          </div>
          <button
            onClick={() => refreshDatasets()}
            className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Refresh
          </button>
        </div>

        <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
          {datasets.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No datasets found in database.
            </div>
          ) : (
            datasets.map((d) => {
              const isSelected = d.id === activeDatasetId;
              return (
                <div
                  key={d.id}
                  className={`p-3.5 flex items-center justify-between gap-3 text-xs transition-colors ${
                    isSelected ? 'bg-indigo-50/40' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{d.name}</span>
                      {isSelected && (
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-md">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      ID: <span className="font-mono text-slate-600">{d.id}</span> • {d.filename} • {d.row_count} records
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isSelected && (
                      <button
                        onClick={() => setActiveDatasetId(d.id)}
                        className="px-3 py-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                      >
                        Set Active
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(d.id, d.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete dataset"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Database & Demo Data Reset */}
      <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
          <Database className="w-4 h-4 text-indigo-600" />
          <span>Demo Data Utilities</span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
          Reset database and reload clean sample SaaS Flow Analytics demo feedback records.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={handleResetData}
            disabled={resetting}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
            <span>{resetting ? 'Resetting...' : 'Reset & Re-seed Demo Data'}</span>
          </button>

          <a
            href="/api/sample-csv"
            download="sample-feedback.csv"
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold rounded-xl transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Sample Feedback CSV</span>
          </a>
        </div>
      </div>
    </div>
  );
};
