import React from 'react';
import Button from './Button';

export default function EmptyState({ materialIcon = 'inbox', title, description, actionLabel, onAction, secondaryLabel, onSecondary }) {
  return (
    <div className="obsidian-card p-8 text-center flex flex-col items-center justify-center">
      <div className="w-12 h-12 rounded-[8px] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[#786BFF] mb-3">
        <span className="material-symbols-outlined text-[24px]">{materialIcon}</span>
      </div>
      <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">{title}</h3>
      <p className="text-xs text-[var(--text-secondary)] max-w-md mb-5 leading-relaxed">{description}</p>
      <div className="flex flex-wrap items-center justify-center gap-2.5">
        {actionLabel && onAction && (
          <Button onClick={onAction} variant="primary" size="sm">
            {actionLabel}
          </Button>
        )}
        {secondaryLabel && onSecondary && (
          <Button onClick={onSecondary} variant="secondary" size="sm">
            {secondaryLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
