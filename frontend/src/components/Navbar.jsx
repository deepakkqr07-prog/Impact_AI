import React from 'react';
import { Bell, Activity, Database, Sparkles, Building } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Navbar({ onNavigateAlerts, alertCount = 0 }) {
  const { user } = useAuth();
  const todayFormatted = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-10 shrink-0">
      <div className="flex items-center space-x-4">
        <div>
          <span className="text-xs font-semibold text-slate-800 tracking-tight">
            INFRASTRUCTURE PROJECT EARLY WARNING SYSTEM
          </span>
          <span className="ml-2 text-[11px] text-slate-400 font-normal hidden md:inline">
            | PM GatiShakti & Central Monitoring Cell
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* Live System Operational Status Indicator */}
        <div className="hidden lg:flex items-center space-x-2 text-xs text-slate-600 bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-medium text-slate-700">ML Engine Active</span>
        </div>

        {/* User Role Badge */}
        <div className="flex items-center space-x-1.5 text-xs bg-blue-50 text-blue-800 px-2.5 py-1 rounded border border-blue-200 font-medium">
          <Building size={14} className="text-blue-700" />
          <span>{user?.role || 'Guest'}</span>
        </div>

        {/* Date display */}
        <div className="hidden sm:block text-xs text-slate-500 font-medium">
          {todayFormatted}
        </div>

        {/* Notification Bell */}
        <button
          onClick={onNavigateAlerts}
          className="relative p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
          title="View Early Warning Alerts"
        >
          <Bell size={18} />
          {alertCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-rose-600 rounded-full ring-2 ring-white"></span>
          )}
        </button>
      </div>
    </header>
  );
}
