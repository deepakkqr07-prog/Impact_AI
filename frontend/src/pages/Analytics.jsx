import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Download, 
  Printer, 
  Filter, 
  RefreshCw, 
  FileSpreadsheet, 
  FileText,
  PieChart as PieIcon,
  TrendingUp,
  Layers
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { api } from '../api';
import { StatusBadge, RiskBadge } from '../components/StatusBadge';

const SECTORS = [
  "All",
  "Transportation & Highways",
  "Railways & Metros",
  "Power & Renewable Energy",
  "Urban Infrastructure & Water",
  "Ports & Shipping",
  "Civil Aviation & Airports",
  "Telecommunications"
];

const RISK_LEVELS = ["All", "High", "Medium", "Low"];

export function Analytics({ onSelectProject }) {
  const [charts, setCharts] = useState(null);
  const [reportRows, setReportRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sectorFilter, setSectorFilter] = useState('All');
  const [riskFilter, setRiskFilter] = useState('All');
  const [exporting, setExporting] = useState(false);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [chartData, reportsData] = await Promise.all([
        api.getDashboardCharts(),
        api.getReportsData({ sector: sectorFilter, risk_level: riskFilter })
      ]);
      setCharts(chartData);
      setReportRows(reportsData);
    } catch (err) {
      console.error("Failed to load analytics data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [sectorFilter, riskFilter]);

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      const blob = await api.exportCsv({ sector: sectorFilter, risk_level: riskFilter });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `infrastructure_monitoring_report_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert("Failed to export CSV: " + err.message);
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-200 no-print">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">
            Data Analytics & Executive Infrastructure Reports
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cross-sector comparative performance, expenditure pace, variance forecasting and audited records export
          </p>
        </div>

        <div className="mt-3 sm:mt-0 flex items-center space-x-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
          >
            <Printer size={13} />
            <span>Print Official Report</span>
          </button>
          <button
            onClick={handleExportCsv}
            disabled={exporting}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-700 text-white rounded text-xs font-semibold hover:bg-emerald-800 shadow-2xs transition-colors"
          >
            <Download size={13} />
            <span>{exporting ? 'Exporting...' : 'Export Dataset (CSV)'}</span>
          </button>
        </div>
      </div>

      {/* Filter Ribbon */}
      <div className="bg-white border border-slate-200 rounded-md p-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs no-print">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
            Infrastructure Sector
          </label>
          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            className="w-full py-1.5 px-2 border border-slate-300 rounded bg-white text-slate-800"
          >
            {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
            Risk Classification Filter
          </label>
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="w-full py-1.5 px-2 border border-slate-300 rounded bg-white text-slate-800"
          >
            {RISK_LEVELS.map(r => <option key={r} value={r}>{r === 'All' ? 'All Risk Levels' : `${r} Risk`}</option>)}
          </select>
        </div>

        <div className="flex items-end">
          <button
            onClick={fetchAnalytics}
            className="w-full py-1.5 px-3 bg-slate-100 hover:bg-slate-200 rounded font-semibold text-slate-700 transition-colors flex items-center justify-center space-x-1.5"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Re-compute Analytics</span>
          </button>
        </div>
      </div>

      {/* Row 1: Quarterly Spending Trends & Sector Expenditure */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 no-print">
        {/* Quarterly Spending Trend */}
        <div className="bg-white border border-slate-200 rounded-md p-4">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
            Quarterly Capital Disbursement Trend (₹ Crores)
          </h2>
          <p className="text-[11px] text-slate-500 mb-3">Portfolio disbursements over recent fiscal quarters</p>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts?.quarterly_trend || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="period" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip 
                  formatter={(val) => [`₹${val} Cr`, 'Disbursed']}
                  contentStyle={{ fontSize: '11px', backgroundColor: '#fff', borderColor: '#cbd5e1' }}
                />
                <Area type="monotone" dataKey="expenditure" stroke="#1d4ed8" fill="#dbeafe" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sector Cost Comparison Bar */}
        <div className="bg-white border border-slate-200 rounded-md p-4">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
            Sectoral Budget vs Actual Spent (₹ Crores)
          </h2>
          <p className="text-[11px] text-slate-500 mb-3">Comparative capital allocation and utilization</p>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts?.sector_data || []} margin={{ top: 10, right: 10, left: 0, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="sector" tick={{ fontSize: 9, fill: '#64748b' }} angle={-20} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip 
                  formatter={(val, name) => [`₹${val} Cr`, name === 'approved' ? 'Approved Outlay' : 'Actual Spent']}
                  contentStyle={{ fontSize: '11px', backgroundColor: '#fff', borderColor: '#cbd5e1' }}
                />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="approved" fill="#94a3b8" name="Approved Outlay" radius={[2, 2, 0, 0]} />
                <Bar dataKey="spent" fill="#2563eb" name="Actual Spent" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Official Printable Table / Executive Report */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden card">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Consolidated Infrastructure Progress & Escalation Register
            </h2>
            <p className="text-[11px] text-slate-500">Official audit ledger as of {new Date().toLocaleDateString('en-IN')}</p>
          </div>
          <span className="text-xs font-bold text-blue-900 px-2 py-0.5 rounded bg-blue-50 border border-blue-200">
            {reportRows.length} Projects
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-2.5 px-3">Project Code</th>
                <th className="py-2.5 px-3">Project Name & Agency</th>
                <th className="py-2.5 px-3">Sector</th>
                <th className="py-2.5 px-3 text-right">Approved Outlay</th>
                <th className="py-2.5 px-3 text-right">Actual Spent</th>
                <th className="py-2.5 px-3 text-right">Predicted Overrun</th>
                <th className="py-2.5 px-3 text-center">Progress</th>
                <th className="py-2.5 px-3 text-center">Risk Score</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reportRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="py-2 px-3 font-mono text-[11px] font-bold text-blue-900">{row.project_code}</td>
                  <td className="py-2 px-3 max-w-xs font-medium text-slate-900">
                    <button
                      onClick={() => onSelectProject(row.id)}
                      className="text-left hover:text-blue-700 truncate block w-full"
                    >
                      {row.name}
                    </button>
                    <span className="text-[10px] text-slate-500 block">{row.implementing_agency}</span>
                  </td>
                  <td className="py-2 px-3 text-slate-600">{row.sector}</td>
                  <td className="py-2 px-3 text-right font-semibold">₹{row.approved_cost.toLocaleString()} Cr</td>
                  <td className="py-2 px-3 text-right font-semibold text-slate-800">₹{row.actual_expenditure.toLocaleString()} Cr</td>
                  <td className="py-2 px-3 text-right font-bold text-rose-700">
                    +₹{row.predicted_overrun.toLocaleString()} Cr
                  </td>
                  <td className="py-2 px-3 text-center font-bold text-blue-700">
                    {row.actual_progress}%
                  </td>
                  <td className="py-2 px-3 text-center">
                    <RiskBadge level={row.risk_level} />
                  </td>
                  <td className="py-2 px-3 text-center">
                    <StatusBadge status={row.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
