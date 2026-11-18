import React, { useState } from 'react';
import { 
  UserCircle, 
  ShieldCheck, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle, 
  Building, 
  Mail, 
  Calendar,
  Server
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

export function Profile() {
  const { user, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      await api.changePassword({
        current_password: currentPassword,
        new_password: newPassword
      });
      setSuccess("Your account password has been updated securely.");
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-3 border-b border-slate-200">
        <h1 className="text-lg font-bold text-slate-900 tracking-tight">
          Official Profile & Security Credentials
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          View assigned government monitoring credentials and update access credentials
        </p>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded text-xs flex items-center space-x-2">
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-2 rounded text-xs flex items-center space-x-2">
          <CheckCircle2 size={15} />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* User Card */}
        <div className="bg-white border border-slate-200 rounded-md p-5 space-y-4">
          <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
            <div className="w-12 h-12 rounded-full bg-blue-700 text-white flex items-center justify-center font-bold text-base">
              {user?.full_name?.charAt(0) || user?.username?.charAt(0)}
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">{user?.full_name}</h2>
              <span className="text-xs text-blue-700 font-semibold">{user?.role}</span>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center space-x-2 text-slate-700">
              <Mail size={14} className="text-slate-400" />
              <span>Email: <strong>{user?.email}</strong></span>
            </div>
            <div className="flex items-center space-x-2 text-slate-700">
              <ShieldCheck size={14} className="text-slate-400" />
              <span>Username: <strong>{user?.username}</strong></span>
            </div>
            <div className="flex items-center space-x-2 text-slate-700">
              <Building size={14} className="text-slate-400" />
              <span>Security Clearance Level: <strong>Tier 1 Enterprise</strong></span>
            </div>
            <div className="flex items-center space-x-2 text-slate-700">
              <Calendar size={14} className="text-slate-400" />
              <span>Active Session: <strong>JWT Verified</strong></span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <button
              onClick={logout}
              className="w-full py-1.5 px-3 border border-rose-300 text-rose-700 rounded text-xs font-semibold hover:bg-rose-50 transition-colors"
            >
              Sign Out from Portal
            </button>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="bg-white border border-slate-200 rounded-md p-5 space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <KeyRound size={16} className="text-blue-700" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Change Password
            </h2>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Current Password *</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-700"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">New Password *</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-700"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Confirm New Password *</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-700"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-blue-700 text-white rounded text-xs font-semibold hover:bg-blue-800 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Updating Credentials...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* System Telemetry & Compliance Box */}
      <div className="bg-slate-50 border border-slate-200 rounded-md p-4 space-y-2">
        <div className="flex items-center space-x-2 text-slate-800 font-bold text-xs">
          <Server size={14} className="text-blue-700" />
          <span>Platform Telemetry & Architecture Specifications</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-slate-600 pt-1">
          <div>Backend: <strong>FastAPI (Python 3.13)</strong></div>
          <div>Database: <strong>PostgreSQL / Relational SQLite</strong></div>
          <div>ML Stack: <strong>Scikit-learn (RF & GBR)</strong></div>
          <div>Frontend: <strong>React 19 + Tailwind CSS</strong></div>
        </div>
      </div>
    </div>
  );
}
