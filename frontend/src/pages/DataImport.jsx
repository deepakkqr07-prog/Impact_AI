import React, { useState } from 'react';
import { 
  FileUp, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  UploadCloud, 
  FileSpreadsheet, 
  ArrowRight,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export function DataImport({ onNavigateProjects }) {
  const { hasRole } = useAuth();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successResult, setSuccessResult] = useState(null);

  const handleDownloadTemplate = async () => {
    try {
      const blob = await api.downloadImportTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'infrastructure_import_template_sample.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert("Failed to download template: " + err.message);
    }
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setPreviewData(null);
      setErrorMsg('');
      setSuccessResult(null);
    }
  };

  const handlePreviewUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.previewImport(formData);
      setPreviewData(res);
    } catch (err) {
      setErrorMsg(err.message || 'File validation error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!previewData || !previewData.all_valid_rows || previewData.all_valid_rows.length === 0) return;

    setConfirming(true);
    setErrorMsg('');
    try {
      const res = await api.confirmImport({
        rows: previewData.all_valid_rows
      });
      setSuccessResult(res);
      setPreviewData(null);
      setFile(null);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to import records');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">
            Historical Infrastructure Project Data Import Module
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Bulk ingest historical projects, parse milestone baselines, and initiate automated ML risk scoring
          </p>
        </div>

        <button
          onClick={handleDownloadTemplate}
          className="mt-3 sm:mt-0 inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
        >
          <Download size={14} className="text-blue-700" />
          <span>Download Sample Template (.CSV)</span>
        </button>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2.5 rounded text-xs flex items-center space-x-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Success Notification */}
      {successResult && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-md space-y-2">
          <div className="flex items-center space-x-2">
            <CheckCircle2 size={18} className="text-emerald-600" />
            <span className="font-bold text-sm">Batch Ingestion Complete!</span>
          </div>
          <p className="text-xs">{successResult.message}</p>
          <div className="pt-2">
            <button
              onClick={onNavigateProjects}
              className="inline-flex items-center space-x-1 px-3 py-1.5 bg-emerald-700 text-white rounded text-xs font-semibold hover:bg-emerald-800"
            >
              <span>View Ingested Projects in Registry</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      )}

      {/* File Upload Zone */}
      <div className="bg-white border border-slate-200 rounded-md p-6">
        <form onSubmit={handlePreviewUpload} className="space-y-4">
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-700 transition-colors bg-slate-50/50">
            <UploadCloud size={36} className="mx-auto text-slate-400 mb-2" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Upload Infrastructure Dataset (CSV)
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              Select a valid UTF-8 formatted CSV containing project codes, capital outlays and milestone schedules
            </p>

            <div className="mt-4 flex justify-center">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
          </div>

          <div className="flex justify-between items-center pt-2">
            <div className="text-[11px] text-slate-500">
              {file ? (
                <span className="font-medium text-slate-900">Selected file: {file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
              ) : (
                <span>No file chosen yet. Download the sample template above to test.</span>
              )}
            </div>

            <button
              type="submit"
              disabled={!file || loading}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-700 text-white rounded text-xs font-semibold hover:bg-blue-800 disabled:opacity-50 transition-colors shadow-2xs"
            >
              {loading ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Validating File Structure...</span>
                </>
              ) : (
                <span>Validate & Preview Rows</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Preview Section */}
      {previewData && (
        <div className="space-y-4 bg-white border border-slate-200 rounded-md p-5 animate-in fade-in">
          {/* Summary Stats */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 gap-2">
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Dataset Validation Summary: {previewData.filename}
              </h2>
              <div className="flex items-center space-x-4 mt-1 text-xs">
                <span>Total Detected: <strong className="text-slate-900">{previewData.total_rows_found}</strong></span>
                <span className="text-emerald-700 font-semibold">Valid: {previewData.valid_rows_count}</span>
                <span className="text-rose-700 font-semibold">Errors: {previewData.error_rows_count}</span>
              </div>
            </div>

            {previewData.valid_rows_count > 0 && (
              <button
                onClick={handleConfirmImport}
                disabled={confirming}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-700 text-white rounded text-xs font-bold hover:bg-emerald-800 shadow-2xs transition-colors disabled:opacity-50"
              >
                <CheckCircle2 size={14} />
                <span>{confirming ? 'Ingesting into Database...' : `Confirm & Ingest ${previewData.valid_rows_count} Records`}</span>
              </button>
            )}
          </div>

          {/* Errors breakdown if any */}
          {previewData.errors && previewData.errors.length > 0 && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs space-y-2">
              <span className="font-bold text-rose-800 uppercase text-[10px] tracking-wider block">
                Validation Errors Detected (These rows will be skipped):
              </span>
              <div className="space-y-1">
                {previewData.errors.map((err, i) => (
                  <div key={i} className="text-[11px] text-rose-700">
                    <strong>Row {err.row_number} ({err.project_code}): </strong>
                    {err.errors.join('; ')}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Valid Preview Table */}
          {previewData.valid_preview && previewData.valid_preview.length > 0 && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                Previewing Valid Records (First {previewData.valid_preview.length}):
              </span>
              <div className="overflow-x-auto border border-slate-200 rounded">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 font-semibold text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-2.5">Code</th>
                      <th className="py-2 px-2.5">Project Name</th>
                      <th className="py-2 px-2.5">Sector</th>
                      <th className="py-2 px-2.5 text-right">Approved Outlay</th>
                      <th className="py-2 px-2.5 text-center">Planned / Actual</th>
                      <th className="py-2 px-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewData.valid_preview.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="py-2 px-2.5 font-mono text-[11px] font-bold text-blue-900">{r.project_code}</td>
                        <td className="py-2 px-2.5 font-medium text-slate-900 truncate max-w-xs">{r.name}</td>
                        <td className="py-2 px-2.5 text-slate-600">{r.sector}</td>
                        <td className="py-2 px-2.5 text-right font-semibold">₹{r.approved_cost} Cr</td>
                        <td className="py-2 px-2.5 text-center">{r.actual_progress}% / {r.planned_progress}%</td>
                        <td className="py-2 px-2.5 text-center font-medium text-slate-700">{r.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
