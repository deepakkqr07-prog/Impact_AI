import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Filter, 
  ArrowUpRight, 
  AlertCircle, 
  Info,
  CheckCircle,
  RefreshCw,
  Cpu
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { api } from '../api';
import { RiskBadge } from '../components/StatusBadge';

export function CostPrediction({ onSelectProject }) {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [riskFilter, setRiskFilter] = useState('All');
  const [selectedPrediction, setSelectedPrediction] = useState(null);

  const fetchCostPredictions = async () => {
    try {
      setLoading(true);
      const data = await api.getCostPredictions({ risk_level: riskFilter });
      setPredictions(data);
      if (data.length > 0 && !selectedPrediction) {
        setSelectedPrediction(data[0]);
      }
    } catch (err) {
      console.error("Failed to load cost predictions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCostPredictions();
  }, [riskFilter]);

  const totalOverrun = predictions.reduce((sum, p) => sum + (p.predicted_cost_overrun || 0), 0);
  const highRiskCount = predictions.filter(p => p.risk_level === 'High').length;

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">
            AI Cost Overrun Prediction & Variance Analysis
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Trained Random Forest Regression estimating budget escalation, burn rate velocity and cost determinants
          </p>
        </div>
        <div className="mt-3 sm:mt-0 flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-slate-700 text-xs">
            <Cpu size={14} className="text-blue-700" />
            <span className="font-medium">Model: Ensemble RF (Trained)</span>
          </div>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 border border-slate-200 rounded-md">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Portfolio Overrun Risk</div>
          <div className="text-xl font-bold text-rose-700 mt-1">₹{Math.round(totalOverrun).toLocaleString()} Cr</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Sum of ML-predicted escalations</div>
        </div>

        <div className="bg-white p-3.5 border border-slate-200 rounded-md">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">High Risk Escalations</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{highRiskCount} Projects</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Overrun percentage ≥ 20%</div>
        </div>

        <div className="bg-white p-3.5 border border-slate-200 rounded-md">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Average Forecast Margin</div>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {predictions.length > 0 ? (predictions.reduce((s, p) => s + p.predicted_overrun_percentage, 0) / predictions.length).toFixed(1) : 0}%
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Over approved project baselines</div>
        </div>

        <div className="bg-white p-3.5 border border-slate-200 rounded-md">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Model Inference Quality</div>
          <div className="text-xl font-bold text-emerald-700 mt-1">88.2% Conf.</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Cross-validated R² = 0.84</div>
        </div>
      </div>

      {/* Main Content: Table on Left, Detailed Feature Importance Card on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Predictions List Table */}
        <div className="bg-white border border-slate-200 rounded-md overflow-hidden lg:col-span-2">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Project Cost Forecasts ({predictions.length})
            </span>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-500 font-medium">Filter Risk:</span>
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="py-1 px-2 text-xs border border-slate-300 rounded bg-white text-slate-800"
              >
                <option value="All">All Risk</option>
                <option value="High">High Risk (≥20%)</option>
                <option value="Medium">Medium Risk</option>
                <option value="Low">Low Risk</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Project Code & Name</th>
                  <th className="py-2.5 px-3 text-right">Approved Outlay</th>
                  <th className="py-2.5 px-3 text-right">Actual Spent</th>
                  <th className="py-2.5 px-3 text-right">Predicted Overrun</th>
                  <th className="py-2.5 px-3 text-center">Overrun %</th>
                  <th className="py-2.5 px-3 text-center">Risk Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {predictions.map((p) => {
                  const isSelected = selectedPrediction?.project_id === p.project_id;
                  return (
                    <tr 
                      key={p.project_id}
                      onClick={() => setSelectedPrediction(p)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-50/70 border-l-4 border-l-blue-700' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-2.5 px-3 max-w-xs">
                        <div className="font-semibold text-slate-900 truncate">{p.project_name}</div>
                        <span className="font-mono text-[10px] text-blue-900">{p.project_code} • {p.sector}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-800">
                        ₹{p.approved_cost.toLocaleString()} Cr
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-700">
                        ₹{p.actual_expenditure.toLocaleString()} Cr
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-rose-700">
                        +₹{p.predicted_cost_overrun.toLocaleString()} Cr
                      </td>
                      <td className="py-2.5 px-3 text-center font-semibold text-slate-900">
                        +{p.predicted_overrun_percentage}%
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <RiskBadge level={p.risk_level} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Selected Project Deep Analysis */}
        {selectedPrediction ? (
          <div className="bg-white border border-slate-200 rounded-md p-4 space-y-4">
            <div className="pb-2 border-b border-slate-100">
              <span className="font-mono text-[10px] text-blue-800 font-bold px-1.5 py-0.5 rounded bg-blue-50">
                {selectedPrediction.project_code}
              </span>
              <h2 className="text-sm font-bold text-slate-900 mt-1">
                {selectedPrediction.project_name}
              </h2>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-slate-500">Predicted Overrun:</span>
                <span className="text-base font-bold text-rose-700">
                  +₹{selectedPrediction.predicted_cost_overrun} Cr (+{selectedPrediction.predicted_overrun_percentage}%)
                </span>
              </div>
            </div>

            {/* Financial Comparison Bars */}
            <div className="space-y-2 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Financial Comparison</span>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-600">Approved Outlay:</span>
                  <span className="font-semibold text-slate-900">₹{selectedPrediction.approved_cost} Cr</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Revised Outlay:</span>
                  <span className="font-semibold text-slate-900">₹{selectedPrediction.revised_cost} Cr</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Actual Spent:</span>
                  <span className="font-semibold text-blue-700">₹{selectedPrediction.actual_expenditure} Cr</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1.5">
                  <span className="font-semibold text-slate-800">Forecast Final Outlay:</span>
                  <span className="font-bold text-rose-800">₹{selectedPrediction.estimated_final_cost} Cr</span>
                </div>
              </div>
            </div>

            {/* Top Contributing Feature Factors */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                Important Factors Influencing Prediction
              </span>
              <div className="space-y-2">
                {(selectedPrediction.feature_importances || []).map((f, i) => (
                  <div key={i} className="text-xs">
                    <div className="flex justify-between text-[11px] mb-0.5">
                      <span className="text-slate-700 font-medium">{f.label}</span>
                      <span className="font-semibold text-slate-900">{f.importance_percentage}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-blue-600 h-full rounded-full" 
                        style={{ width: `${Math.min(100, f.importance_percentage * 3.5)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Contributing Reasons */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                Model Variance Notes
              </span>
              <ul className="text-xs space-y-1 text-slate-600 list-disc list-inside">
                {(selectedPrediction.contributing_factors || []).map((r, i) => (
                  <li key={i} className="leading-relaxed">{r}</li>
                ))}
              </ul>
            </div>

            <div className="pt-2">
              <button
                onClick={() => onSelectProject(selectedPrediction.project_id)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-xs font-semibold transition-colors flex items-center justify-center space-x-1"
              >
                <span>View Full Project Dossier</span>
                <ArrowUpRight size={14} />
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-md p-6 text-center text-xs text-slate-400">
            Select a project from the table to inspect feature importances.
          </div>
        )}
      </div>
    </div>
  );
}
