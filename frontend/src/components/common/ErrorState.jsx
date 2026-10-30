import React from 'react';
import Button from './Button';

export default function ErrorState({ title = 'Telemetry Error', message, onRetry }) {
  return (
    <div className="rounded-[8px] border border-[#EF7280]/40 bg-[#EF7280]/10 p-5 flex items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <span className="material-symbols-outlined text-[#EF7280] text-[20px] mt-0.5">error</span>
        <div>
          <h4 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h4>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">{message}</p>
        </div>
      </div>
      {onRetry && (
        <Button variant="secondary" size="xs" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
