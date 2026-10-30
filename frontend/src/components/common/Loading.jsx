import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingSkeleton({ label = 'Synchronizing telemetry...' }) {
  return (
    <div className="space-y-4 py-8">
      <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
        <Loader2 className="w-4 h-4 text-[#786BFF] animate-spin" />
        <span className="font-mono-tabular text-xs uppercase tracking-wider">{label}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="h-28 rounded-[8px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] animate-pulse" />
        ))}
      </div>
      <div className="h-64 rounded-[8px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] animate-pulse" />
    </div>
  );
}
