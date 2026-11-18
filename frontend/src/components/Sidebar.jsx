import React from 'react';
import { 
  LayoutDashboard, 
  FolderKanban, 
  PlusCircle, 
  TrendingUp, 
  ClockAlert, 
  ShieldAlert, 
  BellRing, 
  BarChart3, 
  BotMessageSquare, 
  FileUp, 
  Users, 
  UserCircle, 
  LogOut,
  Building2,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Sidebar({ currentView, setCurrentView, alertCount = 0 }) {
  const { user, logout, isAdmin } = useAuth();

  const navSections = [
    {
      title: "Core Monitoring",
      items: [
        { id: "dashboard", label: "Main Dashboard", icon: LayoutDashboard },
        { id: "projects", label: "Project Registry", icon: FolderKanban },
        { id: "new-project", label: "Add Infrastructure", icon: PlusCircle, roles: ["Administrator", "Government Monitoring Officer", "Project Manager"] },
      ]
    },
    {
      title: "Predictive AI & Risk",
      items: [
        { id: "cost-prediction", label: "Cost Overrun ML", icon: TrendingUp },
        { id: "delay-prediction", label: "Schedule Delay ML", icon: ClockAlert },
        { id: "risk-assessment", label: "Project Risk Scoring", icon: ShieldAlert },
        { id: "alerts", label: "Early Warning Alerts", icon: BellRing, badge: alertCount },
      ]
    },
    {
      title: "Intelligence & Data",
      items: [
        { id: "analytics", label: "Analytics & Reports", icon: BarChart3 },
        { id: "assistant", label: "AI Project Assistant", icon: BotMessageSquare },
        { id: "import", label: "Data Import (CSV)", icon: FileUp, roles: ["Administrator", "Government Monitoring Officer", "Project Manager"] },
      ]
    },
    {
      title: "System Administration",
      items: [
        ...(isAdmin ? [{ id: "users", label: "Users & Roles", icon: Users }] : []),
        { id: "profile", label: "Profile & Settings", icon: UserCircle },
      ]
    }
  ];

  return (
    <aside className="w-64 bg-[#0a1128] text-slate-300 flex flex-col shrink-0 border-r border-slate-800 h-screen select-none">
      {/* Brand & Portal Header */}
      <div className="p-4 border-b border-slate-800 flex items-center space-x-3 bg-[#070d1f]">
        <div className="w-9 h-9 rounded bg-blue-700 flex items-center justify-center text-white shadow-xs font-bold shrink-0">
          <ShieldCheck size={22} />
        </div>
        <div>
          <h1 className="text-sm font-bold text-white tracking-wide uppercase">IP-WATCH AI</h1>
          <p className="text-[11px] text-slate-400 font-medium leading-none mt-0.5">National Infra Analytics</p>
        </div>
      </div>

      {/* Nav Menu */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navSections.map((section, idx) => (
          <div key={idx}>
            <div className="px-3 mb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              {section.title}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentView(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded transition-colors ${
                      isActive 
                        ? 'bg-blue-700 text-white font-semibold shadow-xs' 
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Icon size={16} className={isActive ? 'text-white' : 'text-slate-400'} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-600 text-white font-bold">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* User Footer Profile */}
      <div className="p-3 border-t border-slate-800 bg-[#070d1f]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-200 shrink-0">
              {user?.full_name?.charAt(0) || user?.username?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0 truncate">
              <p className="text-xs font-medium text-white truncate">{user?.full_name || user?.username}</p>
              <p className="text-[10px] text-blue-300 truncate">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
