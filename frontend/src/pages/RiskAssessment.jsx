import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Sliders, 
  Save, 
  RefreshCw, 
  ArrowUpRight, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { RiskBadge, StatusBadge } from '../components/StatusBadge';

export function RiskAssessment({ onSelectProject }) {
  const { isAdmin } = useAuth();
  const [assessments, setAssessments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [thresholds, setThresholds] = useState(null);
  const [selectedRisk, setSelectedRisk] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingWeights, setSavingWeights] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [weightForm, setWeightForm] = useState({
    weight_cost: 0.30,
    weight_schedule: 0.25,
    weight_progress: 0.20,
    weight_milestone: 0.15,
    weight_expenditure: 0.10
  });
  const [successMsg, setSuccessMsg] = useState('');

  const fetchRiskData = async () => {
    try {
      setLoading(true);
      const [listData, sumData, thresData] = await Promise.all([
        api.getRiskAssessments(),
        api.getRiskSummary(),
        api.getRiskThresholds()
      ]);
      setAssessments(listData);
      setSummary(sumData);
      setThresholds(thresData);
      if (thresData) {
        setWeightForm({
          weight_cost: thresData.weight_cost,
          weight_schedule: thresData.weight_schedule,
          weight_progress: thresData.weight_progress,
          weight_milestone: thresData.weight_milestone,
          weight_expenditure: thresData.weight_expenditure
        });
      }
      if (listData.length > 0 && !selectedRisk) {
        setSelectedRisk(listData[0]);
      }
    } catch (err) {
      console.error("Error loading risk assessments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRiskData();
  }, []);

  const handleWeightSubmit = async (e) => {
    e.preventDefault();
    try {
      setSavingWeights(true);
      setSuccessMsg('');
      await api.updateRiskThresholds(weightForm);
      setSuccessMsg("Risk indicators updated. All projects recalibrated.");
      await fetchRiskData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      alert("Failed to update weights: " + err.message);
    } finally {
      setSavingWeights(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">
            Comprehensive Infrastructure Project Risk Scoring Engine
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Calibrated 0-100 composite index synthesizing budget escalation, milestone slippage and expenditure patterns
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setConfigOpen(!configOpen)}
            className="mt-3 sm:mt-0 inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
          >
            <Sliders size={14} className="text-blue-700" />
            <span>{configOpen ? 'Hide Calibration Weights' : 'Configure Indicator Weights'}</span>
          </button>
        )}
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-2 rounded text-xs flex items-center space-x-2">
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Admin Config Drawer */}
      {configOpen && isAdmin && (
        <div className="bg-slate-50 border border-slate-200 rounded-md p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Admin Risk Calibration & Weight Tuner
              </h2>
              <p className="text-[11px] text-slate-500">
                Adjust indicator weights (relative contribution to composite 0-100 score). Sum should approximate 1.0.
              </p>
            </div>
          </div>
          <form onSubmit={handleWeightSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700">Cost Escalation (30%)</label>
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={weightForm.weight_cost}
                onChange={(e) => setWeightForm({ ...weightForm, weight_cost: parseFloat(e.target.value) })}
                className="mt-1 w-full px-2 py-1.5 border border-slate-300 rounded bg-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700">Schedule Delay (25%)</label>
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={weightForm.weight_schedule}
                onChange={(e) => setWeightForm({ ...weightForm, weight_schedule: parseFloat(e.target.value) })}
                className="mt-1 w-full px-2 py-1.5 border border-slate-300 rounded bg-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700">Progress Gap (20%)</label>
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={weightForm.weight_progress}
                onChange={(e) => setWeightForm({ ...weightForm, weight_progress: parseFloat(e.target.value) })}
                className="mt-1 w-full px-2 py-1.5 border border-slate-300 rounded bg-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700">Milestone Slippage (15%)</label>
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={weightForm.weight_milestone}
                onChange={(e) => setWeightForm({ ...weightForm, weight_milestone: parseFloat(e.target.value) })}
                className="mt-1 w-full px-2 py-1.5 border border-slate-300 rounded bg-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700">Expenditure Disparity (10%)</label>
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={weightForm.weight_expenditure}
                onChange={(e) => setWeightForm({ ...weightForm, weight_expenditure: parseFloat(e.target.value) })}
                className="mt-1 w-full px-2 py-1.5 border border-slate-300 rounded bg-white"
              />
            </div>
            <div className="md:col-span-5 flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingWeights}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-blue-700 text-white rounded text-xs font-semibold hover:bg-blue-800"
              >
                <Save size={13} />
                <span>{savingWeights ? 'Recalibrating...' : 'Apply Calibrated Weights'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 border border-slate-200 rounded-md">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Portfolio Average Score</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{summary?.average_risk_score || 0} / 100</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Composite risk rating</div>
        </div>
        <div className="bg-white p-3.5 border border-slate-200 rounded-md">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">High Risk (Score ≥ 65)</div>
          <div className="text-xl font-bold text-rose-700 mt-1">{summary?.high_risk_count || 0} Projects</div>
          <div className="text-[11px] text-slate-400 mt-0.5">{summary?.high_risk_percentage}% of portfolio</div>
        </div>
        <div className="bg-white p-3.5 border border-slate-200 rounded-md">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Medium Risk (35 - 65)</div>
          <div className="text-xl font-bold text-amber-700 mt-1">{summary?.medium_risk_count || 0} Projects</div>
          <div className="text-[11px] text-slate-400 mt-0.5">{summary?.medium_risk_percentage}% of portfolio</div>
        </div>
        <div className="bg-white p-3.5 border border-slate-200 rounded-md">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Low Risk (&lt; 35)</div>
          <div className="text-xl font-bold text-emerald-700 mt-1">{summary?.low_risk_count || 0} Projects</div>
          <div className="text-[11px] text-slate-400 mt-0.5">{summary?.low_risk_percentage}% of portfolio</div>
        </div>
      </div>

      {/* Main Grid: Left Table, Right Detailed Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Risk Scores Table */}
        <div className="bg-white border border-slate-200 rounded-md overflow-hidden lg:col-span-2">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Project Risk Hierarchy ({assessments.length})
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Project Code & Name</th>
                  <th className="py-2.5 px-3 text-center">Ground Status</th>
                  <th className="py-2.5 px-3 text-center">Cost Score</th>
                  <th className="py-2.5 px-3 text-center">Delay Score</th>
                  <th className="py-2.5 px-3 text-center">Overall Score</th>
                  <th className="py-2.5 px-3 text-center">Category</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assessments.map((a) => {
                  const isSelected = selectedRisk?.project_id === a.project_id;
                  return (
                    <tr
                      key={a.project_id}
                      onClick={() => setSelectedRisk(a)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-50/70 border-l-4 border-l-blue-700' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-2.5 px-3 max-w-xs">
                        <div className="font-semibold text-slate-900 truncate">{a.project_name}</div>
                        <span className="font-mono text-[10px] text-blue-900">{a.project_code} • {a.sector}</span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <StatusBadge status={a.status} />
                      </td>
                      <td className="py-2.5 px-3 text-center font-medium text-slate-700">
                        {a.cost_escalation_score}
                      </td>
                      <td className="py-2.5 px-3 text-center font-medium text-slate-700">
                        {a.schedule_delay_score}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="font-bold text-sm text-slate-900">{a.overall_risk_score}</span>
                        <span className="text-[10px] text-slate-400">/100</span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <RiskBadge level={a.risk_level} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Project Breakdown */}
        {selectedRisk ? (
          <div className="bg-white border border-slate-200 rounded-md p-4 space-y-4">
            <div className="pb-2 border-b border-slate-100">
              <span className="font-mono text-[10px] text-blue-800 font-bold px-1.5 py-0.5 rounded bg-blue-50">
                {selectedRisk.project_code}
              </span>
              <h2 className="text-sm font-bold text-slate-900 mt-1">
                {selectedRisk.project_name}
              </h2>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-slate-500">Composite Risk Score:</span>
                <span className="text-lg font-bold text-slate-900">
                  {selectedRisk.overall_risk_score} <span className="text-xs font-normal text-slate-500">/ 100</span>
                </span>
              </div>
            </div>

            {/* Indicator Factor Contribution List */}
            <div className="space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                Indicator Contribution Breakdown
              </span>

              {(selectedRisk.factor_breakdown || []).map((f, i) => (
                <div key={i} className="p-2.5 rounded border border-slate-100 bg-slate-50/70 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-800">{f.indicator} ({f.weight_pct}%)</span>
                    <span className="font-bold text-slate-900">{f.score} / 100</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        f.score >= 65 ? 'bg-rose-600' : f.score >= 35 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, f.score)}%` }}
                    ></div>
                  </div>
                  <p className="text-[10px] text-slate-500">{f.detail}</p>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <button
                onClick={() => onSelectProject(selectedRisk.project_id)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-xs font-semibold transition-colors flex items-center justify-center space-x-1"
              >
                <span>Open Project Risk File</span>
                <ArrowUpRight size={14} />
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-md p-6 text-center text-xs text-slate-400">
            Select a project to inspect factor contributions.
          </div>
        )}
      </div>
    </div>
  );
}
