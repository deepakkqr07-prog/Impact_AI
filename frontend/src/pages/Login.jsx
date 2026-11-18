import React, { useState } from 'react';
import { ShieldCheck, LogIn, KeyRound, UserCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Login({ onSwitchToRegister }) {
  const { login } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Admin@123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (u, p) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Official Gov Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <div className="w-14 h-14 bg-[#0a1128] text-white rounded-lg mx-auto flex items-center justify-center shadow-md">
          <ShieldCheck size={32} />
        </div>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
          IP-WATCH MONITORING PORTAL
        </h2>
        <p className="mt-1 text-xs text-slate-600 font-medium uppercase tracking-wider">
          AI-Powered Infrastructure Early Warning System
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-lg sm:px-10">
          {error && (
            <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2.5 rounded text-xs flex items-center space-x-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Username / Official ID
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700"
                  placeholder="e.g. admin or officer_id"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Password
              </label>
              <div className="mt-1">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex justify-center items-center py-2 px-4 border border-transparent rounded text-xs font-semibold uppercase tracking-wider text-white bg-blue-700 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-700 shadow-xs transition-colors disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In to Portal'}
            </button>
          </form>

          {/* Quick Demo Role Selectors */}
          <div className="mt-6 pt-5 border-t border-slate-200">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Quick Demo Accounts (Evaluation):
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleDemoLogin('admin', 'Admin@123')}
                className="text-left px-2 py-1.5 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 transition-colors"
              >
                <div className="font-semibold text-[11px]">Administrator</div>
                <div className="text-[10px] text-slate-500">admin / Admin@123</div>
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('gov_officer', 'Gov@123')}
                className="text-left px-2 py-1.5 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 transition-colors"
              >
                <div className="font-semibold text-[11px]">Gov Monitoring Officer</div>
                <div className="text-[10px] text-slate-500">gov_officer / Gov@123</div>
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('pm_sharma', 'Pm@123')}
                className="text-left px-2 py-1.5 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 transition-colors"
              >
                <div className="font-semibold text-[11px]">Project Manager</div>
                <div className="text-[10px] text-slate-500">pm_sharma / Pm@123</div>
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('dept_officer', 'Dept@123')}
                className="text-left px-2 py-1.5 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 transition-colors"
              >
                <div className="font-semibold text-[11px]">Department Officer</div>
                <div className="text-[10px] text-slate-500">dept_officer / Dept@123</div>
              </button>
            </div>
          </div>

          <div className="mt-5 text-center">
            <button
              onClick={onSwitchToRegister}
              className="text-xs text-blue-700 hover:text-blue-900 font-medium"
            >
              Need a new account? Register Official Profile
            </button>
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] text-slate-500">
          Central Monitoring & National Infrastructure Pipeline Compliance Cell
        </p>
      </div>
    </div>
  );
}
