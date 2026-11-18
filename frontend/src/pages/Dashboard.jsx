import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  FolderKanban, 
  ClockAlert, 
  ShieldAlert, 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle,
  ArrowUpRight,
  Filter,
  RefreshCw,
  BellRing
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area
} from 'recharts';
import { api } from '../api';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge, RiskBadge } from '../components/StatusBadge';

const STATUS_COLORS = {
  'Ongoing': '#2563eb',
  'Completed': '#059669',
  'Delayed': '#d97706',
  'Critical Attention': '#dc2626'
};

const RISK_COLORS = {
  'Low': '#10b981',
  'Medium': '#f59e0b',
  'High': '#ef4444'
};

export function Dashboard({ onNavigate }) {
  const [summary, setSummary] = useState(null);
  const [charts, setCharts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      const [sumData, chartData] = await Promise.all([
        api.getDashboardSummary(),
        api.getDashboardCharts()
      ]);
      setSummary(sumData);
      setCharts(chartData);
    } catch (err) {
      console.error("Dashboard data load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center space-y-2">
          <div className="w-8 h-8 border-2 border-blue-700 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-medium text-slate-500">Loading infrastructure analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">
            Central Infrastructure Project Monitoring Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time tracking, AI cost overrun estimation, delay modeling and early warning indicators
          </p>
        </div>
        <div className="mt-3 sm:mt-0 flex items-center space-x-2">
          <button
            onClick={fetchDashboardData}
            disabled={refreshing}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            <span>Refresh Telemetry</span>
          </button>
          <button
            onClick={() => onNavigate('new-project')}
            className="inline-flex items-center space-x-1 px-3 py-1.5 bg-blue-700 text-white rounded text-xs font-medium hover:bg-blue-800 shadow-2xs transition-colors"
          >
            <span>+ Add Project</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <MetricCard
          title="Total Projects"
          value={summary?.total_projects || 0}
          subtext="Under Central Monitoring"
          icon={FolderKanban}
          onClick={() => onNavigate('projects')}
        />
        <MetricCard
          title="Ongoing Works"
          value={summary?.ongoing_projects || 0}
          subtext="Active execution"
          icon={Building2}
          badge="In Field"
          onClick={() => onNavigate('projects')}
        />
        <MetricCard
          title="Completed"
          value={summary?.completed_projects || 0}
          subtext="Commissioned"
          icon={CheckCircle2}
          onClick={() => onNavigate('projects')}
        />
        <MetricCard
          title="Schedule Delayed"
          value={summary?.delayed_projects || 0}
          subtext="Exceeding schedule"
          icon={ClockAlert}
          badge="Delayed"
          onClick={() => onNavigate('delay-prediction')}
        />
        <MetricCard
          title="High Risk"
          value={summary?.high_risk_projects || 0}
          subtext="Risk Score ≥ 65"
          icon={ShieldAlert}
          badge="Critical"
          highlight
          onClick={() => onNavigate('risk-assessment')}
        />
        <MetricCard
          title="Predicted Overrun"
          value={`₹${Math.round(summary?.total_predicted_overrun || 0).toLocaleString()} Cr`}
          subtext="ML Model Forecast"
          icon={TrendingUp}
          onClick={() => onNavigate('cost-prediction')}
        />
        <MetricCard
          title="Active Alerts"
          value={summary?.new_alerts_count || 0}
          subtext="Requires Immediate Review"
          icon={BellRing}
          badge="Action Req"
          onClick={() => onNavigate('alerts')}
        />
      </div>

      {/* Financial Portfolio Summary Ribbon */}
      <div className="bg-slate-900 text-white rounded-md p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-blue-400">Portfolio Financial Position</span>
          <h2 className="text-sm font-semibold text-slate-100">Capital Outlay & Expenditure Tracking</h2>
        </div>
        <div className="grid grid-cols-3 gap-6 text-center md:text-right">
          <div>
            <div className="text-[11px] text-slate-400">Total Approved Outlay</div>
            <div className="text-base font-bold text-white">₹{summary?.total_approved_cost?.toLocaleString()} Cr</div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400">Revised Commitments</div>
            <div className="text-base font-bold text-amber-300">₹{summary?.total_revised_cost?.toLocaleString()} Cr</div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400">Total Actual Spent</div>
            <div className="text-base font-bold text-emerald-400">₹{summary?.total_actual_expenditure?.toLocaleString()} Cr</div>
          </div>
        </div>
      </div>

      {/* Row 1: Charts: Status Distribution & Budget vs Actual */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Project Status Distribution */}
        <div className="bg-white border border-slate-200 rounded-md p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Project Status Distribution
            </h3>
            <span className="text-[11px] text-slate-400">Ground Status</span>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts?.status_distribution || []}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={3}
                >
                  {(charts?.status_distribution || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || '#64748b'} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(val, name) => [`${val} Projects`, name]} 
                  contentStyle={{ fontSize: '11px', backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: '4px' }}
                />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Budget vs Actual Expenditure (Top Projects) */}
        <div className="bg-white border border-slate-200 rounded-md p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Budget vs Revised vs Actual Expenditure (₹ Crores)
              </h3>
              <p className="text-[11px] text-slate-500">Comparative financial progress on key infrastructure investments</p>
            </div>
            <button 
              onClick={() => onNavigate('analytics')}
              className="text-xs text-blue-700 hover:text-blue-900 font-medium inline-flex items-center"
            >
              Full Analytics <ArrowUpRight size={13} className="ml-0.5" />
            </button>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts?.budget_comparison || []} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="code" tick={{ fontSize: 10, fill: '#64748b' }} interval={0} angle={-15} textAnchor="end" />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{ fontSize: '11px', backgroundColor: '#fff', borderColor: '#cbd5e1', borderRadius: '4px' }}
                  formatter={(val, name) => [`₹${val} Cr`, name === 'approved' ? 'Approved Budget' : (name === 'revised' ? 'Revised Cost' : 'Actual Spent')]}
                />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                <Bar dataKey="approved" fill="#94a3b8" name="Approved Outlay" radius={[2, 2, 0, 0]} />
                <Bar dataKey="revised" fill="#f59e0b" name="Revised Cost" radius={[2, 2, 0, 0]} />
                <Bar dataKey="actual" fill="#1d4ed8" name="Actual Expenditure" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: Planned vs Actual Progress & Risk Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Planned vs Actual Physical Progress */}
        <div className="bg-white border border-slate-200 rounded-md p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Planned vs Actual Ground Progress (%)
              </h3>
              <p className="text-[11px] text-slate-500">Physical deliverable completion vs scheduled milestones</p>
            </div>
            <button 
              onClick={() => onNavigate('delay-prediction')}
              className="text-xs text-blue-700 hover:text-blue-900 font-medium inline-flex items-center"
            >
              Delay Modeling <ArrowUpRight size={13} className="ml-0.5" />
            </button>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts?.progress_comparison || []} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="code" tick={{ fontSize: 10, fill: '#64748b' }} interval={0} angle={-15} textAnchor="end" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{ fontSize: '11px', backgroundColor: '#fff', borderColor: '#cbd5e1', borderRadius: '4px' }}
                  formatter={(val, name) => [`${val}%`, name === 'planned' ? 'Planned Target' : (name === 'actual' ? 'Actual Ground Progress' : 'Deficit')]}
                />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                <Bar dataKey="planned" fill="#cbd5e1" name="Planned Target %" radius={[2, 2, 0, 0]} />
                <Bar dataKey="actual" fill="#0284c7" name="Actual Progress %" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Level Distribution */}
        <div className="bg-white border border-slate-200 rounded-md p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Project Risk Breakdown
            </h3>
            <span className="text-[11px] text-slate-400">Calibrated ML</span>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts?.risk_distribution || []}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {(charts?.risk_distribution || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={RISK_COLORS[entry.name] || '#64748b'} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(val, name) => [`${val} Projects`, `${name} Risk`]} 
                  contentStyle={{ fontSize: '11px', backgroundColor: '#fff', borderColor: '#cbd5e1', borderRadius: '4px' }}
                />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3: Sector-wise breakdown table */}
      <div className="bg-white border border-slate-200 rounded-md p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Sector-Wise Infrastructure Performance Summary
            </h3>
            <p className="text-[11px] text-slate-500">Aggregated financial commitment and physical progress by sector</p>
          </div>
          <button
            onClick={() => onNavigate('projects')}
            className="text-xs text-blue-700 hover:text-blue-900 font-medium"
          >
            Explore Projects Table →
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-y border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-2.5 px-3">Infrastructure Sector</th>
                <th className="py-2.5 px-3 text-center">Active Projects</th>
                <th className="py-2.5 px-3 text-right">Approved Outlay (₹ Cr)</th>
                <th className="py-2.5 px-3 text-right">Actual Spent (₹ Cr)</th>
                <th className="py-2.5 px-3 text-center">Avg Progress</th>
                <th className="py-2.5 px-3 text-right">Disbursement Ratio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(charts?.sector_data || []).map((sec, i) => {
                const ratio = sec.approved > 0 ? ((sec.spent / sec.approved) * 100).toFixed(1) : 0;
                return (
                  <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2 px-3 font-medium text-slate-900">{sec.sector}</td>
                    <td className="py-2 px-3 text-center font-semibold text-slate-800">{sec.count}</td>
                    <td className="py-2 px-3 text-right font-medium">₹{sec.approved.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right text-slate-800">₹{sec.spent.toLocaleString()}</td>
                    <td className="py-2 px-3 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-blue-600 h-full rounded-full" 
                            style={{ width: `${Math.min(100, sec.avg_progress)}%` }}
                          ></div>
                        </div>
                        <span className="font-semibold text-[11px]">{sec.avg_progress}%</span>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-right font-semibold text-slate-700">{ratio}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
