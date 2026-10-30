import React from 'react';
import Badge from './Badge';
import ProgressBar from './ProgressBar';

export default function STARIndicator({ telemetry = {} }) {
  const sOk = Boolean(telemetry.situation_detected ?? telemetry.hasS);
  const tOk = Boolean(telemetry.task_detected ?? telemetry.hasT);
  const aOk = Boolean(telemetry.action_detected ?? telemetry.hasA);
  const rOk = Boolean(telemetry.result_metric_detected ?? telemetry.hasR);
  const composite =
    telemetry.star_completeness_score ??
    telemetry.starPct ??
    ((sOk ? 25 : 0) + (tOk ? 25 : 0) + (aOk ? 25 : 0) + (rOk ? 25 : 0));

  const items = [
    {
      code: 'S',
      label: 'Situation',
      active: sOk,
      pct: sOk ? 92 : 25,
      variant: 'cyan',
      desc: sOk ? 'Context & architectural boundary established.' : 'State the system context or scenario scale.',
    },
    {
      code: 'T',
      label: 'Task',
      active: tOk,
      pct: tOk ? 90 : 25,
      variant: 'violet',
      desc: tOk ? 'Clear engineering responsibility & problem scope.' : 'Clarify the exact technical bottleneck or objective.',
    },
    {
      code: 'A',
      label: 'Action',
      active: aOk,
      pct: aOk ? 88 : 20,
      variant: 'emerald',
      desc: aOk ? 'Concrete implementation & design steps detected.' : 'Detail your concrete implementation steps or code.',
    },
    {
      code: 'R',
      label: 'Result & Trade-offs',
      active: rOk,
      pct: rOk ? 90 : 30,
      variant: rOk ? 'emerald' : 'warning',
      desc: rOk ? 'Quantified outcome / metric impact detected.' : 'Needs expansion: quantify latency, scale, or trade-offs.',
    },
  ];

  return (
    <div className="obsidian-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#786BFF] text-[18px]">analytics</span>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">STAR Telemetry Breakdown</h3>
        </div>
        <Badge variant={composite >= 75 ? 'emerald' : 'warning'} size="xs">
          Heuristic: {composite}%
        </Badge>
      </div>
      <p className="text-[11px] text-[var(--text-secondary)]">
        Heuristic indicators derived from answer text and structure.
      </p>

      <div className="space-y-3 pt-1">
        {items.map((it) => (
          <div key={it.code} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-[4px] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] font-mono-tabular text-[11px] font-bold flex items-center justify-center text-[#42C6D9]">
                  {it.code}
                </span>
                <span className="font-medium text-[var(--text-primary)]">{it.label}</span>
              </div>
              <span className="font-mono-tabular text-xs text-[var(--text-secondary)]">
                {it.active ? 'Detected' : 'Pending'}
              </span>
            </div>
            <ProgressBar value={it.pct} variant={it.variant} showPercent={false} size="xs" />
            <p className="text-[11px] text-[var(--text-secondary)]">{it.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
