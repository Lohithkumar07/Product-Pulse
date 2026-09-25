import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Database,
  Layers,
  Sparkles,
} from 'lucide-react';
import { uploadApi } from '../api/upload';
import { ImportResult } from '../types';
import { useToast } from '../context/ToastContext';
import { useDataset } from '../context/DatasetContext';

type ImportStep = 'idle' | 'preview' | 'processing' | 'complete';

export const ImportPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { success, error: toastError } = useToast();
  const { refreshDatasets, setActiveDatasetId } = useDataset();

  const [step, setStep] = useState<ImportStep>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [datasetName, setDatasetName] = useState<string>('');
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [subStep, setSubStep] = useState<number>(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const stepsList = [
    'Uploading file',
    'Validating CSV schema & format',
    'Cleaning & duplicate detection',
    'AI dynamic topic discovery & NLP clustering',
    'Synthesizing product decisions',
    'Ingestion complete',
  ];

  const handleFileSelect = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toastError('Invalid file type', 'Please select a standard .csv file.');
      return;
    }
    setSelectedFile(file);

    const defaultName = file.name
      .replace(/\.[^/.]+$/, '')
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
    setDatasetName(defaultName);

    // Read first few lines for preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || '';
      const lines = text.split('\n').filter((l) => l.trim().length > 0);
      if (lines.length > 0) {
        const headers = lines[0].split(',').map((h) => h.replace(/^["']|["']$/g, '').trim());
        setPreviewHeaders(headers);

        const sample = lines.slice(1, 8).map((line) => {
          return line.split(',').map((c) => c.replace(/^["']|["']$/g, '').trim());
        });
        setPreviewRows(sample);
        setStep('preview');
      }
    };
    reader.readAsText(file.slice(0, 50000));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleStartImport = async () => {
    if (!selectedFile) return;
    setStep('processing');
    setSubStep(0);

    const stepInterval = setInterval(() => {
      setSubStep((prev) => (prev < 4 ? prev + 1 : prev));
    }, 800);

    try {
      const result = await uploadApi.uploadCsv(
        selectedFile,
        datasetName.trim() || undefined,
        (progressEvent) => {
          if (progressEvent.total) {
            const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(pct);
          }
        }
      );

      clearInterval(stepInterval);
      setSubStep(5);
      setImportResult(result);
      setStep('complete');

      // Update active dataset to the newly uploaded dataset
      await refreshDatasets();
      if (result.dataset_id) {
        setActiveDatasetId(result.dataset_id);
      }

      success(
        'Dataset imported successfully',
        `Imported ${result.imported} feedback items under "${result.name || datasetName}".`
      );
    } catch (err: any) {
      clearInterval(stepInterval);
      setStep('preview');
      toastError('CSV Import failed', err.message);
    }
  };

  const handleLoadSampleCsv = async () => {
    try {
      const res = await fetch('/api/sample-csv');
      const blob = await res.blob();
      const file = new File([blob], 'sample-feedback.csv', { type: 'text/csv' });
      handleFileSelect(file);
      success('Sample demo CSV loaded', 'Review the preview and click Start Import.');
    } catch (err: any) {
      toastError('Failed to load sample dataset', err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200/80 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Import Feedback CSV</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Every CSV upload creates a dedicated dataset. Topics and product decisions will be derived directly from your file.
          </p>
        </div>

        <button
          onClick={handleLoadSampleCsv}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors border border-indigo-200"
        >
          <Database className="w-3.5 h-3.5 text-indigo-600" />
          <span>Load Demo CSV</span>
        </button>
      </div>

      {/* STEP 1: Upload Zone */}
      {step === 'idle' && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="p-12 border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-white hover:bg-indigo-50/20 rounded-3xl transition-all cursor-pointer text-center group shadow-xs"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            accept=".csv"
            className="hidden"
          />

          <div className="w-16 h-16 rounded-2xl bg-indigo-50 group-hover:bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto transition-colors">
            <UploadCloud className="w-8 h-8" />
          </div>

          <h3 className="text-base font-bold text-slate-900 mt-4">
            Drop your feedback CSV here, or <span className="text-indigo-600">browse</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Supports any CSV containing text reviews, user comments, or tickets. Column names are auto-detected.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
            {['feedback/comment/review', 'rating (1-5, optional)', 'date (optional)', 'source (optional)'].map(
              (f, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[11px] font-medium rounded-lg"
                >
                  {f}
                </span>
              )
            )}
          </div>
        </div>
      )}

      {/* STEP 2: Preview & Configuration */}
      {step === 'preview' && selectedFile && (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">{selectedFile.name}</h3>
                <p className="text-xs text-slate-400">
                  {(selectedFile.size / 1024).toFixed(1)} KB • {previewRows.length + 1}+ rows detected
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setSelectedFile(null);
                setStep('idle');
              }}
              className="text-xs text-slate-500 hover:text-slate-800 self-start sm:self-center font-medium"
            >
              Choose different file
            </button>
          </div>

          {/* Dataset Name Input */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Dataset Name
            </label>
            <input
              type="text"
              value={datasetName}
              onChange={(e) => setDatasetName(e.target.value)}
              placeholder="e.g. Q3 Customer Feedback"
              className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              This name will label all reports, dashboards, and decisions created from this CSV.
            </p>
          </div>

          {/* Sample Table Preview */}
          <div>
            <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Preview Data Sample
            </h4>
            <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-60 text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    {previewHeaders.map((h, i) => (
                      <th key={i} className="py-2 px-3 font-semibold whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {previewRows.map((row, ri) => (
                    <tr key={ri} className="hover:bg-slate-50">
                      {row.map((cell, ci) => (
                        <td key={ci} className="py-2 px-3 max-w-xs truncate whitespace-nowrap">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => {
                setSelectedFile(null);
                setStep('idle');
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleStartImport}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs shadow-indigo-600/20 transition-all flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Start AI Ingestion</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Progress State */}
      {step === 'processing' && (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-xs text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto animate-pulse">
            <Sparkles className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900">Analyzing Feedback & Clustering Topics</h2>
            <p className="text-xs text-slate-500 mt-1">
              Extracting sentiment, discovering recurring issue themes, and generating product decisions...
            </p>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden max-w-md mx-auto">
            <div
              className="bg-indigo-600 h-full transition-all duration-300"
              style={{ width: `${Math.max(15, (subStep + 1) * 17)}%` }}
            ></div>
          </div>

          {/* Pipeline steps checkoff */}
          <div className="max-w-md mx-auto text-left space-y-2.5 pt-2">
            {stepsList.map((st, idx) => {
              const isDone = subStep > idx;
              const isCurrent = subStep === idx;
              return (
                <div key={idx} className="flex items-center gap-2.5 text-xs">
                  {isDone ? (
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">
                      ✓
                    </span>
                  ) : isCurrent ? (
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] animate-pulse">
                      ●
                    </span>
                  ) : (
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-[10px]">
                      ○
                    </span>
                  )}
                  <span
                    className={`font-medium ${
                      isDone
                        ? 'text-slate-800'
                        : isCurrent
                        ? 'text-indigo-600 font-bold'
                        : 'text-slate-400'
                    }`}
                  >
                    {st}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 4: Completion Summary */}
      {step === 'complete' && importResult && (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-xs space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Dataset Analysis Complete</h2>
            <p className="text-xs text-slate-500">
              Ingested and enriched with dynamic topics and AI product recommendations.
            </p>
          </div>

          {/* Dataset Identity Card */}
          <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-indigo-600 tracking-wider">
                Active Dataset Created
              </span>
              <p className="text-sm font-bold text-slate-900 mt-0.5">
                {importResult.name || datasetName}
              </p>
              <p className="text-slate-400 mt-0.5">
                ID: <span className="font-mono text-slate-600">{importResult.dataset_id}</span> • File: {importResult.filename}
              </p>
            </div>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl self-start sm:self-center">
              Active in Workspace
            </span>
          </div>

          {/* Stats 4-grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-2 border-y border-slate-100">
            <div className="p-3 bg-slate-50 rounded-2xl text-center">
              <span className="text-[11px] text-slate-400 font-medium uppercase">Total Rows</span>
              <p className="text-xl font-bold text-slate-900 mt-0.5">{importResult.total_rows}</p>
            </div>

            <div className="p-3 bg-emerald-50/60 rounded-2xl text-center">
              <span className="text-[11px] text-emerald-600 font-medium uppercase">Imported</span>
              <p className="text-xl font-bold text-emerald-700 mt-0.5">{importResult.imported}</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl text-center">
              <span className="text-[11px] text-slate-400 font-medium uppercase">Duplicates</span>
              <p className="text-xl font-bold text-slate-600 mt-0.5">{importResult.duplicates}</p>
            </div>

            <div className="p-3 bg-rose-50/60 rounded-2xl text-center">
              <span className="text-[11px] text-rose-600 font-medium uppercase">Invalid</span>
              <p className="text-xl font-bold text-rose-700 mt-0.5">{importResult.invalid}</p>
            </div>
          </div>

          {/* Discovered Topics Badges */}
          {importResult.topics_detected && importResult.topics_detected.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Topics Dynamically Discovered for This Dataset
              </h4>
              <div className="flex flex-wrap gap-2">
                {importResult.topics_detected.map((topic, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-semibold"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-center gap-3 pt-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <span>View Dashboard for this Dataset</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => navigate('/feedback')}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
            >
              View Feedback Records
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
