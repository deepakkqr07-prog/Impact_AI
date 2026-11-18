import React from 'react';

export function MetricCard({ title, value, subtext, icon: Icon, badge, highlight, onClick }) {
  return (
    <div 
      onClick={onClick}
      className={`bg-white border rounded-md p-4 transition-all duration-150 ${
        onClick ? 'cursor-pointer hover:border-slate-400 hover:shadow-xs' : ''
      } ${highlight ? 'border-l-4 border-l-blue-700 border-slate-200' : 'border-slate-200'}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</p>
        {Icon && (
          <div className="p-1.5 rounded bg-slate-50 text-slate-600 border border-slate-100">
            <Icon size={18} />
          </div>
        )}
      </div>
      <div className="mt-2 flex items-baseline justify-between">
        <h3 className="text-2xl font-bold tracking-tight text-slate-900">{value}</h3>
        {badge && (
          <span className="text-xs px-2 py-0.5 rounded font-medium bg-slate-100 text-slate-700 border border-slate-200">
            {badge}
          </span>
        )}
      </div>
      {subtext && <p className="mt-1 text-xs text-slate-500">{subtext}</p>}
    </div>
  );
}
