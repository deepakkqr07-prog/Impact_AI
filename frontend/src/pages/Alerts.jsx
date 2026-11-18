import React, { useState, useEffect } from 'react';
import { 
  BellRing, 
  Filter, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  ShieldAlert, 
  Check, 
  X, 
  ArrowUpRight,
  RefreshCw
} from 'lucide-react';
import { api } from '../api';
import { RiskBadge, AlertBadge } from '../components/StatusBadge';

const CATEGORIES = [
  "All",
  "Cost Escalation",
  "Schedule Delay",
  "Progress Deviation",
  "Expenditure Disparity",
  "Risk Threshold Breached"
];

const STATUSES = ["All", "New", "Under Review", "Resolved"];
const RISK_LEVELS = ["All", "Critical", "High", "Medium", "Low"];

export function Alerts({ onSelectProject }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [riskFilter, setRiskFilter] = useState('All');
  const [resolutionModalOpen, setResolutionModalOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [targetStatus, setTargetStatus] = useState('Under Review');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'All') params.status = statusFilter;
      if (categoryFilter !== 'All') params.category = categoryFilter;
      if (riskFilter !== 'All') params.risk_level = riskFilter;

      const data = await api.getAlerts(params);
      setAlerts(data);
    } catch (err) {
      console.error("Failed to load alerts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [statusFilter, categoryFilter, riskFilter]);

  const handleOpenStatusModal = (alert, status) => {
    setSelectedAlert(alert);
    setTargetStatus(status);
    setResolutionNotes(status === 'Resolved' ? 'Verified with implementing agency; milestone cure plan initiated.' : '');
    setResolutionModalOpen(true);
  };

  const handleConfirmStatus = async (e) => {
    e.preventDefault();
    if (!selectedAlert) return;
    try {
      setSubmitting(true);
      await api.updateAlertStatus(selectedAlert.id, {
        status: targetStatus,
        resolution_notes: resolutionNotes
      });
      setResolutionModalOpen(false);
      setSelectedAlert(null);
      fetchAlerts();
    } catch (err) {
      alert("Failed to update alert: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const newCount = alerts.filter(a => a.status === 'New').length;
  const underReviewCount = alerts.filter(a => a.status === 'Under Review').length;
  const resolvedCount = alerts.filter(a => a.status === 'Resolved').length;

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">
            Early Warning Alert Notification & Compliance Matrix
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated threshold anomalies, expenditure divergence and critical path milestone alerts
          </p>
        </div>
        <button
          onClick={fetchAlerts}
          className="mt-3 sm:mt-0 inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Alerts</span>
        </button>
      </div>

      {/* KPI Status Ribbon */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div 
          onClick={() => setStatusFilter('New')}
          className={`p-3.5 border rounded-md cursor-pointer transition-colors ${
            statusFilter === 'New' ? 'border-rose-500 bg-rose-50/40' : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">New Alerts (Requires Review)</span>
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping"></span>
          </div>
          <div className="text-2xl font-bold text-rose-700 mt-1">{newCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Automated telemetry flags</div>
        </div>

        <div 
          onClick={() => setStatusFilter('Under Review')}
          className={`p-3.5 border rounded-md cursor-pointer transition-colors ${
            statusFilter === 'Under Review' ? 'border-amber-500 bg-amber-50/40' : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Under Investigation / Review</span>
          <div className="text-2xl font-bold text-amber-700 mt-1">{underReviewCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Inquiry with implementing agency</div>
        </div>

        <div 
          onClick={() => setStatusFilter('Resolved')}
          className={`p-3.5 border rounded-md cursor-pointer transition-colors ${
            statusFilter === 'Resolved' ? 'border-emerald-500 bg-emerald-50/40' : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Resolved Alerts</span>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{resolvedCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Audited and closed</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-md p-3.5 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">Alert Category</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full py-1.5 px-2.5 border border-slate-300 rounded bg-white text-slate-800"
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full py-1.5 px-2.5 border border-slate-300 rounded bg-white text-slate-800"
          >
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">Risk Severity</label>
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="w-full py-1.5 px-2.5 border border-slate-300 rounded bg-white text-slate-800"
          >
            {RISK_LEVELS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Showing {alerts.length} Early Warning Notifications
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Project</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3 text-center">Severity</th>
                <th className="py-2.5 px-3 max-w-md">Reason for Alert</th>
                <th className="py-2.5 px-3 max-w-sm">Suggested Action</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-center">Workflow Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {alerts.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-500">
                    No early warning alerts found matching the active filter criteria.
                  </td>
                </tr>
              ) : (
                alerts.map((alert) => (
                  <tr key={alert.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(alert.alert_date).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900 max-w-[160px]">
                      <button
                        onClick={() => onSelectProject(alert.project_id)}
                        className="text-left hover:text-blue-700 truncate block w-full"
                      >
                        {alert.project_name}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-800 whitespace-nowrap">
                      {alert.alert_category}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <RiskBadge level={alert.risk_level} />
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 max-w-md">
                      <p className="line-clamp-2">{alert.reason}</p>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 max-w-sm">
                      <p className="line-clamp-2 text-[11px] bg-slate-50 p-1.5 rounded border border-slate-100">
                        {alert.suggested_action}
                      </p>
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <AlertBadge status={alert.status} />
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center space-x-1">
                        {alert.status === 'New' && (
                          <button
                            onClick={() => handleOpenStatusModal(alert, 'Under Review')}
                            className="px-2 py-1 text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 rounded hover:bg-amber-100"
                          >
                            Investigate
                          </button>
                        )}
                        {alert.status !== 'Resolved' && (
                          <button
                            onClick={() => handleOpenStatusModal(alert, 'Resolved')}
                            className="px-2 py-1 text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded hover:bg-emerald-100"
                          >
                            Resolve
                          </button>
                        )}
                        {alert.status === 'Resolved' && (
                          <span className="text-[10px] text-emerald-700 font-bold">Closed</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resolution Notes Modal */}
      {resolutionModalOpen && selectedAlert && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-md max-w-md w-full p-5 border border-slate-200 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              Update Alert Status: <span className="text-blue-700">{targetStatus}</span>
            </h3>
            <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-200">
              <span className="font-semibold text-slate-900 block">{selectedAlert.project_name}</span>
              <p className="mt-1 text-[11px]">{selectedAlert.reason}</p>
            </div>

            <form onSubmit={handleConfirmStatus} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Investigation & Resolution Notes *
                </label>
                <textarea
                  required
                  rows="3"
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Record verification findings, PMC explanation, or remediation measures..."
                  className="w-full px-3 py-2 border border-slate-300 rounded text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-700"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResolutionModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3 py-1.5 bg-blue-700 text-white rounded font-medium hover:bg-blue-800"
                >
                  {submitting ? 'Updating...' : `Confirm as ${targetStatus}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
