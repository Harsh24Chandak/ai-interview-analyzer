import React from 'react';
import Badge from './Badge';
import ProgressBar from './ProgressBar';

export default function EvaluationDimension({
  indexNumber = '01',
  codeLabel = 'ALIGNMENT',
  title,
  score = 0,
  statusTag = 'VALIDATED',
  description = '',
  footerNote = '',
}) {
  const numScore = Math.round(Number(score) || 0);
  const variant = numScore >= 85 ? 'emerald' : numScore >= 70 ? 'cyan' : 'warning';
  return (
    <div className="obsidian-card p-4 flex flex-col justify-between space-y-3">
      <div>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="label-caps text-[10px] text-[var(--text-secondary)]">
            {indexNumber} / {codeLabel}
          </span>
          <Badge variant={variant} size="xs">{statusTag}</Badge>
        </div>
        <h4 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h4>
        <div className="flex items-baseline gap-2 my-2">
          <span className="font-mono-tabular text-2xl font-semibold text-[var(--text-primary)]">{numScore}%</span>
          <span className="label-caps text-[10px] text-[#36C995]">
            {numScore >= 85 ? 'Strong Signal' : numScore >= 70 ? 'Solid Calibration' : 'Needs Depth'}
          </span>
        </div>
        <ProgressBar value={numScore} variant={variant} showPercent={false} size="xs" />
        {description && <p className="text-xs text-[var(--text-secondary)] mt-2.5 leading-relaxed">{description}</p>}
      </div>
      {footerNote && (
        <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
          <span>{footerNote}</span>
          <span className="material-symbols-outlined text-[14px] text-[#36C995]">verified</span>
        </div>
      )}
    </div>
  );
}
