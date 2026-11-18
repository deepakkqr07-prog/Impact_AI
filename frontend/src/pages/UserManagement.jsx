import React, { useState, useEffect } from 'react';
import { 
  Users, 
  ShieldCheck, 
  KeyRound, 
  UserCheck, 
  UserX, 
  Activity, 
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');
  const [roleModal, setRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newRole, setNewRole] = useState('Project Manager');
  const [isActiveStatus, setIsActiveStatus] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchUsersAndLogs = async () => {
    try {
      setLoading(true);
      const [uData, aData] = await Promise.all([
        api.getUsers(),
        api.getAuditLogs(30)
      ]);
      setUsers(uData);
      setAuditLogs(aData);
    } catch (err) {
      console.error("Failed to load user management data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndLogs();
  }, []);

  const handleOpenRoleModal = (u) => {
    setSelectedUser(u);
    setNewRole(u.role);
    setIsActiveStatus(u.is_active);
    setRoleModal(true);
  };

  const handleSaveRole = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      setSaving(true);
      await api.updateUserRole(selectedUser.id, {
        role: newRole,
        is_active: isActiveStatus
      });
      setRoleModal(false);
      setSuccessMsg(`User ${selectedUser.username} permissions updated.`);
      await fetchUsersAndLogs();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      alert("Failed to update role: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">
            User Roles & Access Control Governance
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage authenticated official personnel, role assignments and security audit history
          </p>
        </div>
        <button
          onClick={fetchUsersAndLogs}
          className="mt-3 sm:mt-0 inline-flex items-center space-x-1 px-3 py-1.5 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Users</span>
        </button>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-2 rounded text-xs flex items-center space-x-2">
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200 bg-white px-3 rounded-t-md">
        <nav className="flex space-x-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('users')}
            className={`py-3 px-1 border-b-2 font-medium transition-colors ${
              activeTab === 'users'
                ? 'border-blue-700 text-blue-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Registered Official Personnel ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('audits')}
            className={`py-3 px-1 border-b-2 font-medium transition-colors ${
              activeTab === 'audits'
                ? 'border-blue-700 text-blue-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            System Security Audit Logs ({auditLogs.length})
          </button>
        </nav>
      </div>

      {/* Users Table */}
      {activeTab === 'users' && (
        <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Official Personnel</th>
                  <th className="py-2.5 px-3">Username</th>
                  <th className="py-2.5 px-3">Assigned Role</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3">Registered Date</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900">{u.full_name}</div>
                      <div className="text-[11px] text-slate-400">{u.email}</div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-blue-900 font-bold">
                      {u.username}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[11px] bg-slate-100 font-medium text-slate-800 border border-slate-200">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {u.is_active ? (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-rose-50 text-rose-700 border border-rose-200 font-bold">
                          Deactivated
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => handleOpenRoleModal(u)}
                        className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded"
                      >
                        Edit Role / Status
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Audit Logs Table */}
      {activeTab === 'audits' && (
        <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">User</th>
                  <th className="py-2.5 px-3">Action Type</th>
                  <th className="py-2.5 px-3">Target Entity</th>
                  <th className="py-2.5 px-3">Action Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 font-mono text-[11px]">
                    <td className="py-2 px-3 text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2 px-3 font-bold text-slate-800">
                      {log.username}
                    </td>
                    <td className="py-2 px-3">
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-50 text-blue-800 font-bold border border-blue-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-600">
                      {log.entity_type} #{log.entity_id}
                    </td>
                    <td className="py-2 px-3 text-slate-700 font-sans">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Role Update Modal */}
      {roleModal && selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-md max-w-sm w-full p-5 border border-slate-200 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              Edit Permissions: {selectedUser.full_name}
            </h3>
            <form onSubmit={handleSaveRole} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assigned Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900 bg-white"
                >
                  <option value="Administrator">Administrator</option>
                  <option value="Government Monitoring Officer">Government Monitoring Officer</option>
                  <option value="Project Manager">Project Manager</option>
                  <option value="Department Officer">Department Officer</option>
                </select>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="active_status"
                  checked={isActiveStatus}
                  onChange={(e) => setIsActiveStatus(e.target.checked)}
                  className="rounded text-blue-700"
                />
                <label htmlFor="active_status" className="font-semibold text-slate-700">
                  Account Active (Permitted to sign in)
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setRoleModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-3.5 py-1.5 bg-blue-700 text-white rounded font-medium hover:bg-blue-800"
                >
                  {saving ? 'Updating...' : 'Save Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
