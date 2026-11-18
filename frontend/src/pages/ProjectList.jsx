import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  PlusCircle, 
  Eye, 
  Edit3, 
  Trash2, 
  Download, 
  AlertCircle,
  Building,
  RefreshCw
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge, RiskBadge } from '../components/StatusBadge';
import { ConfirmModal } from '../components/ConfirmModal';

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

const STATUSES = ["All", "Ongoing", "Completed", "Delayed", "Critical Attention"];
const RISK_LEVELS = ["All", "Low", "Medium", "High"];

export function ProjectList({ onNavigate, onSelectProject }) {
  const { hasRole, isAdmin, isGovOfficer } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [riskFilter, setRiskFilter] = useState('All');
  
  // Modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const params = {};
      if (search) params.search = search;
      if (sectorFilter !== 'All') params.sector = sectorFilter;
      if (statusFilter !== 'All') params.status = statusFilter;
      if (riskFilter !== 'All') params.risk_level = riskFilter;

      const data = await api.getProjects(params);
      setProjects(data);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [sectorFilter, statusFilter, riskFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchProjects();
  };

  const handleDeleteClick = (project) => {
    setProjectToDelete(project);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!projectToDelete) return;
    try {
      setDeleteLoading(true);
      await api.deleteProject(projectToDelete.id);
      setDeleteModalOpen(false);
      setProjectToDelete(null);
      fetchProjects();
    } catch (err) {
      alert(err.message || 'Failed to delete project');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">
            Central Infrastructure Project Registry
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Registered public infrastructure assets, capital outlays, progress milestones and risk classifications
          </p>
        </div>
        {hasRole(["Administrator", "Government Monitoring Officer", "Project Manager"]) && (
          <button
            onClick={() => onNavigate('new-project')}
            className="mt-3 sm:mt-0 inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-700 text-white rounded text-xs font-semibold hover:bg-blue-800 shadow-2xs transition-colors"
          >
            <PlusCircle size={14} />
            <span>Add New Infrastructure Project</span>
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded text-xs flex items-center space-x-2">
          <AlertCircle size={15} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-md p-3.5 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
          {/* Search box */}
          <form onSubmit={handleSearchSubmit} className="md:col-span-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Search code, name, agency..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-700"
              />
              <Search size={14} className="absolute left-2.5 top-2 text-slate-400" />
            </div>
          </form>

          {/* Sector Filter */}
          <div>
            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className="w-full py-1.5 px-2.5 text-xs border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-700"
            >
              {SECTORS.map((sec) => (
                <option key={sec} value={sec}>{sec === 'All' ? 'All Sectors' : sec}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full py-1.5 px-2.5 text-xs border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-700"
            >
              {STATUSES.map((st) => (
                <option key={st} value={st}>{st === 'All' ? 'All Statuses' : st}</option>
              ))}
            </select>
          </div>

          {/* Risk Level Filter */}
          <div>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="w-full py-1.5 px-2.5 text-xs border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-700"
            >
              {RISK_LEVELS.map((rk) => (
                <option key={rk} value={rk}>{rk === 'All' ? 'All Risk Levels' : `${rk} Risk`}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Projects Table */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Showing {projects.length} Project Records
          </span>
          <button
            onClick={fetchProjects}
            className="text-xs text-slate-600 hover:text-slate-900 inline-flex items-center space-x-1"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            <span>Reload</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-2.5 px-3">Project Code</th>
                <th className="py-2.5 px-3">Project Name & Sector</th>
                <th className="py-2.5 px-3">Implementing Agency</th>
                <th className="py-2.5 px-3 text-right">Approved Outlay</th>
                <th className="py-2.5 px-3 text-right">Actual Spent</th>
                <th className="py-2.5 px-3 text-center">Progress (Act / Plan)</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-center">Risk Level</th>
                <th className="py-2.5 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-slate-500">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-blue-700 border-t-transparent rounded-full animate-spin"></div>
                      <span>Querying project records...</span>
                    </div>
                  </td>
                </tr>
              ) : projects.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-slate-500">
                    No infrastructure projects found matching the specified filters.
                  </td>
                </tr>
              ) : (
                projects.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-[11px] font-semibold text-blue-900">
                      {p.project_code}
                    </td>
                    <td className="py-2.5 px-3 max-w-xs">
                      <button
                        onClick={() => onSelectProject(p.id)}
                        className="text-left font-medium text-slate-900 hover:text-blue-700 truncate block w-full"
                      >
                        {p.name}
                      </button>
                      <span className="text-[10px] text-slate-500 block">{p.sector} • {p.location_state}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 truncate max-w-[140px]">
                      {p.implementing_agency}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-slate-900">
                      ₹{p.approved_cost?.toLocaleString()} Cr
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-800">
                      ₹{p.actual_expenditure?.toLocaleString()} Cr
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex flex-col items-center">
                        <span className="font-semibold text-slate-800">
                          {p.actual_progress}% <span className="text-[10px] font-normal text-slate-400">/ {p.planned_progress}%</span>
                        </span>
                        <div className="w-16 bg-slate-100 h-1 rounded-full mt-1 overflow-hidden">
                          <div 
                            className="bg-blue-600 h-full rounded-full" 
                            style={{ width: `${Math.min(100, p.actual_progress)}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <RiskBadge level={p.risk_level} />
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          onClick={() => onSelectProject(p.id)}
                          title="View Details"
                          className="p-1 text-slate-600 hover:text-blue-700 hover:bg-slate-100 rounded"
                        >
                          <Eye size={14} />
                        </button>
                        {hasRole(["Administrator", "Government Monitoring Officer", "Project Manager"]) && (
                          <button
                            onClick={() => onNavigate('edit-project', p.id)}
                            title="Edit Project"
                            className="p-1 text-slate-600 hover:text-amber-600 hover:bg-slate-100 rounded"
                          >
                            <Edit3 size={14} />
                          </button>
                        )}
                        {(isAdmin || isGovOfficer) && (
                          <button
                            onClick={() => handleDeleteClick(p)}
                            title="Delete Project"
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded"
                          >
                            <Trash2 size={14} />
                          </button>
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

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Confirm Project Deletion"
        message={`Are you sure you want to permanently delete project ${projectToDelete?.project_code} (${projectToDelete?.name})? All associated milestones, expenditure records, and alert history will be removed.`}
        confirmText={deleteLoading ? "Deleting..." : "Permanently Delete"}
        isDanger={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteModalOpen(false);
          setProjectToDelete(null);
        }}
      />
    </div>
  );
}
