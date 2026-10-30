import React from 'react';
import ProgressBar from './ProgressBar';

export default function StatCard({
  label,
  value,
  unit = '',
  deltaLabel = '',
  deltaRight = '',
  progressValue,
  progressVariant = 'primary',
  materialIcon = 'analytics',
  iconColor = 'text-[#42C6D9]',
}) {
  return (
    <div className="obsidian-card p-4 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <span className="label-caps text-[var(--text-secondary)]">{label}</span>
        <div className="w-7 h-7 rounded-[6px] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center">
          <span className={`material-symbols-outlined text-[16px] ${iconColor}`}>{materialIcon}</span>
        </div>
      </div>

      <div className="flex items-baseline gap-1.5 my-1">
        <span className="font-mono-tabular text-[26px] font-semibold text-[var(--text-primary)] leading-tight">
          {value}
        </span>
        {unit && <span className="text-xs text-[var(--text-secondary)] font-mono-tabular">{unit}</span>}
      </div>

      {(deltaLabel || deltaRight) && (
        <div className="flex items-center justify-between text-[11px] mt-2 mb-1.5">
          <span className="text-[#36C995] font-mono-tabular">{deltaLabel}</span>
          <span className="label-caps text-[10px] text-[var(--text-secondary)]">{deltaRight}</span>
        </div>
      )}

      {typeof progressValue === 'number' && (
        <ProgressBar value={progressValue} variant={progressVariant} showPercent={false} size="xs" />
      )}
    </div>
  );
}
