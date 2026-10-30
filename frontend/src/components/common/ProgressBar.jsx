import React from 'react';

export default function ProgressBar({ value = 0, label, showPercent = true, variant = 'primary', size = 'sm' }) {
  const pct = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  const colors = {
    primary: 'bg-[#786BFF]',
    violet: 'bg-[#786BFF]',
    cyan: 'bg-[#42C6D9]',
    success: 'bg-[#36C995]',
    emerald: 'bg-[#36C995]',
    warning: 'bg-[#F1B65D]',
    danger: 'bg-[#EF7280]',
  };
  const heights = {
    xs: 'h-1.5',
    sm: 'h-2',
    md: 'h-2.5',
  };
  return (
    <div className="w-full">
      {(label || showPercent) && (
        <div className="flex justify-between text-xs text-[var(--text-secondary)] mb-1.5">
          <span className="font-medium text-[var(--text-primary)]">{label}</span>
          {showPercent && <span className="font-mono-tabular">{pct}%</span>}
        </div>
      )}
      <div className={`w-full ${heights[size] || heights.sm} rounded-[4px] bg-[var(--bg-elevated)] overflow-hidden`}>
        <div
          className={`h-full rounded-[4px] transition-all duration-300 ${colors[variant] || colors.primary}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
