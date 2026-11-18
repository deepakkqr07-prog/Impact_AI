import React, { useState, useEffect } from 'react';
import { 
  ClockAlert, 
  Calendar, 
  ArrowUpRight, 
  CheckCircle2, 
  AlertTriangle, 
  ChevronRight,
  Filter,
  Sparkles
} from 'lucide-react';
import { api } from '../api';
import { RiskBadge, StatusBadge } from '../components/StatusBadge';

export function DelayPrediction({ onSelectProject }) {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [riskFilter, setRiskFilter] = useState('All');
  const [selectedDelay, setSelectedDelay] = useState(null);

  const fetchDelayData = async () => {
    try {
      setLoading(true);
      const data = await api.getDelayPredictions({ delay_risk: riskFilter });
      setPredictions(data);
      if (data.length > 0 && !selectedDelay) {
        setSelectedDelay(data[0]);
      }
    } catch (err) {
      console.error("Failed to load delay predictions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDelayData();
  }, [riskFilter]);

  const confirmedDelayedCount = predictions.filter(p => p.is_confirmed_delay).length;
  const highRiskDelayCount = predictions.filter(p => p.delay_risk === 'High').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">
            AI Schedule Delay Forecasting & Critical Path Modeling
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gradient Boosting timeline regressor predicting schedule slippage, milestone lags and remedial interventions
          </p>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 border border-slate-200 rounded-md">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Projects with High Delay Risk</div>
          <div className="text-xl font-bold text-rose-700 mt-1">{highRiskDelayCount} Projects</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Forecast delay &gt; 90 days</div>
        </div>

        <div className="bg-white p-3.5 border border-slate-200 rounded-md">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Confirmed Deadline Breaches</div>
          <div className="text-xl font-bold text-amber-700 mt-1">{confirmedDelayedCount} Projects</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Past target completion date</div>
        </div>

        <div className="bg-white p-3.5 border border-slate-200 rounded-md">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Average Forecast Slippage</div>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {predictions.length > 0 ? (predictions.reduce((s, p) => s + p.predicted_delay_days, 0) / predictions.length).toFixed(0) : 0} Days
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Across monitored portfolio</div>
        </div>

        <div className="bg-white p-3.5 border border-slate-200 rounded-md">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Regressor Architecture</div>
          <div className="text-xl font-bold text-blue-800 mt-1">Gradient Boost</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Scikit-learn GBR Ensemble</div>
        </div>
      </div>

      {/* Main Grid: Left Table, Right Remedial Action Plan */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-md overflow-hidden lg:col-span-2">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Project Schedule Delay Assessments ({predictions.length})
            </span>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-500 font-medium">Filter Risk:</span>
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="py-1 px-2 text-xs border border-slate-300 rounded bg-white text-slate-800"
              >
                <option value="All">All Risk</option>
                <option value="High">High Delay Risk (&gt;90d)</option>
                <option value="Medium">Medium Delay Risk</option>
                <option value="Low">Low Delay Risk</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Project Details</th>
                  <th className="py-2.5 px-3 text-center">Actual vs Planned</th>
                  <th className="py-2.5 px-3 text-center">Progress Deficit</th>
                  <th className="py-2.5 px-3 text-center">Predicted Delay</th>
                  <th className="py-2.5 px-3 text-center">Confirmed Overdue?</th>
                  <th className="py-2.5 px-3 text-center">Delay Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {predictions.map((p) => {
                  const isSelected = selectedDelay?.project_id === p.project_id;
                  return (
                    <tr
                      key={p.project_id}
                      onClick={() => setSelectedDelay(p)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-50/70 border-l-4 border-l-blue-700' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-2.5 px-3 max-w-xs">
                        <div className="font-semibold text-slate-900 truncate">{p.project_name}</div>
                        <span className="font-mono text-[10px] text-blue-900">{p.project_code} • {p.sector}</span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-medium">
                        {p.current_progress}% / {p.expected_progress}%
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-amber-700">
                        {p.progress_deficit > 0 ? `-${p.progress_deficit}%` : 'On Schedule'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-900">
                        {p.predicted_delay_days} Days ({p.estimated_delay_months}m)
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {p.is_confirmed_delay ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-100 text-red-800 font-bold">
                            CONFIRMED (+{p.confirmed_delay_days}d)
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Estimated</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <RiskBadge level={p.delay_risk} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Remedial Plan for Selected Project */}
        {selectedDelay ? (
          <div className="bg-white border border-slate-200 rounded-md p-4 space-y-4">
            <div className="pb-2 border-b border-slate-100">
              <span className="font-mono text-[10px] text-blue-800 font-bold px-1.5 py-0.5 rounded bg-blue-50">
                {selectedDelay.project_code}
              </span>
              <h2 className="text-sm font-bold text-slate-900 mt-1">
                {selectedDelay.project_name}
              </h2>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-slate-500">Forecast Delay:</span>
                <span className="text-sm font-bold text-amber-700">
                  {selectedDelay.predicted_delay_days} Days (~{selectedDelay.estimated_delay_months} Months)
                </span>
              </div>
            </div>

            {/* Current vs Expected Progress Ribbon */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between font-medium">
                <span className="text-slate-600">Physical Progress vs Target</span>
                <span className="text-slate-900 font-bold">{selectedDelay.current_progress}% / {selectedDelay.expected_progress}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-600 h-full rounded-full" 
                  style={{ width: `${Math.min(100, selectedDelay.current_progress)}%` }}
                ></div>
              </div>
            </div>

            {/* Confirmed vs Estimated Status */}
            <div className="p-3 bg-slate-50 rounded border border-slate-100 text-xs">
              <div className="font-bold text-slate-800 mb-1">Schedule Delay Status</div>
              {selectedDelay.is_confirmed_delay ? (
                <p className="text-rose-700 font-medium text-[11px]">
                  [CONFIRMED DELAY] Project has breached its contract completion deadline of {selectedDelay.expected_completion_date} by {selectedDelay.confirmed_delay_days} days.
                </p>
              ) : (
                <p className="text-slate-600 text-[11px]">
                  [ESTIMATED DELAY] Project is currently within baseline timeline but ground physical progress indicates a forecast delay risk of {selectedDelay.predicted_delay_days} days.
                </p>
              )}
            </div>

            {/* Identified Delay Reasons */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                Identified Root Causes:
              </span>
              <ul className="text-xs space-y-1 text-slate-700 list-disc list-inside">
                {(selectedDelay.reasons || []).map((r, i) => (
                  <li key={i} className="leading-relaxed">{r}</li>
                ))}
              </ul>
            </div>

            {/* Recommended Action Plan */}
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded space-y-2">
              <div className="flex items-center space-x-1.5 text-blue-900 font-bold text-xs">
                <Sparkles size={14} className="text-blue-700" />
                <span>Recommended Acceleration Protocol</span>
              </div>
              <ul className="text-xs space-y-1 text-blue-800 list-disc list-inside">
                {(selectedDelay.recommended_actions || []).map((act, i) => (
                  <li key={i} className="leading-relaxed">{act}</li>
                ))}
              </ul>
            </div>

            <div className="pt-2">
              <button
                onClick={() => onSelectProject(selectedDelay.project_id)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-xs font-semibold transition-colors flex items-center justify-center space-x-1"
              >
                <span>Open Project Milestones</span>
                <ArrowUpRight size={14} />
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-md p-6 text-center text-xs text-slate-400">
            Select a project from the table to inspect delay diagnostics.
          </div>
        )}
      </div>
    </div>
  );
}
