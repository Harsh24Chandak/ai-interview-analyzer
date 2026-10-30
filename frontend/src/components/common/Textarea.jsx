import React from 'react';

export default function Textarea({ label, rightLabel, className = '', ...props }) {
  return (
    <div className="w-full">
      {(label || rightLabel) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && <label className="label-caps text-[var(--text-secondary)]">{label}</label>}
          {rightLabel && <span className="label-caps text-[10px] text-[var(--text-secondary)]">{rightLabel}</span>}
        </div>
      )}
      <textarea className={`w-full obsidian-input p-3.5 text-sm ${className}`} {...props} />
    </div>
  );
}
