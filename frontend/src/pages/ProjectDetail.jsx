import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  ClockAlert, 
  ShieldAlert, 
  BellRing, 
  Plus, 
  CheckCircle2, 
  AlertTriangle,
  RefreshCw,
  Building,
  MapPin,
  Briefcase,
  FileText
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge, RiskBadge, AlertBadge } from '../components/StatusBadge';

export function ProjectDetail({ projectId, onBack, onEdit }) {
  const { hasRole } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [recalculating, setRecalculating] = useState(false);

  // Milestone modal / form state
  const [milestoneModal, setMilestoneModal] = useState(false);
  const [newMilestone, setNewMilestone] = useState({
    title: '',
    description: '',
    planned_completion_date: '',
    status: 'Pending',
    weight_percentage: 15.0,
    is_critical_path: false
  });

  // Expenditure modal state
  const [expenditureModal, setExpenditureModal] = useState(false);
  const [newExp, setNewExp] = useState({
    fiscal_year: '2024-25',
    quarter: 'Q2',
    amount: '',
    expenditure_category: 'Civil Works',
    voucher_ref: ''
  });

  // Progress update modal state
  const [progressModal, setProgressModal] = useState(false);
  const [newProgress, setNewProgress] = useState({
    physical_progress: '',
    financial_progress: '',
    remarks: ''
  });

  const fetchProjectDetails = async () => {
    try {
      setLoading(true);
      const data = await api.getProject(projectId);
      setProject(data);
      if (data) {
        setNewProgress({
          physical_progress: data.actual_progress || 0,
          financial_progress: Math.round(((data.actual_expenditure || 0) / Math.max(1, data.approved_cost || 1)) * 100),
          remarks: ''
        });
      }
    } catch (err) {
      console.error("Error fetching project detail:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectDetails();
  }, [projectId]);

  const handleRecalculate = async () => {
    try {
      setRecalculating(true);
      await api.recalculatePredictions(projectId);
      await fetchProjectDetails();
    } catch (err) {
      alert("Failed to recalculate predictions: " + err.message);
    } finally {
      setRecalculating(false);
    }
  };

  const handleAddMilestone = async (e) => {
    e.preventDefault();
    try {
      await api.addMilestone(projectId, newMilestone);
      setMilestoneModal(false);
      setNewMilestone({
        title: '',
        description: '',
        planned_completion_date: '',
        status: 'Pending',
        weight_percentage: 15.0,
        is_critical_path: false
      });
      fetchProjectDetails();
    } catch (err) {
      alert(err.message || 'Failed to add milestone');
    }
  };

  const handleAddExpenditure = async (e) => {
    e.preventDefault();
    try {
      await api.addExpenditure(projectId, {
        ...newExp,
        amount: parseFloat(newExp.amount)
      });
      setExpenditureModal(false);
      setNewExp({
        fiscal_year: '2024-25',
        quarter: 'Q2',
        amount: '',
        expenditure_category: 'Civil Works',
        voucher_ref: ''
      });
      fetchProjectDetails();
    } catch (err) {
      alert(err.message || 'Failed to record expenditure');
    }
  };

  const handleAddProgress = async (e) => {
    e.preventDefault();
    try {
      await api.addProgressUpdate(projectId, {
        physical_progress: parseFloat(newProgress.physical_progress),
        financial_progress: parseFloat(newProgress.financial_progress),
        remarks: newProgress.remarks
      });
      setProgressModal(false);
      fetchProjectDetails();
    } catch (err) {
      alert(err.message || 'Failed to submit progress update');
    }
  };

  const handleAlertStatusUpdate = async (alertId, newStatus) => {
    try {
      await api.updateAlertStatus(alertId, {
        status: newStatus,
        resolution_notes: `Marked as ${newStatus} from project monitor console.`
      });
      fetchProjectDetails();
    } catch (err) {
      alert(err.message || 'Failed to update alert');
    }
  };

  if (loading || !project) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-6 h-6 border-2 border-blue-700 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Parse latest predictions and risk data
  const costPrediction = project.predictions?.filter(p => p.prediction_type === 'cost_overrun')[0];
  const delayPrediction = project.predictions?.filter(p => p.prediction_type === 'schedule_delay')[0];
  const latestRisk = project.risk_assessments?.[0];
  let parsedFactors = [];
  try {
    if (latestRisk?.factors_json) {
      parsedFactors = JSON.parse(latestRisk.factors_json);
    }
  } catch (e) {}

  let featureImportances = [];
  try {
    if (costPrediction?.feature_importance_json) {
      featureImportances = JSON.parse(costPrediction.feature_importance_json);
    }
  } catch (e) {}

  return (
    <div className="space-y-5">
      {/* Top Banner Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">
                {project.project_code}
              </span>
              <StatusBadge status={project.status} />
              <RiskBadge level={project.risk_level} />
            </div>
            <h1 className="text-lg font-bold text-slate-900 mt-1">{project.name}</h1>
          </div>
        </div>

        <div className="mt-3 sm:mt-0 flex items-center space-x-2">
          <button
            onClick={handleRecalculate}
            disabled={recalculating}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-2xs"
          >
            <RefreshCw size={13} className={recalculating ? 'animate-spin' : ''} />
            <span>Recalibrate AI Models</span>
          </button>
          {hasRole(["Administrator", "Government Monitoring Officer", "Project Manager"]) && (
            <button
              onClick={() => onEdit(project.id)}
              className="px-3 py-1.5 bg-blue-700 text-white rounded text-xs font-semibold hover:bg-blue-800 shadow-2xs"
            >
              Edit Project Data
            </button>
          )}
        </div>
      </div>

      {/* Highlights Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-white p-3.5 border border-slate-200 rounded-md">
        <div>
          <div className="text-[10px] uppercase font-bold text-slate-400">Approved Outlay</div>
          <div className="text-base font-bold text-slate-900">₹{project.approved_cost?.toLocaleString()} Cr</div>
          <div className="text-[10px] text-slate-500">Revised: ₹{project.revised_cost?.toLocaleString()} Cr</div>
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold text-slate-400">Actual Expenditure</div>
          <div className="text-base font-bold text-slate-900">₹{project.actual_expenditure?.toLocaleString()} Cr</div>
          <div className="text-[10px] text-blue-700 font-medium">
            {project.approved_cost > 0 ? ((project.actual_expenditure / project.approved_cost) * 100).toFixed(1) : 0}% disbursed
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold text-slate-400">Physical Progress</div>
          <div className="text-base font-bold text-slate-900">{project.actual_progress}%</div>
          <div className="text-[10px] text-slate-500">Target: {project.planned_progress}%</div>
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold text-slate-400">Composite Risk Score</div>
          <div className="text-base font-bold text-slate-900">{project.risk_score?.toFixed(1)} / 100</div>
          <div className="text-[10px] text-slate-500 font-medium">{project.risk_level} Risk Category</div>
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold text-slate-400">Target Completion</div>
          <div className="text-base font-bold text-slate-900">{project.expected_completion_date}</div>
          <div className="text-[10px] text-slate-500">Started: {project.planned_start_date}</div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="border-b border-slate-200 bg-white px-2 rounded-t-md">
        <nav className="flex space-x-6 text-xs font-semibold">
          {[
            { id: 'overview', label: 'Project Overview' },
            { id: 'milestones', label: `Milestones (${project.milestones?.length || 0})` },
            { id: 'expenditures', label: `Disbursements (${project.expenditures?.length || 0})` },
            { id: 'progress', label: `Field Updates (${project.progress_updates?.length || 0})` },
            { id: 'predictions', label: 'AI Predictive Analysis' },
            { id: 'risk', label: 'Risk Decomposition' },
            { id: 'alerts', label: `Early Warnings (${project.alerts?.length || 0})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-1 border-b-2 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-700 text-blue-700 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-md p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-1 border-b border-slate-100">
              Administrative & Operational Details
            </h3>
            <div className="grid grid-cols-2 gap-y-2.5 text-xs">
              <span className="text-slate-500 font-medium">Sector:</span>
              <span className="text-slate-900 font-semibold">{project.sector}</span>

              <span className="text-slate-500 font-medium">Ministry:</span>
              <span className="text-slate-900">{project.ministry}</span>

              <span className="text-slate-500 font-medium">Implementing Agency:</span>
              <span className="text-slate-900 font-semibold">{project.implementing_agency}</span>

              <span className="text-slate-500 font-medium">State / District:</span>
              <span className="text-slate-900">{project.location_state} ({project.location_district || 'Multi-district'})</span>

              <span className="text-slate-500 font-medium">Project Scope:</span>
              <span className="text-slate-700 col-span-2 text-xs leading-relaxed mt-1 bg-slate-50 p-2.5 rounded border border-slate-100">
                {project.description || 'No detailed scope provided.'}
              </span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-md p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-1 border-b border-slate-100">
              Execution Velocity & Schedule Status
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between mb-1 text-slate-700">
                  <span className="font-medium">Physical Progress</span>
                  <span className="font-bold">{project.actual_progress}% of target {project.planned_progress}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-blue-600 h-full rounded-full" 
                    style={{ width: `${Math.min(100, project.actual_progress)}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1 text-slate-700">
                  <span className="font-medium">Financial Disbursement Pacing</span>
                  <span className="font-bold">
                    ₹{project.actual_expenditure?.toLocaleString()} Cr / ₹{project.approved_cost?.toLocaleString()} Cr
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-600 h-full rounded-full" 
                    style={{ width: `${Math.min(100, (project.actual_expenditure / Math.max(1, project.approved_cost)) * 100)}%` }}
                  ></div>
                </div>
              </div>

              <div className="p-3 rounded bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                <div className="font-bold mb-0.5">Execution Health Assessment</div>
                <p className="text-[11px] leading-relaxed">
                  {project.actual_progress < project.planned_progress - 10
                    ? `Physical ground execution is lagging behind scheduled trajectory by ${(project.planned_progress - project.actual_progress).toFixed(1)}%. Milestone intervention required.`
                    : 'Physical milestones are tracking within acceptable operational tolerance limits.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Milestones */}
      {activeTab === 'milestones' && (
        <div className="bg-white border border-slate-200 rounded-md p-4 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Critical Path & Project Deliverable Milestones
              </h3>
              <p className="text-[11px] text-slate-500">Deliverables tracked under monitoring charter</p>
            </div>
            {hasRole(["Administrator", "Government Monitoring Officer", "Project Manager"]) && (
              <button
                onClick={() => setMilestoneModal(true)}
                className="inline-flex items-center space-x-1 px-3 py-1.5 bg-blue-700 text-white rounded text-xs font-medium hover:bg-blue-800"
              >
                <Plus size={13} />
                <span>Add Milestone</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-y border-slate-200 font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-2 px-3">Milestone Title & Description</th>
                  <th className="py-2 px-3 text-center">Critical Path</th>
                  <th className="py-2 px-3 text-center">Planned Date</th>
                  <th className="py-2 px-3 text-center">Weight</th>
                  <th className="py-2 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(project.milestones || []).map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80">
                    <td className="py-2 px-3">
                      <div className="font-semibold text-slate-900">{m.title}</div>
                      <div className="text-[11px] text-slate-500">{m.description}</div>
                    </td>
                    <td className="py-2 px-3 text-center">
                      {m.is_critical_path ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-100 text-rose-800 font-bold">YES</span>
                      ) : (
                        <span className="text-slate-400">No</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center font-mono">{m.planned_completion_date}</td>
                    <td className="py-2 px-3 text-center font-semibold">{m.weight_percentage}%</td>
                    <td className="py-2 px-3 text-center">
                      <StatusBadge status={m.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Expenditures */}
      {activeTab === 'expenditures' && (
        <div className="bg-white border border-slate-200 rounded-md p-4 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Quarterly Expenditure & Disbursement Ledger
              </h3>
              <p className="text-[11px] text-slate-500">Audited fiscal withdrawals and category allotments</p>
            </div>
            {hasRole(["Administrator", "Government Monitoring Officer", "Project Manager"]) && (
              <button
                onClick={() => setExpenditureModal(true)}
                className="inline-flex items-center space-x-1 px-3 py-1.5 bg-blue-700 text-white rounded text-xs font-medium hover:bg-blue-800"
              >
                <Plus size={13} />
                <span>Record Disbursement</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-y border-slate-200 font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-2 px-3">Fiscal Period</th>
                  <th className="py-2 px-3">Category</th>
                  <th className="py-2 px-3 text-right">Amount (₹ Cr)</th>
                  <th className="py-2 px-3">Voucher Reference</th>
                  <th className="py-2 px-3 text-center">Recorded Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(project.expenditures || []).map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-semibold text-slate-900">{exp.fiscal_year} {exp.quarter}</td>
                    <td className="py-2 px-3">{exp.expenditure_category}</td>
                    <td className="py-2 px-3 text-right font-bold text-slate-900">₹{exp.amount.toFixed(2)} Cr</td>
                    <td className="py-2 px-3 font-mono text-[11px] text-slate-600">{exp.voucher_ref || 'N/A'}</td>
                    <td className="py-2 px-3 text-center text-slate-500">{exp.recorded_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Field Updates */}
      {activeTab === 'progress' && (
        <div className="bg-white border border-slate-200 rounded-md p-4 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Monthly Ground Progress Verification Updates
              </h3>
              <p className="text-[11px] text-slate-500">Field measurements and physical progress logs</p>
            </div>
            {hasRole(["Administrator", "Government Monitoring Officer", "Project Manager", "Department Officer"]) && (
              <button
                onClick={() => setProgressModal(true)}
                className="inline-flex items-center space-x-1 px-3 py-1.5 bg-blue-700 text-white rounded text-xs font-medium hover:bg-blue-800"
              >
                <Plus size={13} />
                <span>Log Progress Update</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-y border-slate-200 font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3 text-center">Physical Progress</th>
                  <th className="py-2 px-3 text-center">Financial Progress</th>
                  <th className="py-2 px-3">Field Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(project.progress_updates || []).map((pup) => (
                  <tr key={pup.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-mono text-slate-600">{pup.update_date}</td>
                    <td className="py-2 px-3 text-center font-bold text-blue-700">{pup.physical_progress}%</td>
                    <td className="py-2 px-3 text-center font-bold text-emerald-700">{pup.financial_progress}%</td>
                    <td className="py-2 px-3 text-slate-600">{pup.remarks || 'Standard field reconciliation'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: AI Predictions */}
      {activeTab === 'predictions' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Cost Overrun ML Model */}
          <div className="bg-white border border-slate-200 rounded-md p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <TrendingUp size={16} className="text-blue-700" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Cost Overrun Estimation Model
                </h3>
              </div>
              <RiskBadge level={costPrediction?.risk_level || 'Low'} />
            </div>

            <div className="bg-slate-50 p-3 rounded border border-slate-100 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Predicted Overrun Amount:</span>
                <span className="font-bold text-rose-700">₹{costPrediction?.predicted_value?.toFixed(2)} Cr</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Overrun Percentage:</span>
                <span className="font-bold text-rose-700">+{costPrediction?.predicted_percentage?.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Estimated Final Project Outlay:</span>
                <span className="font-bold text-slate-900">
                  ₹{(project.approved_cost + (costPrediction?.predicted_value || 0)).toFixed(2)} Cr
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Model Architecture & Confidence:</span>
                <span className="font-medium text-slate-700">{costPrediction?.model_version} ({(costPrediction?.confidence_score * 100).toFixed(0)}%)</span>
              </div>
            </div>

            {/* Feature Importances */}
            <div>
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2">
                Top Factors Influencing Cost Forecast:
              </span>
              <div className="space-y-1.5">
                {featureImportances.map((f, idx) => (
                  <div key={idx} className="text-xs">
                    <div className="flex justify-between text-[11px] text-slate-600 mb-0.5">
                      <span>{f.label}</span>
                      <span className="font-semibold">{f.importance_percentage}% importance</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                      <div 
                        className="bg-blue-600 h-full rounded-full" 
                        style={{ width: `${f.importance_percentage * 3}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Schedule Delay ML Model */}
          <div className="bg-white border border-slate-200 rounded-md p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <ClockAlert size={16} className="text-amber-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Schedule Delay Forecast Model
                </h3>
              </div>
              <RiskBadge level={delayPrediction?.risk_level || 'Low'} />
            </div>

            <div className="bg-slate-50 p-3 rounded border border-slate-100 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Estimated Delay Duration:</span>
                <span className="font-bold text-amber-700">
                  {delayPrediction?.predicted_value} days ({((delayPrediction?.predicted_value || 0) / 30).toFixed(1)} months)
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Ground Progress Deficit:</span>
                <span className="font-bold text-slate-800">
                  {Math.max(0, project.planned_progress - project.actual_progress).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Model Architecture:</span>
                <span className="font-medium text-slate-700">{delayPrediction?.model_version}</span>
              </div>
            </div>

            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded text-xs space-y-1.5">
              <span className="font-bold text-blue-900 uppercase text-[10px] tracking-wider block">
                Model Recommendation:
              </span>
              <p className="text-[11px] text-blue-800 leading-relaxed">
                Prioritize structural engineering clearances on overdue critical path milestones and issue formal notice to project management consultants (PMC).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Risk Decomposition */}
      {activeTab === 'risk' && (
        <div className="bg-white border border-slate-200 rounded-md p-4 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Multi-Indicator Risk Score Decomposition ({project.risk_score?.toFixed(1)}/100)
              </h3>
              <p className="text-[11px] text-slate-500">Detailed component weighting and indicator contribution</p>
            </div>
            <RiskBadge level={project.risk_level} />
          </div>

          <div className="space-y-3">
            {parsedFactors.map((factor, idx) => (
              <div key={idx} className="p-3 rounded border border-slate-100 bg-slate-50/60">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-900 mb-1">
                  <span>{factor.indicator} ({factor.weight_pct}% Portfolio Weight)</span>
                  <span className="text-blue-700 font-bold">{factor.score} / 100 Score</span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mb-1.5">
                  <div 
                    className={`h-full rounded-full ${
                      factor.score >= 65 ? 'bg-rose-600' : factor.score >= 35 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, factor.score)}%` }}
                  ></div>
                </div>
                <p className="text-[11px] text-slate-600">{factor.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 7: Alerts */}
      {activeTab === 'alerts' && (
        <div className="bg-white border border-slate-200 rounded-md p-4 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Active Early Warning Alerts for Project
              </h3>
              <p className="text-[11px] text-slate-500">Automated triggers based on anomaly and threshold detection</p>
            </div>
          </div>

          <div className="space-y-3">
            {(project.alerts || []).length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No active early warning alerts for this project.</p>
            ) : (
              (project.alerts || []).map((alert) => (
                <div key={alert.id} className="p-3.5 rounded border border-slate-200 bg-white shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-900">{alert.alert_category}</span>
                      <RiskBadge level={alert.risk_level} />
                      <AlertBadge status={alert.status} />
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(alert.alert_date).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700">{alert.reason}</p>
                  <div className="text-[11px] bg-slate-50 p-2 rounded border border-slate-100 text-slate-600">
                    <span className="font-semibold text-slate-800">Suggested Action: </span>
                    {alert.suggested_action}
                  </div>
                  {alert.status !== 'Resolved' && (
                    <div className="flex justify-end space-x-2 pt-1">
                      {alert.status === 'New' && (
                        <button
                          onClick={() => handleAlertStatusUpdate(alert.id, 'Under Review')}
                          className="px-2.5 py-1 text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200 rounded hover:bg-amber-100"
                        >
                          Mark Under Review
                        </button>
                      )}
                      <button
                        onClick={() => handleAlertStatusUpdate(alert.id, 'Resolved')}
                        className="px-2.5 py-1 text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 rounded hover:bg-emerald-100"
                      >
                        Resolve Alert
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Milestone Modal */}
      {milestoneModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-md max-w-md w-full p-5 border border-slate-200 shadow-lg space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Add Project Milestone</h3>
            <form onSubmit={handleAddMilestone} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700">Milestone Title *</label>
                <input
                  type="text"
                  required
                  value={newMilestone.title}
                  onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
                  placeholder="e.g. Geotechnical Clearance"
                  className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700">Description</label>
                <textarea
                  value={newMilestone.description}
                  onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
                  className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded"
                  rows="2"
                ></textarea>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700">Planned Date *</label>
                  <input
                    type="date"
                    required
                    value={newMilestone.planned_completion_date}
                    onChange={(e) => setNewMilestone({ ...newMilestone, planned_completion_date: e.target.value })}
                    className="mt-1 w-full px-2 py-1.5 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700">Weight (%)</label>
                  <input
                    type="number"
                    value={newMilestone.weight_percentage}
                    onChange={(e) => setNewMilestone({ ...newMilestone, weight_percentage: parseFloat(e.target.value) })}
                    className="mt-1 w-full px-2 py-1.5 border border-slate-300 rounded"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="crit_path"
                  checked={newMilestone.is_critical_path}
                  onChange={(e) => setNewMilestone({ ...newMilestone, is_critical_path: e.target.checked })}
                  className="rounded text-blue-700"
                />
                <label htmlFor="crit_path" className="text-slate-700 font-medium">Critical Path Milestone</label>
              </div>
              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setMilestoneModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-blue-700 text-white rounded font-medium hover:bg-blue-800"
                >
                  Add Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expenditure Modal */}
      {expenditureModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-md max-w-md w-full p-5 border border-slate-200 shadow-lg space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Record Expenditure Disbursement</h3>
            <form onSubmit={handleAddExpenditure} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700">Fiscal Year *</label>
                  <input
                    type="text"
                    required
                    value={newExp.fiscal_year}
                    onChange={(e) => setNewExp({ ...newExp, fiscal_year: e.target.value })}
                    placeholder="2024-25"
                    className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700">Quarter *</label>
                  <select
                    value={newExp.quarter}
                    onChange={(e) => setNewExp({ ...newExp, quarter: e.target.value })}
                    className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded"
                  >
                    <option value="Q1">Q1</option>
                    <option value="Q2">Q2</option>
                    <option value="Q3">Q3</option>
                    <option value="Q4">Q4</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700">Disbursement Amount (₹ Crores) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={newExp.amount}
                  onChange={(e) => setNewExp({ ...newExp, amount: e.target.value })}
                  placeholder="e.g. 150.50"
                  className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700">Category *</label>
                <select
                  value={newExp.expenditure_category}
                  onChange={(e) => setNewExp({ ...newExp, expenditure_category: e.target.value })}
                  className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded"
                >
                  <option value="Civil Works">Civil Works</option>
                  <option value="Land Acquisition & Clearances">Land Acquisition & Clearances</option>
                  <option value="Equipment & Technology">Equipment & Technology</option>
                  <option value="Project Management & Consultancy">Project Management & Consultancy</option>
                  <option value="Contingency">Contingency</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700">Voucher / Sanction Ref</label>
                <input
                  type="text"
                  value={newExp.voucher_ref}
                  onChange={(e) => setNewExp({ ...newExp, voucher_ref: e.target.value })}
                  placeholder="e.g. SANCT-2024-884"
                  className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded"
                />
              </div>
              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setExpenditureModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-blue-700 text-white rounded font-medium hover:bg-blue-800"
                >
                  Save Disbursement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Progress Modal */}
      {progressModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-md max-w-md w-full p-5 border border-slate-200 shadow-lg space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Log Ground Progress Verification</h3>
            <form onSubmit={handleAddProgress} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700">Physical Ground Progress (%) *</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    required
                    value={newProgress.physical_progress}
                    onChange={(e) => setNewProgress({ ...newProgress, physical_progress: e.target.value })}
                    className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700">Financial Progress (%) *</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    required
                    value={newProgress.financial_progress}
                    onChange={(e) => setNewProgress({ ...newProgress, financial_progress: e.target.value })}
                    className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700">Field Remarks & Measurement Book Note</label>
                <textarea
                  value={newProgress.remarks}
                  onChange={(e) => setNewProgress({ ...newProgress, remarks: e.target.value })}
                  placeholder="Monthly verification details, site engineer notes..."
                  className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded"
                  rows="3"
                ></textarea>
              </div>
              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setProgressModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-blue-700 text-white rounded font-medium hover:bg-blue-800"
                >
                  Submit Field Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
