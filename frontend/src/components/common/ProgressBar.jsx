import React from 'react';

export default function ProgressBar({ value = 0, label, showPercent = true, variant = 'primary' }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const colors = {
    primary: 'bg-indigo-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
  };
  return (
    <div className="w-full">
      {(label || showPercent) && (
        <div className="flex justify-between text-xs font-medium text-slate-300 mb-1.5">
          <span>{label}</span>
          {showPercent && <span>{pct}%</span>}
        </div>
      )}
      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${colors[variant] || colors.primary}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
