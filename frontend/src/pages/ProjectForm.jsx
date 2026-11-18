import React, { useState, useEffect } from 'react';
import { Save, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../api';

const SECTORS = [
  "Transportation & Highways",
  "Railways & Metros",
  "Power & Renewable Energy",
  "Urban Infrastructure & Water",
  "Ports & Shipping",
  "Civil Aviation & Airports",
  "Telecommunications"
];

const STATUSES = ["Ongoing", "Completed", "Delayed", "Critical Attention"];

export function ProjectForm({ projectId, onCancel, onSuccess }) {
  const isEdit = !!projectId;
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(isEdit);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [formData, setFormData] = useState({
    project_code: '',
    name: '',
    description: '',
    sector: SECTORS[0],
    ministry: '',
    department_id: '',
    implementing_agency: '',
    location_state: '',
    location_district: '',
    approved_cost: '',
    revised_cost: '',
    actual_expenditure: '0',
    planned_start_date: '',
    expected_completion_date: '',
    actual_completion_date: '',
    planned_progress: '0',
    actual_progress: '0',
    status: 'Ongoing'
  });

  useEffect(() => {
    // Load departments
    api.getDepartments().then(setDepartments).catch(() => {});

    if (isEdit) {
      api.getProject(projectId)
        .then((p) => {
          setFormData({
            project_code: p.project_code || '',
            name: p.name || '',
            description: p.description || '',
            sector: p.sector || SECTORS[0],
            ministry: p.ministry || '',
            department_id: p.department_id ? String(p.department_id) : '',
            implementing_agency: p.implementing_agency || '',
            location_state: p.location_state || '',
            location_district: p.location_district || '',
            approved_cost: p.approved_cost !== undefined ? String(p.approved_cost) : '',
            revised_cost: p.revised_cost !== undefined ? String(p.revised_cost) : '',
            actual_expenditure: p.actual_expenditure !== undefined ? String(p.actual_expenditure) : '0',
            planned_start_date: p.planned_start_date || '',
            expected_completion_date: p.expected_completion_date || '',
            actual_completion_date: p.actual_completion_date || '',
            planned_progress: p.planned_progress !== undefined ? String(p.planned_progress) : '0',
            actual_progress: p.actual_progress !== undefined ? String(p.actual_progress) : '0',
            status: p.status || 'Ongoing'
          });
        })
        .catch((err) => setError(err.message || 'Failed to load project details'))
        .finally(() => setInitLoading(false));
    }
  }, [projectId]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const validate = () => {
    if (!formData.project_code.trim()) return "Project Code is required";
    if (!formData.name.trim()) return "Project Name is required";
    if (!formData.ministry.trim()) return "Ministry is required";
    if (!formData.implementing_agency.trim()) return "Implementing Agency is required";
    if (!formData.location_state.trim()) return "State location is required";
    
    const approved = parseFloat(formData.approved_cost);
    if (isNaN(approved) || approved < 0) return "Approved Cost must be a positive number";

    const p_prog = parseFloat(formData.planned_progress);
    const a_prog = parseFloat(formData.actual_progress);
    if (isNaN(p_prog) || p_prog < 0 || p_prog > 100) return "Planned Progress must be between 0 and 100";
    if (isNaN(a_prog) || a_prog < 0 || a_prog > 100) return "Actual Progress must be between 0 and 100";

    if (!formData.planned_start_date) return "Planned Start Date is required";
    if (!formData.expected_completion_date) return "Expected Completion Date is required";
    if (formData.planned_start_date > formData.expected_completion_date) {
      return "Start Date cannot be later than Completion Date";
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      project_code: formData.project_code.trim(),
      name: formData.name.trim(),
      description: formData.description.trim(),
      sector: formData.sector,
      ministry: formData.ministry.trim(),
      department_id: formData.department_id ? parseInt(formData.department_id) : null,
      implementing_agency: formData.implementing_agency.trim(),
      location_state: formData.location_state.trim(),
      location_district: formData.location_district.trim() || null,
      approved_cost: parseFloat(formData.approved_cost),
      revised_cost: formData.revised_cost ? parseFloat(formData.revised_cost) : parseFloat(formData.approved_cost),
      actual_expenditure: parseFloat(formData.actual_expenditure || 0),
      planned_start_date: formData.planned_start_date,
      expected_completion_date: formData.expected_completion_date,
      actual_completion_date: formData.actual_completion_date || null,
      planned_progress: parseFloat(formData.planned_progress),
      actual_progress: parseFloat(formData.actual_progress),
      status: formData.status
    };

    setLoading(true);
    try {
      if (isEdit) {
        await api.updateProject(projectId, payload);
        setSuccessMsg("Project updated successfully with recalibrated risk scores.");
      } else {
        await api.createProject(payload);
        setSuccessMsg("Project registered successfully and ingested into AI prediction engine.");
      }
      setTimeout(() => {
        onSuccess();
      }, 900);
    } catch (err) {
      setError(err.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  if (initLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-6 h-6 border-2 border-blue-700 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <button
            onClick={onCancel}
            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              {isEdit ? `Edit Infrastructure Project (${formData.project_code})` : 'Register New Infrastructure Project'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter official project specifications, capital outlay commitments, and physical delivery timelines
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2.5 rounded text-xs flex items-center space-x-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-3.5 py-2.5 rounded text-xs flex items-center space-x-2">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-md p-6 space-y-6">
        {/* Section 1: Identification & Classification */}
        <div>
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 pb-1 border-b border-slate-100">
            1. Project Identification & Sector
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Project Code *</label>
              <input
                type="text"
                name="project_code"
                required
                disabled={isEdit}
                value={formData.project_code}
                onChange={handleChange}
                placeholder="e.g. INFRA-EXP-2024"
                className="mt-1 w-full px-3 py-1.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-700 disabled:bg-slate-100 font-mono"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700">Official Project Name *</label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Delhi-Dehradun Economic Corridor Package 2"
                className="mt-1 w-full px-3 py-1.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-700"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-slate-700">Project Description & Scope</label>
              <textarea
                name="description"
                rows="2"
                value={formData.description}
                onChange={handleChange}
                placeholder="Detailed scope of physical deliverables, technical specifications..."
                className="mt-1 w-full px-3 py-1.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-700"
              ></textarea>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Infrastructure Sector *</label>
              <select
                name="sector"
                value={formData.sector}
                onChange={handleChange}
                className="mt-1 w-full px-3 py-1.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-700"
              >
                {SECTORS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Ministry *</label>
              <input
                type="text"
                name="ministry"
                required
                value={formData.ministry}
                onChange={handleChange}
                placeholder="e.g. Ministry of Road Transport"
                className="mt-1 w-full px-3 py-1.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-700"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Department</label>
              <select
                name="department_id"
                value={formData.department_id}
                onChange={handleChange}
                className="mt-1 w-full px-3 py-1.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-700"
              >
                <option value="">-- General Monitoring --</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Implementing Agency & Location */}
        <div>
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 pb-1 border-b border-slate-100">
            2. Implementing Agency & Geography
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Implementing Agency / PSU *</label>
              <input
                type="text"
                name="implementing_agency"
                required
                value={formData.implementing_agency}
                onChange={handleChange}
                placeholder="e.g. NHAI / DFCCIL / BMRCL"
                className="mt-1 w-full px-3 py-1.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-700"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">State / Multi-State *</label>
              <input
                type="text"
                name="location_state"
                required
                value={formData.location_state}
                onChange={handleChange}
                placeholder="e.g. Maharashtra"
                className="mt-1 w-full px-3 py-1.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-700"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">District / Region</label>
              <input
                type="text"
                name="location_district"
                value={formData.location_district}
                onChange={handleChange}
                placeholder="e.g. Pune & Satara"
                className="mt-1 w-full px-3 py-1.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-700"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Financial Outlays */}
        <div>
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 pb-1 border-b border-slate-100">
            3. Financial Commitments (in ₹ Crores)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Approved Cost Outlay *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="approved_cost"
                required
                value={formData.approved_cost}
                onChange={handleChange}
                placeholder="e.g. 2500.00"
                className="mt-1 w-full px-3 py-1.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-700"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Revised Cost (if any)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="revised_cost"
                value={formData.revised_cost}
                onChange={handleChange}
                placeholder="Defaults to Approved Cost"
                className="mt-1 w-full px-3 py-1.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-700"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Actual Spent to Date</label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="actual_expenditure"
                value={formData.actual_expenditure}
                onChange={handleChange}
                placeholder="e.g. 1200.00"
                className="mt-1 w-full px-3 py-1.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-700"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Timelines & Ground Progress */}
        <div>
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 pb-1 border-b border-slate-100">
            4. Project Schedule & Execution Status
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Planned Start Date *</label>
              <input
                type="date"
                name="planned_start_date"
                required
                value={formData.planned_start_date}
                onChange={handleChange}
                className="mt-1 w-full px-3 py-1.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-700"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Expected Completion Date *</label>
              <input
                type="date"
                name="expected_completion_date"
                required
                value={formData.expected_completion_date}
                onChange={handleChange}
                className="mt-1 w-full px-3 py-1.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-700"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Project Status *</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="mt-1 w-full px-3 py-1.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-700"
              >
                {STATUSES.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Planned Progress (%) *</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                name="planned_progress"
                required
                value={formData.planned_progress}
                onChange={handleChange}
                className="mt-1 w-full px-3 py-1.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-700"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Actual Physical Progress (%) *</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                name="actual_progress"
                required
                value={formData.actual_progress}
                onChange={handleChange}
                className="mt-1 w-full px-3 py-1.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-700"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Actual Completion Date (if completed)</label>
              <input
                type="date"
                name="actual_completion_date"
                value={formData.actual_completion_date}
                onChange={handleChange}
                className="mt-1 w-full px-3 py-1.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-700"
              />
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="pt-4 border-t border-slate-200 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-700 text-white rounded text-xs font-semibold hover:bg-blue-800 transition-colors shadow-xs disabled:opacity-50"
          >
            <Save size={14} />
            <span>{loading ? 'Processing...' : (isEdit ? 'Save Changes' : 'Register Infrastructure Project')}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
