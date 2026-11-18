import React from 'react';

export function StatusBadge({ status }) {
  let styleClass = "bg-slate-100 text-slate-700 border-slate-300";

  switch (status) {
    case 'Ongoing':
      styleClass = "bg-blue-50 text-blue-700 border-blue-200";
      break;
    case 'Completed':
      styleClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
      break;
    case 'Delayed':
      styleClass = "bg-amber-50 text-amber-700 border-amber-200";
      break;
    case 'Critical Attention':
      styleClass = "bg-rose-50 text-rose-700 border-rose-200 font-semibold";
      break;
    case 'In Progress':
      styleClass = "bg-indigo-50 text-indigo-700 border-indigo-200";
      break;
    case 'Pending':
      styleClass = "bg-slate-100 text-slate-600 border-slate-200";
      break;
    default:
      styleClass = "bg-slate-100 text-slate-700 border-slate-200";
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${styleClass}`}>
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-75"></span>
      {status}
    </span>
  );
}

export function RiskBadge({ level }) {
  let styleClass = "bg-slate-100 text-slate-700 border-slate-300";

  switch (level) {
    case 'Low':
      styleClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
      break;
    case 'Medium':
      styleClass = "bg-amber-50 text-amber-700 border-amber-200";
      break;
    case 'High':
      styleClass = "bg-rose-50 text-rose-700 border-rose-200 font-semibold";
      break;
    case 'Critical':
      styleClass = "bg-red-100 text-red-800 border-red-300 font-bold";
      break;
    default:
      styleClass = "bg-slate-100 text-slate-700 border-slate-200";
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${styleClass}`}>
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current"></span>
      {level} Risk
    </span>
  );
}

export function AlertBadge({ status }) {
  let styleClass = "bg-slate-100 text-slate-700 border-slate-200";

  switch (status) {
    case 'New':
      styleClass = "bg-rose-50 text-rose-700 border-rose-200 font-medium";
      break;
    case 'Under Review':
      styleClass = "bg-amber-50 text-amber-700 border-amber-200";
      break;
    case 'Resolved':
      styleClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
      break;
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${styleClass}`}>
      {status}
    </span>
  );
}
